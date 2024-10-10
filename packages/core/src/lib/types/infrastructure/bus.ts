/* eslint-disable @typescript-eslint/no-explicit-any */

import { KumikoLogger } from '../../utilities/logger/kumiko_logger';

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
export type BusHandler<TRequest, TResponse = any> =
  | ((request: TRequest, ...args: any[]) => Awaited<TResponse>)
  | { execute: (request: TRequest, ...args: any[]) => Awaited<TResponse> }
  | { handle: (request: TRequest, ...args: any[]) => Awaited<TResponse> };

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

  /**
   * The logger instance to use.
   *
   * @type {Logger}
   */
  logger?: KumikoLogger;
};

/**
 * The BusErrorDetails interface defines the details of a bus error.
 * It includes a message and an optional channel.
 *
 * @interface
 * @property {string} message - The error message.
 * @property {unknown} [channel] - The channel related to the error.
 */
export interface BusErrorDetails {
  message: string;
  channel?: unknown;
}

const BusErrorKeys = {
  MAX_HANDLERS_PER_CHANNEL: 'MAX_HANDLERS_PER_CHANNEL',
  NO_HANDLER_FOUND: 'NO_HANDLER_FOUND',
  INVALID_HANDLER: 'INVALID_HANDLER',
} as const;

export type BusErrorKeys = (typeof BusErrorKeys)[keyof typeof BusErrorKeys];
