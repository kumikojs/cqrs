import { useBaseEvent } from './useBaseEvent';
import { useBaseCommand } from './useBaseCommand';
import { useBaseQuery } from './useBaseQuery';
import { Client } from '@stoik/cqrs-core';

import type {
  InferCommandContract,
  ClientContract,
  ClientOptions,
  CommandContract,
  CommandHandlerContract,
  EventContract,
  EventHandlerFn,
  QueryContract,
  QueryHandlerContract,
} from '@stoik/cqrs-core';

type InferredCommands<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> = {
  [CommandName in KnownCommands[keyof KnownCommands]['commandName']]: InferCommandContract<
    CommandName,
    KnownCommands[CommandName]['payload'],
    KnownCommands[CommandName]['options'],
    KnownQueries[keyof KnownQueries]['queryName'][]
  >;
};

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
>(options?: ClientOptions) {
  const client = new Client<KnownCommands, KnownQueries, KnownEvents>(options);

  return {
    client,
    useCommand: <
      TCommand extends InferredCommands<
        KnownCommands,
        KnownQueries
      >[keyof InferredCommands<KnownCommands, KnownQueries>],
      TResponse = void
    >(
      command: TCommand,
      handler?: CommandHandlerContract<TCommand, TResponse>['execute']
    ) => useBaseCommand(client, command, handler),

    useQuery: <TResponse,>(
      query: KnownQueries[keyof KnownQueries],
      handler?: QueryHandlerContract<
        KnownQueries[keyof KnownQueries],
        TResponse
      >['execute']
    ) => useBaseQuery(client, query, handler),

    useEvent: <TEvent extends KnownEvents[keyof KnownEvents]>(
      eventName: TEvent['eventName'],
      handler: EventHandlerFn<TEvent>
    ) => useBaseEvent(client, eventName, handler),
  };
}
