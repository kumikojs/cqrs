/* eslint-disable @typescript-eslint/no-explicit-any */

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
