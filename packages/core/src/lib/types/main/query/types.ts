import type { DurationUnit } from '../../../utilities/ms/types';
import type {
  BaseContext,
  BaseMessage,
  BaseOptions,
  BaseRegistry,
  WithContext,
  WithOptions,
  WithPayload,
} from '../base/types';

/**
 * Represents the context for executing a query operation.
 * Extends the base context with optional abort signal support.
 *
 * @interface QueryContext
 * @extends {BaseContext}
 *
 * @property {AbortSignal} [signal] - Optional AbortSignal to cancel the query operation.
 */
export interface QueryContext extends BaseContext {
  signal?: AbortSignal;
}

/**
 * Interface for configuring query behavior options.
 */
export interface QueryOptions extends BaseOptions {
  throttle?: boolean | { interval?: DurationUnit; rate?: number };
  retry?:
    | boolean
    | {
        maxAttempts?: number;
        delay?: DurationUnit;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shouldNotRetryErrors?: any[];
      };
  timeout?: boolean | DurationUnit;
}

/**
 * Represents an input structure for a query operation.
 *
 * @template Name - The type parameter for the query name, extends string
 * @template Payload - The type parameter for the query payload, defaults to unknown
 * @template Options - The type parameter for query options, extends QueryOptions
 * @template Context - The type parameter for query context, extends QueryContext
 *
 * @extends {BaseMessage<Name>}
 * @extends {WithPayload<Payload>}
 * @extends {WithOptions<Options>}
 * @extends {WithContext<Context>}
 */
export interface QueryInput<
  Name extends string = string,
  Payload = unknown,
  Options extends QueryOptions = QueryOptions,
  Context extends QueryContext = QueryContext
> extends BaseMessage<Name>,
    WithPayload<Payload>,
    WithOptions<Options>,
    WithContext<Context> {}

export type QueryOutput<Data = unknown> = Data;

/**
 * Represents a Query interface for handling input and output types in a CQRS pattern.
 *
 * @template Input - The type of input data extending QueryInput
 * @template Output - The type of output data extending QueryOutput
 *
 * @interface Query
 * @property {Input} input - The input data for the query
 * @property {Output} output - The output data returned by the query
 */
export interface Query<
  Input extends QueryInput = QueryInput,
  Output extends QueryOutput = QueryOutput
> {
  input: Input;
  output: Output;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface QueriesRegistry extends BaseRegistry<Query> {}
