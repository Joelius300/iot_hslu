/* NOTE: This code isn't pretty in many places but it's such a minor part of the IOT system, I don't think it's worth improving.*/
/* On another note, this code was very fun to create and gave lots of great discussions and interactions but it's worth mentioning
 * that we basically just statistically proved that it's bro code breaking with 3 and 4 people, available with less and full with more (5 urinals).
 * Therefore a tl;dr of this code below for 5 urinals is it just returns "available" if there are 0, 1 or 2 people in there, "bro code breaking"
 * for 3 and 4 people and "full" for 5.*/
/* A tl;dr of the inner workings is basically it calculates probabilities that a person would choose a specific urinal given the occupancy of the other urinals.
 * Then it combines these probabilities whenever a new person enters or exits. When the bro code is requested, it groups all the possible states
 * by their bro code state and sums up all the probabilities per group. The most probable bro code state is the one that is returned. */

import { assert } from "console";
import type { Immutable } from "./immutability.js";
import { BroCodeState } from "../../shared/shared.js";

// There's a lot of talk about weights and probabilities.
// I created (functions to create) discrete probability distributions for specific factors
// (e.g. the distance to the next occupied urinal) where each probability in this discrete distribution
// indicates the chance a person would choose this urinal if we only looked at that factor.
// I called the probabilities in these discrete probability distributions "weights" when I started but
// you can probably exchange "weight" for "probability" in many places (not the factor weights though) if that makes more sense to you.
// These probability distributions for the different factors are then weighted with their respective factor weight
// and added together to create a final probability distribution which takes all the factors into account.

// Factor weights
const SymmetryWeight = 3;
const FreeSpacesWeight = 6;
const DistanceWeight = 1;

/**
 * The occupancy of a set of urinals is encoded as an array of numbers where 0 means free
 * and non-0 means occupied.
 */
type Occupancy = number[];

// Sum of all elements in array
function sum(array: Immutable<number[]>) {
  let sum = 0;
  for (const e of array) {
    sum += e;
  }
  return sum;
}

// Multiply arrays elementwise or if b is a scalar, multiply each element with it (creates a new array)
function mult(a: Immutable<number[]>, b: number | Immutable<number[]>) {
  if (Array.isArray(b)) {
    if (a.length != b.length) {
      throw new Error("Cannot multiply arrays of different lengths.");
    }

    const array = new Array(a.length);
    for (let i = 0; i < array.length; i++) {
      array[i] = a[i]! * b[i]!;
    }

    return array;
  } else {
    const array = new Array(a.length);
    for (let i = 0; i < array.length; i++) {
      array[i] = a[i]! * <number> b;
    }

    return array;
  }
}

// Adds arrays elementwise
function add(...arrays: Immutable<number[][]>) {
  const n = arrays[0]!.length;
  for (const array of arrays) {
    if (array.length != n) {
      throw new Error("Cannot multiply arrays of different lengths.");
    }
  }

  const array = new Array(n).fill(0);
  for (let i = 0; i < array.length; i++) {
    for (const a of arrays) {
      array[i] += a[i];
    }
  }

  return array;
}

// Divides each element by the sum so the values add up to 1 (creates a new array)
function normalize(weights: Immutable<number[]>, preCalcSum = -1) {
  weights = weights.slice(0); // clone array

  if (preCalcSum < 0) {
    preCalcSum = sum(weights);
  }

  return mult(weights, 1 / preCalcSum);
}

/** Inverts a boolean array: 0 -> 1, non-0 -> 0 (creates a new array) */
function invertTruthValues(array: Immutable<number[]>) {
  const arr = array.slice(0); // clone array

  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i] == 0 ? 1 : 0;
  }

  return arr;
}

const SymmetryWeights = {
  wall: 4,
  odd: 3,
  even: 2,
};

/** Calculates the normalized weights for the influence of symmetry on the choice of urinal */
function getSymmetryWeights(n: number) {
  const weights = new Array(n);
  let sum = 0;
  // 0-indexed but only go from second to second to last (exclude walls)
  for (let i = 1; i < weights.length - 1; i++) {
    if ((i + 1) % 2 == 0) {
      // add 1 to make it 1-indexed (second urinal is at 2, not 1)
      weights[i] = SymmetryWeights.even;
    } else {
      weights[i] = SymmetryWeights.odd;
    }
    sum += weights[i];
  }

  weights[0] = SymmetryWeights.wall;
  weights[weights.length - 1] = SymmetryWeights.wall;
  sum += SymmetryWeights.wall * 2;

  return normalize(weights, sum);
}

function getShortestDistanceToPersonLeftAndRight(
  occupancy: Immutable<Occupancy>,
) {
  const spaces = new Array(occupancy.length);

  // Go through from the left and count up all the free spaces on the left of each urinal
  let emptySpacesLeft = NaN;
  for (let i = 0; i < spaces.length; i++) {
    spaces[i] = emptySpacesLeft;

    if (occupancy[i]) {
      emptySpacesLeft = 0;
    } else {
      emptySpacesLeft++;
    }
  }

  // Go through from the right and count up all the free spaces on the right of each urinal
  // We only want to use the number as weight if there are less urinals on the right than on
  // the left (we only need to account for the shortest distance to the closest person).
  let emptySpacesRight = NaN;
  for (let i = spaces.length - 1; i >= 0; i--) {
    if (Number.isNaN(spaces[i]) || emptySpacesRight < spaces[i]) {
      spaces[i] = emptySpacesRight;
    }

    if (occupancy[i]) {
      emptySpacesRight = 0;
    } else {
      emptySpacesRight++;
    }
  }

  return spaces;
}

/** Calculates the normalized weights for the influence of free urinals left and right on the choice of urinal */
function getFreeSpacesWeights(occupancy: Immutable<Occupancy>) {
  const spaces = getShortestDistanceToPersonLeftAndRight(occupancy);

  for (let i = 0; i < spaces.length; i++) {
    if (Number.isNaN(spaces[i])) {
      spaces[i] = 1; // there should only be NaNs if there are no people right? i don't remember but doesn't matter, it works.
    } else {
      spaces[i] = spaces[i] + 1; // otherwise we want to avoid zeroes in our probabilities so we start at 1
    }
  }

  return normalize(spaces);
}

/** Calculates distance weights for a given number of urinals, given the entry is on the left */
function getDistanceWeights(n: number) {
  const weights = new Array(n);
  let currentDistanceWeight = n;
  for (let i = 0; i < weights.length; i++) {
    weights[i] = currentDistanceWeight;
    currentDistanceWeight -= 1;
  }

  return normalize(weights);
}

/**
 * Gets the probability for each urinal that the next person will choose it.
 * @param occupancy An array of 1s and 0s where 1 marks an occupied urinal and 0 an unoccupied one.
 * Eg. [1,0,0,0,0] -> only the first of the 5 urinals is occupied.
 * @returns An array of the same length as the occupancy array with numbers between 0 and 1 indicating the percentage probability
 * that the next person coming from the left would choose this urinal.
 */
export function getNextUrinalProbability(
  occupancy: Immutable<Occupancy>,
): number[] {
  const n = occupancy.length;
  const occupancyWeights = invertTruthValues(occupancy); // obviously the occupied urinals need to have weight/probability = 0
  // Calculate all three probability arrays separately on top of the base weights
  const symmetryProbabilities = normalize(
    mult(occupancyWeights, getSymmetryWeights(n)),
  );
  const freeSpacesProbabilities = normalize(
    mult(occupancyWeights, getFreeSpacesWeights(occupancy)),
  );
  const distanceProbabilities = normalize(
    mult(occupancyWeights, getDistanceWeights(n)),
  );

  // Add up all the probabilities while taking into account the factor weight of each of the three factors and then normalize again
  return normalize(
    add(
      mult(symmetryProbabilities, SymmetryWeight),
      mult(freeSpacesProbabilities, FreeSpacesWeight),
      mult(distanceProbabilities, DistanceWeight),
    ),
  );
}

// these two functions might be useful in other places later on
const toOccupancyArray = (occupancy: string) =>
  occupancy.split("").map((x) => parseInt(x));

/**
 * Runs specified test cases on the urinal probability algorithm.
 * @param testCases Tuples of Urinal occupancy strings where 1 means an occupied urinal and 0 an unoccupied one.
 * The first string in the tuple is the starting point and the second one is the outcome you would expect when someone joins the urinals from the left.
 * The newly occupied urinal should be marked with an X.
 * Example (single test case): ["10000", "1000X"] is the test, that given only the first urinal is occupied, a person would choose the last one.
 */
export function runNextUrinalTestCases(testCases: [string, string][]) {
  const toOccupancyString = (occupancy: (number | string)[]) =>
    occupancy.join("");

  const separator = "-----------------------";
  console.log(separator);
  for (const testCase of testCases) {
    const startingOccupancyString = testCase[0];
    const startingOccupancy = toOccupancyArray(startingOccupancyString);
    const expectedOccupancyString = testCase[1];

    const probabilities = Array.from(
      getNextUrinalProbability(startingOccupancy).entries(),
    );
    probabilities.sort((a, b) => b[1] - a[1]); // sort by probability descending

    console.log("Before: " + startingOccupancyString);
    console.log("After:  " + expectedOccupancyString + "\n");

    for (const [index, probability] of probabilities) {
      if (isNaN(probability)) {
        // debugger;
      }

      if (probability <= 0.001) {
        continue; // skip
      }

      const newOccupancy: (number | string)[] = startingOccupancy.slice(0);
      newOccupancy[index] = "X";

      const occupancyString = toOccupancyString(newOccupancy);

      console.log(
        "    " +
          (occupancyString === expectedOccupancyString ? "--> " : "    ") +
          occupancyString +
          " | " +
          Math.round(probability * 100 * 100) / 100 +
          "%",
      );
    }
    console.log(separator);
  }
}

/** Gets a hashcode for an occupancy. Note that it is guaranteed to
 * return the same hash for equal occupancies but it's not guaranteed
 * that the occupancies are equal when the hash is equal.
 * Hash collisions must be handled manually. */
function occupancyHash(a: Immutable<Occupancy>, exact: boolean): number {
  let hash = 1;
  for (let i = 0; i < a.length; i++) {
    const val = exact ? a[i] : a[i] ? 1 : 0;
    hash = 37 * hash + val!;
    // hash += val! << (i + 1); this method is trash and gives tons of collisions
  }

  return hash;
}

function occupancyEquals(
  a: Immutable<Occupancy>,
  b: Immutable<Occupancy>,
  exact: boolean,
): boolean {
  if (!a || !b) return a == b;

  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    // compare exact value aka person id
    if (exact && a[i] !== b[i]) {
      return false;
    }
    // only compare truthy vs. falsy (occupied vs unoccupied)
    if (!exact && !!a[i] !== !!b[i]) {
      return false;
    }
  }

  return true;
}

export function runOccupancyEqualityTestCases(
  testCases: [string, string, boolean, boolean][],
) {
  for (const testCase of testCases) {
    const a = toOccupancyArray(testCase[0]);
    const b = toOccupancyArray(testCase[1]);
    const equalsExact = testCase[2];
    const equals = testCase[3];
    assert(
      occupancyEquals(a, b, true) === equalsExact,
      `Exact occupancy equality failed: occupancyEquals(${testCase[0]}, ${
        testCase[1]
      }, true) === ${equalsExact}`,
    );
    if (equalsExact) {
      assert(
        occupancyHash(a, true) === occupancyHash(b, true),
        `Exact occupancy hash failed: occupancyHash(${
          testCase[0]
        }, true) === occupancyHash(${testCase[1]}, true)`,
      );
    } else {
      assert(
        occupancyHash(a, true) !== occupancyHash(b, true),
        `Exact occupancy hash failed: occupancyHash(${
          testCase[0]
        }, true) !== occupancyHash(${testCase[1]}, true)`,
      );
    }

    assert(
      occupancyEquals(a, b, false) === equals,
      `Normal occupancy equality failed: occupancyEquals(${testCase[0]}, ${
        testCase[1]
      }, false) === ${equals}`,
    );
    if (equals) {
      assert(
        occupancyHash(a, false) === occupancyHash(b, false),
        `Normal occupancy hash failed: occupancyHash(${
          testCase[0]
        }, false) === occupancyHash(${testCase[1]}, false)`,
      );
    } else {
      assert(
        occupancyHash(a, false) !== occupancyHash(b, false),
        `Normal occupancy hash failed: occupancyHash(${
          testCase[0]
        }, false) !== occupancyHash(${testCase[1]}, false)`,
      );
    }
  }

  console.log(
    "If there are no assertion failed messages above, occupancy equality tests all passed.",
  );
}

export function formatOccupancyProbability(
  occupancy: Immutable<OccupancyProbability>,
) {
  return (
    "(" +
    occupancy.state.join("") +
    "|" +
    Math.round(occupancy.probability * 100 * 100) / 100 +
    "%" +
    ")"
  );
}

/** Gets whether the occupancy break the bro code. */
export function breaksBroCode(occupancy: Immutable<Occupancy>): boolean {
  const distancesToPeople = getShortestDistanceToPersonLeftAndRight(occupancy);
  // if there an unoccupied urinal whose shortest distance to another person is 1 (urinal) or greater,
  // it's not a bro code breaking situation. Otherwise it is.
  // (there may be a smarter way, probably with some rather simple (d)math)
  return !distancesToPeople.some((d, i) => !occupancy[i] && d >= 1);
}

/**
 * A set of n urinals with the entry on the left of the urinals (to get to the rightmost
 * urinal, you have to walk by all the others first).
 *
 * The urinals may be in multiple states of occupancy at the same time but when observed,
 * only the most probable state is returned. Quantum mechanics yay.
 */
export interface Urinals {
  /**
   * Number of urinals in this set.
   */
  readonly n: number;

  /**
   * Current number of people in the urinals.
   */
  readonly numberOfPeople: number;

  /**
   * Collapses states and returns the most probable occupancy state of the urinals at this point in time.
   */
  // getState(): Immutable<Occupancy>;

  /**
   * Returns the current bro code state. Again, done with probabilities and taken the most probable.
   */
  getBroCodeState(): BroCodeState;

  /**
   * Gets all the possible states with their probability.
   */
  getAllStates(): Immutable<OccupancyProbability[]>;

  /**
   * Gets the internal states with the personIds (beware: implementation details).
   */
  // getInternalStates(): Immutable<OccupancyProbability[]>;

  /**
   * A person entered the urinals and occupies one.
   */
  personEntered(): void;

  /**
   * A person exited the urinals and frees one.
   */
  personExited(): void;

  /**
   * Resets the urinals to be empty.
   */
  reset(): void;
}

export type OccupancyProbability = { state: Occupancy; probability: number };
class UrinalsImpl implements Urinals {
  public n: number;
  public numberOfPeople = 0;
  private states: Immutable<OccupancyProbability[]> = [];
  private entryTimes: number[] = [];
  private getMillis: () => number;
  private discardThreshold = 0.00001;

  constructor(n: number, getMillis: () => number) {
    this.n = n;
    this.getMillis = getMillis;
    this.reset();
  }

  getState(): Immutable<Occupancy> {
    const collapsedStates = this.getAllStates();
    return collapsedStates[0]!.state;
  }

  getBroCodeState(): BroCodeState {
    if (this.numberOfPeople === 0) {
      return BroCodeState.Available; // empty -> available
    }
    if (this.numberOfPeople >= this.n) {
      return BroCodeState.Full; // full -> full
    }
    if (this.numberOfPeople === this.n - 1) {
      return BroCodeState.BroCodeBreaking; // only one left -> 100% bro code breaking
    }

    // otherwise check manually
    const breaksCodeProbability = sum(
      this.states
        .filter((s) => breaksBroCode(s.state))
        .map((s) => s.probability),
    );
    if (breaksCodeProbability >= 0.5) {
      return BroCodeState.BroCodeBreaking;
    }

    return BroCodeState.Available;
  }

  getAllStates(): Immutable<OccupancyProbability[]> {
    return this.consolidateOccupancyStates(this.states, false);
  }

  getInternalStates(): Immutable<OccupancyProbability[]> {
    return this.states;
  }

  personEntered(): void {
    this.numberOfPeople++;

    if (this.numberOfPeople > this.n) {
      // if there are more people than urinals, they are just waiting and the occupancy state didn't change.
      return;
    }

    const entryIndex = this.entryTimes.findIndex((e) => e === 0);
    const personId = entryIndex + 1;
    this.entryTimes[entryIndex] = this.getMillis();

    const newStates: OccupancyProbability[] = [];
    for (const state of this.states) {
      const nextUrinalProbabilities = getNextUrinalProbability(state.state);
      assert(
        Math.abs(sum(nextUrinalProbabilities) - 1) < 0.00001,
        "Urinal probabilities returned from getNextUrinalProbability don't equal sum to 1 but " +
          sum(nextUrinalProbabilities),
      );
      // let log = formatOccupancyProbability(state) + "\t -> " + "[";
      for (let i = 0; i < this.n; i++) {
        const probability = state.probability * nextUrinalProbabilities[i]!;
        if (probability < this.discardThreshold) continue;

        const newState = {
          probability,
          state: this.buildOccupancyEntered(state.state, i, personId),
        };
        newStates.push(newState);

        // log += formatOccupancyProbability(newState) + ",";
      }

      // console.log(log + "]");
    }

    this.states = this.consolidateOccupancyStates(newStates, true);
  }

  // we just assume the person that entered first exits first. Of course it would be nicer
  // to also work with probabilities here but frankly it's not really in scope for this project
  // and probably doesn't make a difference most of the time anyway.
  personExited(): void {
    if (this.numberOfPeople === 0) {
      // Something went wrong: A person exited although we thought there were no people in the urinals.
      throw new Error("No urinal occupied, cannot exit.");
    }

    this.numberOfPeople--;

    if (this.numberOfPeople === 0) {
      // last person exited, we can reset everything
      this.reset();
      return;
    }
    else if (this.numberOfPeople >= this.n) {
      // There were more people than urinals before, so all urinals will still be occupied after this person exits; no need to recalculate.
      return;
    }

    const minMillis = Math.min(...this.entryTimes.filter((e) => e > 0));
    const leavingPersonIndex = this.entryTimes.findIndex(
      (e) => e === minMillis,
    );
    this.entryTimes[leavingPersonIndex] = 0;

    const personId = leavingPersonIndex + 1;
    const newStates: OccupancyProbability[] = [];

    for (const state of this.states) {
      const probability = state.probability;
      if (probability < this.discardThreshold) continue;

      newStates.push({
        state: this.buildOccupancyExited(state.state, personId),
        probability,
      });
    }

    this.states = this.consolidateOccupancyStates(newStates, true);
  }

  forceState(state: Occupancy, entryTimes: number[]): void {
    this.states = [{ state, probability: 1 }];
    this.numberOfPeople = this.states.filter((e) => e).length; // filter only for truthy values -> non-0 -> occupied
    this.entryTimes = entryTimes;
  }

  reset() {
    this.forceState(new Array(this.n).fill(0), new Array(this.n).fill(0));
    this.numberOfPeople = 0;
  }

  private buildOccupancyEntered(
    originalOccupancy: Immutable<Occupancy>,
    index: number,
    personId: number,
  ) {
    const newOccupancy = originalOccupancy.slice(0);
    newOccupancy[index] = personId;
    return newOccupancy;
  }

  private buildOccupancyExited(
    originalOccupancy: Immutable<Occupancy>,
    personId: number,
  ) {
    const newOccupancy = originalOccupancy.slice(0);
    const index = originalOccupancy.findIndex((e) => e === personId);
    newOccupancy[index] = 0;
    return newOccupancy;
  }

  private consolidateOccupancyStates(
    states: Immutable<OccupancyProbability[]>,
    exact: boolean,
  ): Immutable<OccupancyProbability[]> {
    this.assertOneHundredPercent(
      this.states,
      `before ${exact ? "exact " : ""}consolidation`,
    );

    const grouped = new Map<number, OccupancyProbability>();
    for (const state of states) {
      let hash = occupancyHash(state.state, exact);

      while (true) {
        const existing = grouped.get(hash);
        if (existing) {
          if (occupancyEquals(existing.state, state.state, exact)) {
            existing.probability += state.probability;
            break;
          }

          hash += 1; // linear probing (probably not needed anymore with better hash function but why not)
          console.log(
            "HASH COLLISION DETECTED; increasing hash by 1 to " + hash,
          );
        } else {
          // deep copy when consolidating so we can add the probabilities together without affecting the originals (!!!)
          grouped.set(hash, {
            state: state.state.slice(0),
            probability: state.probability,
          });
          break;
        }
      }
    }

    let newStates = Array.from(grouped.values());
    this.assertOneHundredPercent(
      newStates,
      `after ${exact ? "exact " : ""}consolidation before normalization`,
    );

    if (!exact) {
      for (const state of newStates) {
        // since we grouped them just by truthiness, we must also
        // make the states actually reflect that. Could be done at
        // the beginning as well but the hash function works too.
        // It's just not very efficient to do both and you wouldn't need
        // two different hash functions. Anyways, it works.
        state.state = state.state.map((o) => (o ? 1 : 0));
      }
    }

    this.assertOneHundredPercent(
      newStates,
      `after ${exact ? "exact " : ""}consolidation`,
    );

    return newStates.sort((a, b) => b.probability - a.probability); // sort by probability DESC
  }

  private assertOneHundredPercent(
    states: Immutable<OccupancyProbability[]>,
    location = "",
  ) {
    const totalPercentage = sum(states.map((s) => s.probability));
    assert(
      Math.abs(totalPercentage - 1) < 0.00001,
      `Total percentage is ${totalPercentage} instead of 1! @${location}`,
    );
  }
}

export function createUrinals(n: number, getMillis: () => number): Urinals {
  return new UrinalsImpl(n, getMillis);
}
