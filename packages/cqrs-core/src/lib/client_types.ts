import type { CommandContract } from './command/command_contracts';
import type { EventContract } from './event/event_contracts';
import type { BaseQueries } from './query/query_types';
import type { UnionToIntersection } from './types';

/**
 * **BaseModule**
 *
 * This type represents the base module type.
 */
export type BaseModule = {
  commands?: Record<string, CommandContract>;
  queries?: BaseQueries;
  events?: Record<string, EventContract>;
};

/**
 * **Module<T>**
 *
 * This type represents a module of type `T`.
 *
 * @template T - The module type to represent.
 * @returns The module type `T`.
 */
export type Module<T extends BaseModule> = T;

/**
 * **Combined<T>**
 *
 * This type combines the module types in the provided array `T`.
 *
 * @template T - The array of module types to combine.
 * @returns The combined module types.
 */
export type Combined<T extends BaseModule[]> = UnionToIntersection<T[number]>;

/**
 * **ComputeCommands<T>**
 *
 * This type computes the command contracts from a module type `T`.
 *
 * @template T - The module type from which to extract the command contracts.
 * @returns The command contracts extracted from the module type `T`.
 */
export type ComputeCommands<T> = T extends {
  commands: infer U extends Record<string, CommandContract>;
}
  ? U
  : Record<string, CommandContract>;

export type ComputeQueries<T> = T extends {
  queries: infer U extends BaseQueries;
}
  ? U
  : BaseQueries;

type ExtractResponse<T> = T extends { response: infer R } ? R : never;

export type ComputeQueryResponses<T> = {
  [K in keyof T]: ExtractResponse<T[K]>;
};

type ExtractQuery<T> = T extends { query: infer Q } ? Q : never;

export type ComputeQueryContracts<T> = {
  [K in keyof T]: ExtractQuery<T[K]>;
};

/**
 * **ComputeEvents<T>**
 *
 * This type computes the event contracts from a module type `T`.
 *
 * @template T - The module type from which to extract the event contracts.
 * @returns The event contracts extracted from the module type `T`.
 */
export type ComputeEvents<T> = T extends {
  events: infer U extends Record<string, EventContract>;
}
  ? U
  : Record<string, EventContract>;
