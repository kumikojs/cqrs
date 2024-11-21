import type { DurationUnit } from '../../../utilities/ms/types';
import type {
  BaseContext,
  BaseMessage,
  BaseOptions,
  BaseRegistry,
  WithContext,
  WithOptions,
  WithPayload,
} from '../base/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CommandContext extends BaseContext {}

export interface CommandOptions extends BaseOptions {
  throttle?:
    | boolean
    | {
        interval?: DurationUnit;
        rate?: number;
      };
  retry?:
    | boolean
    | {
        maxAttempts?: number;
        delay?: DurationUnit;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shouldNotRetryErrors?: any[];
      };
  timeout?: boolean | DurationUnit;
}

export interface Command<
  Name extends string = string,
  Payload = unknown,
  Options extends CommandOptions = CommandOptions,
  Context extends CommandContext = CommandContext
> extends BaseMessage<Name>,
    WithPayload<Payload>,
    WithOptions<Options>,
    WithContext<Context> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CommandsRegistry extends BaseRegistry<Command> {}
