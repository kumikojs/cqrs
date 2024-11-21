import type { QueryHandler } from './handler';
import type { DispatchQueryInput, HandlerQueryInput } from './inference';
import type { QueriesRegistry, Query } from './types';

export interface QueryBusContract<
  Registry extends QueriesRegistry = QueriesRegistry
> {
  dispatch<Name extends keyof Registry & string>(
    input: DispatchQueryInput<Registry[Name], Registry> & { name: Name }
  ): Promise<Registry[Name]['output']>;

  dispatch<T extends Query = Registry[keyof Registry]>(
    input: DispatchQueryInput<T, Registry>
  ): Promise<T['output']>;

  execute<Name extends keyof Registry & string>(
    input: DispatchQueryInput<Registry[Name], Registry> & { name: Name },
    handler: QueryHandler<{
      input: HandlerQueryInput<Registry[Name], Registry>;
      output: Registry[Name]['output'];
    }>
  ): Promise<Registry[Name]['output']>;

  execute<T extends Query = Registry[keyof Registry]>(
    input: DispatchQueryInput<T, Registry>,
    handler: QueryHandler<{
      input: HandlerQueryInput<T, Registry>;
      output: T['output'];
    }>
  ): Promise<T['output']>;

  register<Name extends keyof Registry & string>(
    name: Name,
    handler: QueryHandler<{
      input: HandlerQueryInput<Registry[Name], Registry>;
      output: Registry[Name]['output'];
    }>
  ): VoidFunction;

  register<T extends Query = Registry[keyof Registry]>(
    name: T['input']['name'],
    handler: QueryHandler<{
      input: HandlerQueryInput<T, Registry>;
      output: T['output'];
    }>
  ): VoidFunction;

  unregister<Name extends keyof Registry & string>(
    name: Name,
    handler: QueryHandler<{
      input: HandlerQueryInput<Registry[Name], Registry>;
      output: Registry[Name]['output'];
    }>
  ): void;

  unregister<T extends Query = Registry[keyof Registry]>(
    name: T['input']['name'],
    handler: QueryHandler<{
      input: HandlerQueryInput<T, Registry>;
      output: T['output'];
    }>
  ): void;

  cancelQuery<Name extends keyof Registry & string>(name: Name): void;
  cancelQuery<T extends Query = Registry[keyof Registry]>(
    name: T['input']['name']
  ): void;

  disconnect(): void;
}
