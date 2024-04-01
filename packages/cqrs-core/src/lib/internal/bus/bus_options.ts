/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The options for the MemoryBusDriver
 *
 * @typedef BusOptions
 * @property {number} maxHandlersPerChannel - The maximum number of handlers per channel.
 * @property {'soft' | 'hard'} mode - The mode of the bus.
 */
export type BusOptions = {
  /**
   * The maximum number of handlers per channel.
   *
   * @type {number}
   * @default 1
   */
  maxHandlersPerChannel: number;

  /**
   * The mode of the bus.
   *
   * @type {'soft' | 'hard'}
   * @default 'hard'
   */
  mode: 'soft' | 'hard';
};

/**
 * The BusErrorDetails interface defines the details of a bus error.
 * It includes a message and an optional channel.
 *
 * @interface
 * @property {string} message - The error message.
 * @property {unknown} [channel] - The channel related to the error.
 */
interface BusErrorDetails {
  message: string;
  channel?: unknown;
}

const BusErrorKeys = {
  MAX_HANDLERS_PER_CHANNEL: 'MAX_HANDLERS_PER_CHANNEL',
  NO_HANDLER_FOUND: 'NO_HANDLER_FOUND',
} as const;

type BusErrorKeys = (typeof BusErrorKeys)[keyof typeof BusErrorKeys];

/**
 * The BusException class is a custom exception class that extends the Error class.
 * It holds error details including a key and message.
 *
 * @extends Error
 * @class
 */
export class BusException extends Error {
  constructor(
    public readonly key: BusErrorKeys,
    public readonly details: BusErrorDetails
  ) {
    super(details.message);
    this.name = 'BusException';
  }
}

/**
 * The BusOptionsManager class acts as a facade for options and error handling functionalities
 * used by the different bus drivers (e.g. MemoryBusDriver).
 */
export class BusOptionsManager<TChannel> {
  #options: BusOptions;

  constructor(options?: Partial<BusOptions>) {
    this.#options = {
      maxHandlersPerChannel: 1,
      mode: 'hard',
      ...options,
    };
  }

  verifyHandlerLimit(channel: TChannel, handlerCount: number): void {
    if (handlerCount >= this.#options.maxHandlersPerChannel) {
      this.throwError(BusErrorKeys.MAX_HANDLERS_PER_CHANNEL, channel);
    }
  }

  requireAtLeastOneHandler(channel: TChannel, handlerCount: number): void {
    if (handlerCount === 0) {
      this.throwError(BusErrorKeys.NO_HANDLER_FOUND, channel);
    }
  }

  /**
   * Throws a BusException based on the provided error key and channel (optional).
   *
   * @param {BusErrorKeys} key - The error key from the BusErrorKeys enumeration.
   * @param {TChannel} channel - The channel related to the error (optional).
   */
  throwError(key: BusErrorKeys, channel?: TChannel): void | never {
    if (this.#options.mode === 'soft') {
      return;
    }

    const message = this.#getErrorMessage(key);
    throw new BusException(key, {
      message,
      channel: channel ? channel : 'N/A',
    });
  }

  #getErrorMessage(key: BusErrorKeys): string {
    switch (key) {
      case BusErrorKeys.MAX_HANDLERS_PER_CHANNEL:
        return `Limit of ${
          this.#options.maxHandlersPerChannel
        } handler(s) per channel reached.`;
      case BusErrorKeys.NO_HANDLER_FOUND:
        return `No handler found for this channel.`;
      default:
        throw new Error(`Unknown Bus Error Key: ${key}`);
    }
  }
}
