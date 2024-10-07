import { KumikoClient } from '@kumiko/core';
import { useBaseCommand } from './useBaseCommand';

import type {
  Command,
  CommandExecutorFunction,
  CommandForExecution,
  CommandHandlerWithContext,
  CommandWithoutPayload,
  ExtractCommandByName,
  ExtractCommands,
  ExtractEvents,
  ExtractFunction,
  ExtractQueries,
  Feature,
  FeatureToSchema,
  InferCommand,
  MergedFeatureSchema,
} from '@kumiko/core/types';

export function useCommand<
  FeatureList extends Feature[] = Feature[],
  FeatureSchemaList extends FeatureToSchema<
    FeatureList[number]
  >[] = FeatureToSchema<FeatureList[number]>[]
>(client: KumikoClient<FeatureList>) {
  type KnownCommands = ExtractCommands<MergedFeatureSchema<FeatureSchemaList>>;
  type KnownQueries = ExtractQueries<MergedFeatureSchema<FeatureSchemaList>>;
  type KnownEvents = ExtractEvents<MergedFeatureSchema<FeatureSchemaList>>;

  function useCommand<CommandName extends keyof KnownCommands & string>(
    command: CommandWithoutPayload<CommandName, KnownCommands, KnownQueries>,
    handler: CommandHandlerWithContext<
      ExtractCommandByName<KnownCommands, CommandName>,
      KnownQueries,
      KnownEvents
    >
  ): ReturnType<
    typeof useBaseCommand<ExtractCommandByName<KnownCommands, CommandName>>
  >;
  function useCommand<CommandType extends Command>(
    command: Omit<
      CommandForExecution<CommandType, KnownCommands, KnownQueries>,
      'payload'
    >,
    handler?: ExtractFunction<
      CommandHandlerWithContext<
        InferCommand<CommandType, KnownCommands>,
        KnownQueries,
        KnownEvents
      >
    >
  ): ReturnType<typeof useBaseCommand<CommandType>>;

  function useCommand<CommandType extends Command>(
    command: Omit<
      CommandForExecution<CommandType, KnownCommands, KnownQueries>,
      'payload'
    >,
    handler?: CommandHandlerWithContext<CommandType, KnownQueries, KnownEvents>
  ) {
    return useBaseCommand(client, command, handler as CommandExecutorFunction);
  }

  return useCommand;
}
