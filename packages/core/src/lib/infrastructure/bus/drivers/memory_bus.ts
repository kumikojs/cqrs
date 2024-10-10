/* eslint-disable @typescript-eslint/no-explicit-any */
import { BusOptionsManager } from '../bus_options_manager';

import type {
  BusDriver,
  BusHandler,
  BusOptions,
} from '../../../types/infrastructure/bus';
import { BusException } from '../bus_exception';

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
   * The options manager.
   *
   * @type {BusOptionsManager<TChannel>}
   */
  #optionsManager: BusOptionsManager<TChannel>;

  constructor(options?: Partial<BusOptions>) {
    this.#optionsManager = new BusOptionsManager<TChannel>(options);
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
    this.#optionsManager.logger?.trace(
      `Publishing request to channel ${channel}`
    );

    const handlers = this.#subscriptions.get(channel) || [];

    this.#optionsManager.requireAtLeastOneHandler(channel, handlers.length);

    const responses = await Promise.all(
      handlers.map((handler) =>
        this.#invokeHandler<TRequest, TResponse>(handler, request)
      )
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
    this.#optionsManager.logger?.trace(`Subscribing to channel ${channel}`);

    const handlers = this.#subscriptions.get(channel) || [];

    this.#optionsManager.verifyHandlerLimit(channel, handlers.length);

    this.#verifyHandler(handler);

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
    this.#optionsManager.logger?.trace(`Unsubscribing from channel ${channel}`);

    const handlers = this.#subscriptions.get(channel);

    if (!handlers) {
      this.#optionsManager.throwError('NO_HANDLER_FOUND', channel);
      return;
    }

    const index = handlers.indexOf(handler);

    if (index === -1) {
      this.#optionsManager.throwError('NO_HANDLER_FOUND', channel);
      return;
    }

    handlers.splice(index, 1);

    if (handlers.length === 0) {
      this.#subscriptions.delete(channel);
    }
  }

  /**
   * Clear all subscriptions from the bus.
   */
  disconnect(): void {
    this.#subscriptions.clear();
  }

  #invokeHandler<TRequest, TResponse>(
    handler: BusHandler<TRequest>,
    request: TRequest
  ): Promise<TResponse | void> {
    this.#verifyHandler(handler);

    if (typeof handler === 'function') {
      return handler(request);
    }

    if ('handle' in handler) {
      return handler.handle(request);
    }

    return handler.execute(request);
  }

  #verifyHandler(handler: BusHandler<any>): void {
    if (typeof handler !== 'function') {
      if (!('handle' in handler || 'execute' in handler)) {
        throw new BusException('INVALID_HANDLER', {
          message:
            'Invalid handler provided. Must be a function or an object with an execute or handle method.',
        });
      }
    }
  }
}
