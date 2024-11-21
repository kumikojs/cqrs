import type { OptionsRequirement, PayloadRequirement } from '../base/helper';
import type { EmitterContract } from '../event/emitter';
import type { EventsRegistry } from '../event/types';
import type { QueriesRegistry } from '../query/types';
import type { CommandCacheContract } from './command_cache';
import type {
  Command,
  CommandContext,
  CommandOptions,
  CommandsRegistry,
} from './types';

type WithRequiredContext<
  C extends CommandContext,
  QR extends QueriesRegistry,
  ER extends EventsRegistry
> = Omit<C, 'cache' | 'emit'> & {
  cache: CommandCacheContract<QR>;
  emit: EmitterContract<ER>['emit'];
};

type EnrichedCommandOptions<
  C extends Command,
  QR extends QueriesRegistry
> = CommandOptions &
  C['options'] & {
    invalidation?: {
      queries: (keyof QR)[];
    };
    onMutate?: (ctx: { cache: CommandCacheContract<QR> }) => void;
    fallback?: (command: C, error: unknown) => void;
  };

type ConditionalOptions<
  C extends Command,
  QR extends QueriesRegistry
> = OptionsRequirement<C> extends 'required'
  ? { options: EnrichedCommandOptions<C, QR> }
  : { options?: EnrichedCommandOptions<C, QR> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InferCommandPayload<C extends Command> = C extends Command<any, infer P>
  ? PayloadRequirement<P> extends 'never'
    ? { payload?: never }
    : PayloadRequirement<P> extends 'optional'
    ? { payload?: P }
    : { payload: P }
  : never;

export type HandlerCommand<
  C extends Command,
  Registry extends CommandsRegistry,
  QR extends QueriesRegistry = QueriesRegistry,
  ER extends EventsRegistry = EventsRegistry
> = C extends Command<infer Name, infer Payload, infer Options, infer Ctx>
  ? Name extends keyof Registry
    ? Omit<
        Command<Name, Payload, Options, Ctx>,
        'payload' | 'options' | 'context'
      > &
        InferCommandPayload<Registry[Name]> & {
          context: Required<WithRequiredContext<Ctx, QR, ER>>;
        }
    : Omit<
        Command<C['name'], Payload, Options, Ctx>,
        'payload' | 'options' | 'context'
      > &
        InferCommandPayload<C> & {
          context: Required<WithRequiredContext<Ctx, QR, ER>>;
        }
  : never;

export type DispatchCommand<
  C extends Command,
  Registry extends CommandsRegistry,
  QR extends QueriesRegistry = QueriesRegistry
> = C extends Command<infer Name, infer Payload, infer Options>
  ? Name extends keyof Registry
    ? Omit<Command<Name, Payload, Options>, 'payload' | 'options' | 'context'> &
        InferCommandPayload<Registry[Name]> &
        ConditionalOptions<Registry[Name], QR>
    : Omit<
        Command<C['name'], Payload, Options>,
        'payload' | 'options' | 'context'
      > &
        InferCommandPayload<C> &
        ConditionalOptions<C, QR>
  : never;
