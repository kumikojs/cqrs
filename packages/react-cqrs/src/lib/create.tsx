/* eslint-disable @typescript-eslint/no-explicit-any */

import { Stoik } from '@stoik/cqrs-core';
import { useBaseCommand } from './useBaseCommand';
import { useBaseEvent } from './useBaseEvent';
import { useBaseQuery } from './useBaseQuery';

import type {
  BaseModule,
  Combined,
  CommandHandlerContract,
  ComputeCommands,
  ComputeEvents,
  ComputeQueries,
  EventHandlerContract,
  ExtractQueryResponse,
  InferredCommands,
  QueryHandlerContract,
} from '@stoik/cqrs-core';

/**
 * Creates a CQRS (Command Query Responsibility Segregation) instance.
 * @returns An object containing methods to interact with the CQRS instance.
 */
export function create<Modules extends BaseModule[] = BaseModule[]>() {
  type KnownCommands = ComputeCommands<Combined<Modules>>;
  type KnownQueries = ComputeQueries<Combined<Modules>>;
  type KnownEvents = ComputeEvents<Combined<Modules>>;

  const client = new Stoik<Modules>();

  return {
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
      handler?: CommandHandlerContract<
        Extract<
          KnownCommands[keyof KnownCommands],
          { commandName: TCommand['commandName'] }
        >
      >['execute']
      // TODO: Fix the type of the handler
    ) => useBaseCommand(client, command, handler as any),

    /**
     * Hook to execute a query.
     * @param query - The query to execute.
     * @param handler - Optional handler function to execute the query.
     * @returns The result of executing the query.
     */
    useQuery: <TQuery extends KnownQueries[keyof KnownQueries]['query']>(
      query: TQuery,
      handler?: QueryHandlerContract<
        TQuery,
        ExtractQueryResponse<TQuery['queryName'], KnownQueries>
      >['execute']
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
      handler:
        | EventHandlerContract<TEvent>['handle']
        | EventHandlerContract<TEvent>
    ) => useBaseEvent(client, eventName, handler),
  };
}
