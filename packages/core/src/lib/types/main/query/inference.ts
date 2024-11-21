import type { MakeOptional, PayloadRequirement } from '../base/helper';
import type {
  QueriesRegistry,
  Query,
  QueryContext,
  QueryInput,
  QueryOptions,
} from './types';

type WithRequiredSignal<T extends QueryContext> = Omit<T, 'signal'> & {
  signal: NonNullable<T['signal']>;
};

type EnrichedQueryOptions<T extends Query> = QueryOptions &
  T['input']['options'] & {
    fallback?: (input: T['input'], error: unknown) => T['output'];
  };

type ConditionalOptions<T extends Query> =
  T['input']['options'] extends undefined
    ? { options?: EnrichedQueryOptions<T> }
    : MakeOptional<T['input']['options']> extends true
    ? { options?: EnrichedQueryOptions<T> }
    : { options: EnrichedQueryOptions<T> };

type InferQueryPayload<Q extends Query> = Q['input'] extends QueryInput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  infer P
>
  ? PayloadRequirement<P> extends 'never'
    ? { payload?: never }
    : PayloadRequirement<P> extends 'optional'
    ? { payload?: P }
    : { payload: P }
  : never;

export type DispatchQueryInput<
  T extends Query,
  Registry extends QueriesRegistry
> = T['input'] extends QueryInput<
  infer Name,
  infer Payload,
  infer Options,
  infer Context
>
  ? Name extends keyof Registry
    ? Omit<QueryInput<Name, Payload, Options, Context>, 'payload' | 'options'> &
        InferQueryPayload<Registry[Name]> &
        ConditionalOptions<Registry[Name]>
    : Omit<
        QueryInput<T['input']['name'], Payload, Options, Context>,
        'payload' | 'options'
      > &
        InferQueryPayload<T> &
        ConditionalOptions<T>
  : never;

export type HandlerQueryInput<
  T extends Query,
  Registry extends QueriesRegistry
> = T['input'] extends QueryInput<
  infer Name,
  infer Payload,
  infer Options,
  infer Context extends QueryContext
>
  ? Name extends keyof Registry
    ? Omit<
        QueryInput<Name, Payload, Options, Context>,
        'payload' | 'options' | 'context'
      > &
        InferQueryPayload<Registry[Name]> & {
          context: Required<WithRequiredSignal<Context>>;
        }
    : Omit<
        QueryInput<T['input']['name'], Payload, Options, Context>,
        'payload' | 'options' | 'context'
      > &
        InferQueryPayload<T> & {
          context: Required<WithRequiredSignal<Context>>;
        }
  : never;
