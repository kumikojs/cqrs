/* eslint-disable @typescript-eslint/no-explicit-any */
import { Nullable } from '../internal/types';

export type CommandName = string;

type Context = {
  abortController?: AbortController;
} & Record<string, any>;

export interface CommandContract<TPayload = any, TOptions = unknown> {
  commandName: CommandName;
  payload?: Nullable<TPayload>;
  options?: Nullable<TOptions>; // options are used for command metadata and can be used to select the interceptor
  context?: Nullable<Context>; // context is used to pass additional data to the command handler
}
