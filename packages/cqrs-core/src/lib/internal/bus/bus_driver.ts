import type { BusHandler } from './bus_handler';

/**
 * The bus driver interface.
 * This is the interface that all bus drivers must implement.
 *
 * @internal
 * @template TChannel - The type of channel to use.
 */
export interface BusDriver<TChannel> {
  /**
   * Publish a request to the bus.
   *
   * @template TRequest - The type of request to publish.
   * @template TResponse - The type of response from the handler.
   * @param {TChannel} channel - The channel to publish the request to.
   * @param {TRequest} request - The request to publish.
   * @returns {Promise<TResponse | void>} The response from the handler.
   */
  publish<TRequest, TResponse>(
    channel: TChannel,
    request: TRequest
  ): Promise<TResponse>;
  publish<TRequest>(channel: TChannel, request: TRequest): Promise<void>;

  /**
   * Subscribe to a channel.
   *
   * @template TRequest - The type of request to subscribe to.
   * @param {TChannel} channel - The channel to subscribe to.
   * @param {BusHandler<TRequest>} handler - The handler to subscribe.
   */
  subscribe<TRequest>(channel: TChannel, handler: BusHandler<TRequest>): void;

  /**
   * Unsubscribe from a channel.
   *
   * @template TRequest - The type of request to unsubscribe from.
   * @param {TChannel} channel - The channel to unsubscribe from.
   * @param {BusHandler<TRequest>} handler - The handler to unsubscribe.
   */
  unsubscribe<TRequest>(channel: TChannel, handler: BusHandler<TRequest>): void;

  /**
   * Clear all subscriptions from the bus.
   */
  disconnect(): void;
}
