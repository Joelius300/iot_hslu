/* This is a test app to test and play around with the urinal probability calculations. Not used in the final system.*/

import {
  breaksBroCode,
  createUrinals,
  OccupancyProbability,
  runNextUrinalTestCases,
  runOccupancyEqualityTestCases,
} from "./urinal-probability.js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { Immutable } from "./immutability.js";
import { BroCodeState } from "../../shared/shared.js";

function testUrinalProbabilities() {
  const testCases: [string, string][] = [
    ["00000", "X0000"],
    ["10000", "1000X"],
    ["01000", "0100X"],
    ["00100", "X0100"],
    ["00010", "X0010"],
    ["00001", "X0001"],
    ["01001", "X1001"],
    ["10010", "1001X"],
    ["10110", "1011X"],
    ["11101", "111X1"],
    ["11100", "1110X"],
  ];

  runNextUrinalTestCases(testCases);
}

function testOccupancyEquality() {
  const testCases: [string, string, boolean, boolean][] = [
    ["00000", "00000", true, true],
    ["10000", "00000", false, false],
    ["00100", "00200", false, true],
    ["00213", "00213", true, true],
    ["00123", "00213", false, true],
    ["20013", "00213", false, false],
  ];

  runOccupancyEqualityTestCases(testCases);
}

testUrinalProbabilities();
testOccupancyEquality();

function getTimestamp() {
  const timestamp = Number(process.hrtime.bigint() / 1_000_000n);
  console.log("entered at " + timestamp);
  return timestamp;
}
const urinals = createUrinals(5, getTimestamp);

const rl = readline.createInterface({ input, output });

function formatState(state: Immutable<OccupancyProbability>) {
  return (
    state.state.join("") +
    "\t" +
    Math.round(state.probability * 100 * 100) / 100 +
    "%" +
    "\t" +
    (breaksBroCode(state.state) ? "NOK" : "OK")
  );
}

function printStates(states: Immutable<OccupancyProbability[]>) {
  for (const state of states) {
    console.log(formatState(state));
  }
}

while (true) {
  const event = await rl.question("[e]nter or e[x]it: ");
  if (event === "e") {
    urinals.personEntered();
  } else if (event === "x") {
    urinals.personExited();
  } else {
    console.log("Bro can you read");
    continue;
  }

  printStates(urinals.getAllStates());
  console.log("Bro code state: " + BroCodeState[urinals.getBroCodeState()]);
}
