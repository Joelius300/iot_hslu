import { connect } from "mqtt";
import { createUrinals, Urinals } from "./urinal-probability.js";
import {
  BRO_CODE_CHANGED_TOPIC,
  BroCodeState,
  broCodeToBuffer,
  BROKER_HOSTNAME,
  NUMBER_OF_URINALS,
  PERSON_ENTERED_TOPIC,
  PERSON_EXITED_TOPIC,
  Timer,
} from "../../shared/shared.js";

function getTimestamp() {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

/**
 * Sets up a Urinals object using the events from MQTT. The two events are person entered and person exited, and they are relayed
 * to the Urinals which estimate the current state using probability calculations.
 * Whenever the bro code state of the urinals change, the provided callback is called (if any) and an MQTT message is published on the
 * appropriate topic.
 * @param broCodeChangedCallback Callback for whenever the bro code changes (in addition to MQTT message publication)
 * @returns The Urinals object whose state automatically updates whenever events occur. Can be used to get the current state.
 */
export default function setupRemoteUrinals(
  broCodeChangedCallback?: (state: BroCodeState) => void
): Urinals {
  const urinals = createUrinals(NUMBER_OF_URINALS, getTimestamp);
  let lastBroCodeState: BroCodeState | undefined = undefined;

  const mqttClient = connect("mqtt://" + BROKER_HOSTNAME);

  function resetUrinals() {
    console.log("Resetting because of no activity.");
    urinals.reset();
    updateBroCodeState(urinals.getBroCodeState());
  }

  const resetTime = 3 * 60 * 1000; // we assume no one can take longer than 3 minutes at the urinals
  const resetTimer = new Timer(resetUrinals, resetTime);

  /**
   * Updates the bro code state to the provided one, IF it's changed.
   * @param broCodeState The new bro code state
   */
  function updateBroCodeState(broCodeState: BroCodeState) {
    if (broCodeState !== lastBroCodeState) {
      console.log(
        `Bro code state changed to ${BroCodeState[broCodeState]} ` +
          `(from ${lastBroCodeState ? BroCodeState[lastBroCodeState] : 'undefined'})`
      );

      mqttClient.publish(BRO_CODE_CHANGED_TOPIC, broCodeToBuffer(broCodeState));
      lastBroCodeState = broCodeState;

      if (broCodeChangedCallback) broCodeChangedCallback(broCodeState);
    }
  }

  // once connected, subscribe to the two topics (enter and exit)
  // if there are errors during subscription -> log them
  mqttClient.on("connect", function () {
    mqttClient.subscribe(PERSON_ENTERED_TOPIC, function (err: Error) {
      if (err) console.error(err.message);
    });
    mqttClient.subscribe(PERSON_EXITED_TOPIC, function (err: Error) {
      if (err) console.error(err.message);
    });
  });

  mqttClient.on("message", function (topic: string, _message: Buffer) {
    console.debug("Got message for " + topic);
    // calculate new state(s)
    if (topic === PERSON_ENTERED_TOPIC) {
      urinals.personEntered();
    } else if (topic === PERSON_EXITED_TOPIC) {
      try {
        urinals.personExited();
      } catch (err) {
        // We ignore this event and treat the urinals still as empty.
        console.warn("Person exited although urinals were thought to be empty!");
        return;
      }
    }

    // fetch the bro code and update the state
    updateBroCodeState(urinals.getBroCodeState());

    // Ensure that the urinals are reset if a certain time passes without activity,
    // while we still think someone's in there. That's usually an indicator that the
    // sensors only detected one person exiting when it was actually two at once, or something
    // like that, so to avoid starting with a faulty state when the next person enters, we try
    // to correct it by resetting after a certain time without activity.
    if (urinals.numberOfPeople > 0) {
      resetTimer.restart();
    } else {
      resetTimer.stop();
    }
  });

  // set and broadcast initial state (empty=available)
  updateBroCodeState(BroCodeState.Available);

  return urinals;
}
