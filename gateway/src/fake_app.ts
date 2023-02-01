// This file is just a fake implementation of the gateway which sends dummy data
// over MQTT to test the integration of gateway, backend and website.
import { connect } from "mqtt";
import {
  BROKER_HOSTNAME,
  NUMBER_OF_URINALS,
  PERSON_ENTERED_TOPIC,
  PERSON_EXITED_TOPIC,
} from "../../shared/shared.js";

const mqttClient = connect("mqtt://" + BROKER_HOSTNAME);

const Interval = 3000;
let entering = true;
let count = 0;

// Have people enter until it's full, then start leaving until it's empty, then repeat.
setInterval(function () {
  if (count++ >= NUMBER_OF_URINALS) {
    entering = !entering;
    count = 1;
  }

  if (entering) {
    mqttClient.publish(PERSON_ENTERED_TOPIC, "");
  } else {
    mqttClient.publish(PERSON_EXITED_TOPIC, "");
  }
}, Interval);

console.log("Started fake gateway");
