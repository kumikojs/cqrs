/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kumiko } from '@kumiko/core';

import { useBaseCommand } from './useBaseCommand';
import { useBaseEvent } from './useBaseEvent';
import { useBaseQuery } from './useBaseQuery';

import type {
  FeatureSchema,
  ClientOptions,
  MergedFeatureSchema,
  Command,
  CommandHandlerOrFunction,
  EventHandlerOrFunction,
  ExtractCommands,
  ExtractEvents,
  ExtractQueries,
  ExtractQueryRequest,
  ExtractQueryResponse,
  InferredCommand,
  QueryHandlerOrFunction,
} from '@kumiko/core/types';

/**
 * Creates a CQRS (Command Query Responsibility Segregation) instance.
 * @returns An object containing methods to interact with the CQRS instance.
 */
export function create<Modules extends FeatureSchema[] = FeatureSchema[]>(
  options: ClientOptions
) {
  type KnownCommands = ExtractCommands<MergedFeatureSchema<Modules>>;
  type KnownQueries = ExtractQueries<MergedFeatureSchema<Modules>>;
  type KnownEvents = ExtractEvents<MergedFeatureSchema<Modules>>;

  const client = new Kumiko<Modules>(options);

  function useCommand<
    TCommand extends InferredCommand<
      KnownCommands[keyof KnownCommands]['commandName'],
      KnownCommands,
      KnownQueries
    > = InferredCommand<
      KnownCommands[keyof KnownCommands]['commandName'],
      KnownCommands,
      KnownQueries
    >
  >(
    command: TCommand,
    handler?: CommandHandlerOrFunction<TCommand>
  ): ReturnType<typeof useBaseCommand<TCommand>>;

  function useCommand<TCommand extends Command>(
    command: InferredCommand<
      TCommand['commandName'],
      KnownCommands,
      KnownQueries,
      TCommand
    >,
    handler?: CommandHandlerOrFunction<
      InferredCommand<
        TCommand['commandName'],
        KnownCommands,
        KnownQueries,
        TCommand
      >
    >
  ) {
    return useBaseCommand<
      InferredCommand<
        TCommand['commandName'],
        KnownCommands,
        KnownQueries,
        TCommand
      >
    >(client, command, handler);
  }

  return {
    kumiko: client,

    /**
     * Hook to execute a command.
     * @param command - The command to execute.
     * @param handler - Optional handler function to execute the command.
     * @returns The result of executing the command.
     */
    useCommand,

    /**
     * Hook to execute a query.
     * @param query - The query to execute.
     * @param handler - Optional handler function to execute the query.
     * @returns The result of executing the query.
     */
    useQuery: <TQuery extends KnownQueries[keyof KnownQueries]['query']>(
      query: TQuery,
      handler?: QueryHandlerOrFunction<
        ExtractQueryRequest<TQuery['queryName'], KnownQueries>,
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
