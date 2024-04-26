/* eslint-disable @typescript-eslint/no-explicit-any */

import { Client } from '@stoik/cqrs-core';
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

export function create<Modules extends BaseModule[] = BaseModule[]>() {
  type KnownCommands = ComputeCommands<Combined<Modules>>;
  type KnownQueries = ComputeQueries<Combined<Modules>>;
  type KnownEvents = ComputeEvents<Combined<Modules>>;

  const client = new Client<Modules>();

  return {
    client,
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

    useEvent: <TEvent extends KnownEvents[keyof KnownEvents]>(
      eventName: TEvent['eventName'],
      handler:
        | EventHandlerContract<TEvent>['handle']
        | EventHandlerContract<TEvent>
    ) => useBaseEvent(client, eventName, handler),
  };
}
