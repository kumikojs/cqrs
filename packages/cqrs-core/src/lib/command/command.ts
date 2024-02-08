/* eslint-disable @typescript-eslint/no-explicit-any */
import { Nullable } from '../internal/types';

export type CommandName = string;

export interface CommandContract<TPayload = any, TOptions = unknown> {
  commandName: CommandName;
  payload?: Nullable<TPayload>;
  options?: Nullable<TOptions>;
}
