import { connect } from "mqtt";
import {
  BROKER_HOSTNAME,
  PERSON_ENTERED_TOPIC,
  PERSON_EXITED_TOPIC,
} from "../../shared/shared.js";
import { subscribeToLightBarrier } from "./ble_connection.js";
import { EntryState, getEntryState } from "./entrance_state.js";

const mqttClient = connect("mqtt://" + BROKER_HOSTNAME);

// Estimated time it takes a person to enter or exit the sensors.
// During this time we only account for one person so it should be
// as short as possible while still preventing counting a person double.
const entryDebounceInterval = 1000;
let personEntering = false;

function personEnteredOrExited(sensorValues: number) {
  if (personEntering) return;
  personEntering = true;

  let state;
  try {
    state = getEntryState(sensorValues);
  } catch (err) {
    console.error(`Ignoring sensor change because: ${err}`)
    personEntering = false;
    return;
  }

  if (state === EntryState.ENTER) {
    console.log("Person entered");
    mqttClient.publish(PERSON_ENTERED_TOPIC, "");
  } else if (state === EntryState.EXIT) {
    console.log("Person exited");
    mqttClient.publish(PERSON_EXITED_TOPIC, "");
  } else {
    console.error("how did we get here?");
  }
  
  // debounce so we only fire once every x ms -> fire once per person hopefully
  setTimeout(function () {
    personEntering = false;
  }, entryDebounceInterval);
}

subscribeToLightBarrier(personEnteredOrExited);
