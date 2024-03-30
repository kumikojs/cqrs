import { ResilienceOptions } from '../resilience/resilience_interceptors_builder';

/**
 * The context for a query, primarily used for cancellation.
 */
export interface QueryContext {
  /**
   * The signal for aborting the query.
   *
   * @remarks Integrates with libraries like `@tanstack/react-query` for cancellation mechanisms.
   */
  signal?: AbortSignal;
}

/**
 * Options for configuring a query's behavior and resilience.
 * (Refer to {@link ResilienceOptions} for more information.)
 */
export type QueryOptions = ResilienceOptions;
