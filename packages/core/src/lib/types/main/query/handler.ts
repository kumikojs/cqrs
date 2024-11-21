import type { Query, QueryContext } from './types';

export interface QueryHandlerContract<T extends Query> {
  execute(input: T['input'], context: QueryContext): Promise<T['output']>;
}

export type QueryHandlerFn<T extends Query> = (
  input: T['input'],
  context: QueryContext
) => Promise<T['output']>;

export type QueryHandler<T extends Query> =
  | QueryHandlerContract<T>
  | QueryHandlerFn<T>;
