/* eslint-disable @typescript-eslint/no-explicit-any */
import { Nullable } from '../internal/types';

export type CommandName = string;

export interface CommandContract<TPayload = any> {
  commandName: CommandName;
  payload?: Nullable<TPayload>;
}
