import { AesopLogger } from '../../utilities/logger/aesop_logger';
import { BusException } from './bus_exception';

import type { BusErrorKeys, BusOptions } from '../../types/infrastructure/bus';

/**
 * The BusOptionsManager class acts as a facade for options and error handling functionalities
 * used by the different bus drivers (e.g. MemoryBusDriver).
 */
export class BusOptionsManager<TChannel> {
  #options: BusOptions;
  #logger: AesopLogger | undefined;

  constructor({ logger, ...options }: Partial<BusOptions> = {}) {
    this.#options = {
      maxHandlersPerChannel: 1,
      mode: 'hard',
      ...options,
    };

    this.#logger = logger?.child({
      topics: ['bus'],
    });
  }

  get logger(): AesopLogger | undefined {
    return this.#logger;
  }

  verifyHandlerLimit(channel: TChannel, handlerCount: number): void {
    if (handlerCount >= this.#options.maxHandlersPerChannel) {
      this.throwError('MAX_HANDLERS_PER_CHANNEL', channel);
    }
  }

  requireAtLeastOneHandler(channel: TChannel, handlerCount: number): void {
    if (handlerCount === 0) {
      this.throwError('NO_HANDLER_FOUND', channel);
    }
  }

  /**
   * Throws a BusException based on the provided error key and channel (optional).
   *
   * @param {BusErrorKeys} key - The error key from the BusErrorKeys enumeration.
   * @param {TChannel} channel - The channel related to the error (optional).
   */
  throwError(key: BusErrorKeys, channel?: TChannel): void | never {
    const message = this.#getErrorMessage(key);

    if (this.#options.mode === 'soft') {
      this.#logger?.warn(message, {
        topics: ['bus'],
        data: { channel_name: channel },
      });
      return;
    }

    throw new BusException(key, {
      message,
      channel: channel ? channel : 'N/A',
    });
  }

  #getErrorMessage(key: BusErrorKeys): string {
    switch (key) {
      case 'MAX_HANDLERS_PER_CHANNEL':
        return `Limit of ${
          this.#options.maxHandlersPerChannel
        } handler(s) per channel reached.`;
      case 'NO_HANDLER_FOUND':
        return `No handler found for this channel.`;
      default:
        throw new Error(`Unknown Bus Error Key: ${key}`);
    }
  }
}
