/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BusDriver, BusHandler } from '../bus_driver';

/**
 * The options for the MemoryBusDriver
 *
 * @typedef BusOptions
 * @property {number} maxHandlersPerChannel - The maximum number of handlers per channel.
 * @property {'soft' | 'hard'} mode - The mode of the bus.
 */
type BusOptions = {
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
 * The MemoryBusDriver is a simple in-memory bus driver that allows you to publish
 * requests and subscribe to channels.
 *
 * @template TChannel - The type of channel to use.
 * @implements BusDriver<TChannel> - The bus driver contract.
 */
export class MemoryBusDriver<TChannel> implements BusDriver<TChannel> {
  /**
   * The subscriptions map.
   *
   * @type {Map<TChannel, BusHandler<any>[]>}
   */
  #subscriptions: Map<TChannel, BusHandler<any>[]> = new Map();

  /**
   * The options for the MemoryBusDriver
   *
   * @type {BusOptions}
   */
  #options: BusOptions;

  constructor(options?: Partial<BusOptions>) {
    this.#options = {
      maxHandlersPerChannel: 1,
      mode: 'hard',
      ...options,
    };
  }

  /**
   * Publish a request to the bus.
   *
   * @template TRequest - The type of request to publish.
   * @template TResponse - The type of response from the handler.
   * @param {TChannel} channel - The channel to publish the request to.
   * @param {TRequest} request - The request to publish.
   * @returns {Promise<TResponse | void>} The response from the handler.
   */
  async publish<TRequest, TResponse>(
    channel: TChannel,
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

  /**
   * Subscribe to a channel.
   *
   * @template TRequest - The type of request to subscribe to.
   * @param {TChannel} channel - The channel to subscribe to.
   * @param {BusHandler<TRequest>} handler - The handler to subscribe.
   */
  subscribe<TRequest>(channel: TChannel, handler: BusHandler<TRequest>): void {
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

  /**
   * Unsubscribe from a channel.
   *
   * @template TRequest - The type of request to unsubscribe.
   * @param {TChannel} channel - The channel to unsubscribe from.
   * @param {BusHandler<TRequest>} handler - The handler to unsubscribe.
   */
  unsubscribe<TRequest>(
    channel: TChannel,
    handler: BusHandler<TRequest>
  ): void {
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
