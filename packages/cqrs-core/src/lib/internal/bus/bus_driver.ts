/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BusDriver<TChanel> {
  publish<TRequest, TResponse>(
    channel: TChanel,
    request: TRequest
  ): Promise<TResponse | void>;
  subscribe<TRequest>(channel: TChanel, handler: BusHandler<TRequest>): void;
  unsubscribe<TRequest>(channel: TChanel, handler: BusHandler<TRequest>): void;
}

export type BusHandler<TRequest, TResponse = any> = (
  request: TRequest
) => Awaited<TResponse>;
