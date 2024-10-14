import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import {
  BusException,
  MaxHandlersPerChannelException,
  NoHandlerFoundException,
} from './bus_exception';
import type { BusErrorKeys, BusOptions } from '../../types/infrastructure/bus';

export class BusOptionsManager<TChannel> {
  #options: BusOptions;
  #logger: KumikoLogger | undefined;

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

  get logger(): KumikoLogger | undefined {
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

  throwError(key: BusErrorKeys, channel: TChannel): void | never {
    const details = { channel: channel ? channel : 'N/A' };

    if (this.#options.mode === 'soft') {
      const message = `Bus error: ${key} - ${details.channel}`;

      this.#logger?.warn(message, {
        topics: ['bus'],
        data: { channel_name: channel },
      });
      return;
    }

    switch (key) {
      case 'MAX_HANDLERS_PER_CHANNEL':
        throw new MaxHandlersPerChannelException(
          channel,
          this.#options.maxHandlersPerChannel
        );
      case 'NO_HANDLER_FOUND':
        throw new NoHandlerFoundException(channel);
      default:
        throw new BusException(`Bus error: ${key} - ${details.channel}`);
    }
  }
}
