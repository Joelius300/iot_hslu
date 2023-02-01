enum Entrance {
  LEFT,
  RIGHT,
}

export enum EntryState {
  ENTER,
  EXIT,
}

// We hard-code here that the entrance is to the left.
// In a real project this would be made configurable.
// Another approach would be to discard left and right and instead name them
// entry and exit sensors. Since you can just switch around the sensors hardware-wise
// (at least with our current prototype design), you would only need to handle one case in software.
const entrance: Entrance = Entrance.LEFT;

export function getEntryState(data: number) {
  const [left, right] = getSensorValues(data);

  if (left === right) {
    throw new Error("Cannot determine entry state when both sensors have the same state.");
  }

  if (
    (left && entrance === Entrance.LEFT) ||
    (right && entrance === Entrance.RIGHT)
  ) {
    return EntryState.ENTER;
  } else {
    return EntryState.EXIT;
  }
}

function getSensorValues(data: number) {
  // Ps. this !! converts a number to a boolean (0 = false, 1 = true)
  const left = !!(data & (1 << 4));
  const right = !!(data & 1);

  return [left, right];
}
