export enum BroCodeState {
  /**
   * There is one or more unoccupied unproblematic urinal available.
   */
  Available = 0,

  /**
   * There is an unoccupied urinal available but you would break the bro code by having to go directly next to someone else.
   */
  BroCodeBreaking = 1,

  /**
   * There are no unoccupied urinals available whatsoever.
   */
  Full = 2,
}

export const BROKER_HOSTNAME = "localhost"; // this of course changes, we could also use process.argv instead to avoid rebuilding
export const NUMBER_OF_URINALS = 5;
export const PERSON_ENTERED_TOPIC = "person_entered";
export const PERSON_EXITED_TOPIC = "person_exited";
export const BRO_CODE_CHANGED_TOPIC = "bro_code_changed";

export function broCodeToBuffer(broCodeState: BroCodeState) {
  return Buffer.from([broCodeState]);
}

export function broCodeFromBuffer(buffer: Buffer): BroCodeState {
  return buffer[0]!;
}

export class Timer {
  private callback: () => void;
  private interval: number;
  private timeout: NodeJS.Timeout | undefined;

  constructor(callback: () => void, interval: number) {
    this.callback = callback;
    this.interval = interval;
  }

  private internalCallback() {
    this.callback();
    this.timeout = undefined;
  }

  start() {
    if (!this.timeout) {
      const self = this;
      this.timeout = setTimeout(
        () => this.internalCallback.apply(self),
        this.interval,
      );
    }
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }

  restart() {
    this.stop();
    this.start();
  }
}

export function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
