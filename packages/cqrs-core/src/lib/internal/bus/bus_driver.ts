/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The bus driver interface.
 * This is the interface that all bus drivers must implement.
 *
 * @internal
 * @template TChannel - The type of channel to use.
 */
export interface BusDriver<TChanel> {
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
    channel: TChanel,
    request: TRequest
  ): Promise<TResponse | void>;
  subscribe<TRequest>(channel: TChanel, handler: BusHandler<TRequest>): void;
  unsubscribe<TRequest>(channel: TChanel, handler: BusHandler<TRequest>): void;
}

/**
 * The bus handler type.
 *
 * @typedef BusHandler
 * @template TRequest - The type of request the handler handles.
 * @template TResponse - The type of response from the handler.
 * @param {TRequest} request - The request to handle.
 * @returns {Promise<TResponse>} The response from the handler.
 */
export type BusHandler<TRequest, TResponse = any> = (
  request: TRequest
) => Awaited<TResponse>;
