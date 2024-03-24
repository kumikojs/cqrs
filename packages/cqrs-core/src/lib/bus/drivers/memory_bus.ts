/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BusDriver, BusHandler } from '../bus_driver';

type BusOptions = {
  maxHandlersPerChannel: number;
  mode: 'soft' | 'hard';
};

export class MemoryBusDriver<TChanel> implements BusDriver<TChanel> {
  #subscriptions: Map<TChanel, BusHandler<any>[]> = new Map();
  #options: BusOptions;

  constructor(options?: Partial<BusOptions>) {
    this.#options = {
      maxHandlersPerChannel: 1,
      mode: 'hard',
      ...options,
    };
  }

  async publish<TRequest, TResponse>(
    channel: TChanel,
    request: TRequest
  ): Promise<TResponse | void> {
    const handlers = this.#subscriptions.get(channel);

    if (!handlers) {
      if (this.#options.mode === 'soft') {
        return;
      }

      throw new Error(`No handler for channel: ${channel}`);
    }

    const responses = await Promise.all(
      handlers.map((handler) => handler(request))
    );

    return responses[0];
  }

  subscribe<TRequest>(channel: TChanel, handler: BusHandler<TRequest>): void {
    const handlers = this.#subscriptions.get(channel) || [];

    if (handlers.length >= this.#options.maxHandlersPerChannel) {
      if (this.#options.mode === 'soft') {
        return;
      }

      throw new Error(
        `Max handler per channel: ${this.#options.maxHandlersPerChannel}`
      );
    }

    handlers.push(handler);
    this.#subscriptions.set(channel, handlers);
  }

  unsubscribe<TRequest>(channel: TChanel, handler: BusHandler<TRequest>): void {
    const handlers = this.#subscriptions.get(channel);

    if (!handlers) {
      if (this.#options.mode === 'soft') {
        return;
      }

      throw new Error(`No handler for channel: ${channel}`);
    }

    if (handler) {
      const index = handlers.indexOf(handler);

      if (index === -1) {
        if (this.#options.mode === 'soft') {
          return;
        }

        throw new Error(`Handler not found for channel: ${channel}`);
      }

      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.#subscriptions.delete(channel);
    }
  }
}
