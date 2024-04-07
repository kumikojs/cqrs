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
    useCommand: (
      command: InferredCommands<
        KnownCommands,
        KnownQueries
      >[keyof InferredCommands<KnownCommands, KnownQueries>],
      handler?: CommandHandlerContract<
        InferredCommands<KnownCommands, KnownQueries>[keyof InferredCommands<
          KnownCommands,
          KnownQueries
        >]
      >['execute']
    ) =>
      useBaseCommand<
        InferredCommands<KnownCommands, KnownQueries>[keyof InferredCommands<
          KnownCommands,
          KnownQueries
        >]
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
