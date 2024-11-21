import type { BaseMessage, BaseRegistry } from './types';

export type ExtractByName<
  Registry extends BaseRegistry<BaseMessage>,
  Name extends string
> = Extract<Registry[keyof Registry], { name: Name }>;

export type InferMessage<
  Message extends BaseMessage,
  Registry extends BaseRegistry<BaseMessage>
> = Message extends BaseMessage<infer Name>
  ? Name extends keyof Registry
    ? Registry[Name]
    : Message
  : never;
