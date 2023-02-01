import { assert } from "console";
import { connect } from "mqtt";
import {
  BRO_CODE_CHANGED_TOPIC,
  broCodeFromBuffer,
  BroCodeState,
  BROKER_HOSTNAME,
} from "../../shared/shared.js";
import { Server as SocketIOServer } from "socket.io";
import express from "express";
import http from "http";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

/* Short disclaimer:
 * In the real world, you wouldn't build web applications like this.
 * Although very simple to build and understand, and more than enough for this
 * project, the way this is setup isn't scalable and should be avoided for bigger projects.
*/

const mqttClient = connect("mqtt://" + BROKER_HOSTNAME);
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

let currentBroCodeState = BroCodeState.Available;

// Texts to show on the website
const BroCodeTexts = {
  [BroCodeState.Available]: "Available",
  [BroCodeState.BroCodeBreaking]: "Bro code breaking",
  [BroCodeState.Full]: "Full",
};

// event id for website backend-frontend communication (socket.io)
const broCodeStateUpdateEvent = "broCodeChanged";

function buildBroCodeUpdatePayload(broCodeState: BroCodeState) {
  return {
    value: broCodeState,
    text: BroCodeTexts[broCodeState],
  };
}

function updateBroCodeState(broCodeState: BroCodeState) {
  currentBroCodeState = broCodeState;
  console.log(`Bro Code State from MQTT: ${BroCodeState[broCodeState]}`);
  // send update to the frontend over websockets
  io.emit(broCodeStateUpdateEvent, buildBroCodeUpdatePayload(broCodeState));
}

// once connected, subscribe to the bro code changed topic
// if there are errors during subscription -> log them
mqttClient.on("connect", function () {
  mqttClient.subscribe(BRO_CODE_CHANGED_TOPIC, function (err: Error) {
    if (err) console.error(err.message);
  });
});

mqttClient.on("message", function (topic: string, message: Buffer) {
  assert(topic === BRO_CODE_CHANGED_TOPIC, "Not bro code changed topic?!");

  updateBroCodeState(broCodeFromBuffer(message));
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// navigate out of website/dist/website/src/ to find the static folder
const staticFilesPath = path.resolve(__dirname + "../../../../static");

app.get("/", (_req, res) => {
  // serve HTML file
  res.sendFile(staticFilesPath + "/index.html");
});

io.on("connection", (socket) => {
  console.log("User connected from the web");
  // send changed update with initial state ("changed" from undefined to current state)
  socket.emit(
    broCodeStateUpdateEvent,
    buildBroCodeUpdatePayload(currentBroCodeState),
  );
});

// start web server and open port 3002
server.listen(3002, () => {
  console.log("listening on *:3002");
});
