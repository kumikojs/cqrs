/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The bus handler type.
 *
 * @typedef BusHandler
 * @template TRequest - The type of request the handler handles.
 * @template TResponse - The type of response from the handler.
 * @param {TRequest} request - The request to handle.
 * @param {...any} args - Additional arguments to pass to the handler.
 * @returns {Promise<TResponse>} The response from the handler.
 */
export type BusHandler<TRequest, TResponse = any> = (
  request: TRequest,
  ...args: any[]
) => Awaited<TResponse>;
