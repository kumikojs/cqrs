/* eslint-disable @typescript-eslint/no-explicit-any */
import { Nullable } from '../internal/types';

export interface CommandContract<TPayload = any> {
  commandName: string;
  payload?: Nullable<TPayload>;
}
