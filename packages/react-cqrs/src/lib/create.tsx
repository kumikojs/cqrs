import { Client } from '@stoik/cqrs-core';
import { useBaseCommand } from './useBaseCommand';
import { useBaseEvent } from './useBaseEvent';
import { useBaseQuery } from './useBaseQuery';

import type {
  CommandContract,
  CommandHandlerContract,
  EventContract,
  EventHandlerContract,
  InferredCommands,
  QueryContract,
  QueryHandlerContract,
} from '@stoik/cqrs-core';

export function create<
  KnownCommands extends Record<string, CommandContract> = Record<
    string,
    CommandContract
  >,
  KnownQueries extends Record<string, QueryContract> = Record<
    string,
    QueryContract
  >,
  KnownEvents extends Record<string, EventContract> = Record<
    string,
    EventContract
  >
>() {
  const client = new Client<KnownCommands, KnownQueries, KnownEvents>();

  return {
    client,
    useCommand: <TResponse = void,>(
      command: InferredCommands<
        KnownCommands,
        KnownQueries
      >[keyof InferredCommands<KnownCommands, KnownQueries>],
      handler?: CommandHandlerContract<
        InferredCommands<KnownCommands, KnownQueries>[keyof InferredCommands<
          KnownCommands,
          KnownQueries
        >],
        TResponse
      >['execute']
    ) =>
      useBaseCommand<
        InferredCommands<KnownCommands, KnownQueries>[keyof InferredCommands<
          KnownCommands,
          KnownQueries
        >],
        TResponse
      >(client, command, handler),

    useQuery: <TResponse,>(
      query: KnownQueries[keyof KnownQueries],
      handler?: QueryHandlerContract<
        KnownQueries[keyof KnownQueries],
        TResponse
      >['execute']
    ) =>
      useBaseQuery<KnownQueries[keyof KnownQueries], TResponse>(
        client,
        query,
        handler
      ),

    useEvent: <TEvent extends KnownEvents[keyof KnownEvents]>(
      eventName: TEvent['eventName'],
      handler:
        | EventHandlerContract<TEvent>['handle']
        | EventHandlerContract<TEvent>
    ) => useBaseEvent(client, eventName, handler),
  };
}
