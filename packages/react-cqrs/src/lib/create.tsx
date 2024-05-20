/* eslint-disable @typescript-eslint/no-explicit-any */
import { Stoik } from '@stoik/cqrs-core';

import { useBaseCommand } from './useBaseCommand';
import { useBaseEvent } from './useBaseEvent';
import { useBaseQuery } from './useBaseQuery';

import type {
  BaseModule,
  ClientOptions,
  Combined,
  CommandHandlerOrFunction,
  EventHandlerOrFunction,
  ExtractCommands,
  ExtractEvents,
  ExtractQueries,
  ExtractQueryResponse,
  InferredCommands,
  QueryHandlerFunction,
} from '@stoik/cqrs-core/types';

/**
 * Creates a CQRS (Command Query Responsibility Segregation) instance.
 * @returns An object containing methods to interact with the CQRS instance.
 */
export function create<Modules extends BaseModule[] = BaseModule[]>(
  options?: ClientOptions
) {
  type KnownCommands = ExtractCommands<Combined<Modules>>;
  type KnownQueries = ExtractQueries<Combined<Modules>>;
  type KnownEvents = ExtractEvents<Combined<Modules>>;

  const client = new Stoik<Modules>(options);

  return {
    stoik: client,
    /**
     * Hook to execute a command.
     * @param command - The command to execute.
     * @param handler - Optional handler function to execute the command.
     * @returns The result of executing the command.
     */
    useCommand: <
      TCommand extends InferredCommands<
        KnownCommands,
        KnownQueries
      >[keyof InferredCommands<KnownCommands, KnownQueries>]
    >(
      command: TCommand,
      handler?: CommandHandlerOrFunction<
        Extract<
          KnownCommands[keyof KnownCommands],
          { commandName: TCommand['commandName'] }
        >
      >
    ) => useBaseCommand<TCommand>(client, command, handler),

    /**
     * Hook to execute a query.
     * @param query - The query to execute.
     * @param handler - Optional handler function to execute the query.
     * @returns The result of executing the query.
     */
    useQuery: <TQuery extends KnownQueries[keyof KnownQueries]['query']>(
      query: TQuery,
      handler?: QueryHandlerFunction<
        TQuery,
        ExtractQueryResponse<TQuery['queryName'], KnownQueries>
      >
    ) =>
      useBaseQuery<
        TQuery,
        ExtractQueryResponse<TQuery['queryName'], KnownQueries>
      >(client, query, handler),

    /**
     * Hook to handle an event.
     * @param eventName - The name of the event to handle.
     * @param handler - The handler function or object to handle the event.
     */
    useEvent: <TEvent extends KnownEvents[keyof KnownEvents]>(
      eventName: TEvent['eventName'],
      handler: EventHandlerOrFunction<TEvent>
    ) => useBaseEvent(client, eventName, handler),
  };
}
