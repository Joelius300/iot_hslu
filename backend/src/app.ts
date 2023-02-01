import setupRemoteUrinals from "./remote-urinals.js";
import { BroCodeState } from "../../shared/shared.js";
import { existsSync } from "fs";
import { appendFile, mkdir } from "fs/promises";
import { dirname } from "path";

const BRO_CODE_CSV_PATH = "csv/brocodestate.csv"; // hard-coded here, would be configurable in a real-world project

/** Save the bro code state to a csv file with the current timestamp.
 * The state is saved redundantly both as number (for machines/deserialization) and as string (for better human readability).
 * In a real-world project it must be evaluated whether this redundancy is worth it.
 */
async function saveToCsv(broCodeState: BroCodeState) {
  const timestamp = new Date().toISOString();
  const csv = [timestamp, broCodeState, BroCodeState[broCodeState]].join(",");
  await appendFile(BRO_CODE_CSV_PATH, csv + "\n");
}

/** Starts the process of saving the bro code state to disk without
 * waiting for the process to complete. It sets up a listener that
 * prints a log message if the process fails/errors (is rejected).
 * This allows the execution to continue immediately without being
 * blocked by the IO writing the file.
 */
function saveToCsvFireAndForget(broCodeState: BroCodeState) {
  saveToCsv(broCodeState).catch((err) => console.error(err));
}

// ensure csv folder exists for writing the csv file in it
const csvDir = dirname(BRO_CODE_CSV_PATH);
if (!existsSync(csvDir)) {
  await mkdir(csvDir, {recursive: true});
}

setupRemoteUrinals(saveToCsvFireAndForget);

console.log("Urinals are setup and ready to watch for changes (over MQTT).");
