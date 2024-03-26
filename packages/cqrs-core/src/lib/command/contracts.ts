/**
 * @module command
 */
import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { QueryContract } from '../query/contracts';
import type { CombinedPartialOptions } from '../types';
import type { CommandOptions, InferredCommands } from './types';

/**
 * Contract for a command.
 *
 * Represents an instruction for performing a "write" operation.
 *
 * @remarks
 * Commands are typically used to modify application state or trigger actions with side effects.
 *
 * @template TName - The name of the command, typically a string literal.
 * @template TPayload - The optional payload data associated with the command.
 * @template TOptions - The optional options for the command, extending {@link CommandOptions}.
 * @example
 * ```ts
 * import type { CommandContract } from '@stoik/cqrs-core';
 *
 * type CreateUserCommand = CommandContract<'user.create', { name: string; }>;
 * ```
 */
export interface CommandContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown
> {
  /**
   * The unique name of the command.
   */
  commandName: TName;

  /**
   * The optional payload data associated with the command.
   */
  payload?: TPayload;

  /**
   * The optional options for the command, extending {@link CommandOptions}.
   */
  options?: TOptions & CommandOptions & Record<string, unknown>;
}

/**
 * Contract for a command handler.
 *
 * Responsible for executing a specific command.
 *
 * @template TCommand - The type of command the handler accepts, extending {@link CommandContract}.
 * @template TReturn - The return type of the command execution.
 * @example
 * ```ts
 * import type { CommandContract, CommandHandlerContract } from '@stoik/cqrs-core';
 *
 * type CreateUserCommand = CommandContract<'user.create', { name: string; }>;
 * type UpdateUserCommand = CommandContract<'user.update', { id: number; name: string; }>;
 *
 * const createUserHandler: CommandHandlerContract<CreateUserCommand> = {
 *    async execute(command) {
 *        console.log('User created:', command.payload.name);
 *    },
 * };
 *
 * class UpdateUserHandler implements CommandHandlerContract<UpdateUserCommand> {
 *    async execute(command) {
 *        console.log('User updated:', command.payload.name);
 *    }
 * }
 * ```
 */
export interface CommandHandlerContract<
  TCommand extends CommandContract = CommandContract,
  TReturn = unknown
> {
  /**
   * Executes the given command.
   *
   * @param command - The command to execute.
   * @returns A promise resolving to the result of the command execution.
   */
  execute(command: TCommand): Promise<TReturn>;
}

/**
 * Contract for a command bus.
 *
 * The central hub for registering and executing commands, facilitating cross-cutting concerns through interceptors.
 *
 * @template KnownCommands - A record of known command types for registration and inference.
 * @template KnownQueries - A record of known query types for inference purposes.
 * @example
 * ```ts
 * import { type CommandContract, CommandBus } from '@stoik/cqrs-core';
 *
 * type CreateUserCommand = CommandContract<'user.create', { name: string; }>;
 * type UpdateUserCommand = CommandContract<'user.update', { id: number; name: string; }>;
 *
 * type KnownCommands = {
 *  'user.create': CreateUserCommand;
 *  'user.update': UpdateUserCommand;
 * };
 * const bus = new CommandBus<KnownCommands>();
 *
 * bus.register('user.create', async (command) => {
 *  console.log('User created:', command);
 * });
 *
 * bus.dispatch({
 *  commandName: 'user.create',
 *  payload: {
 *    name: 'John Doe',
 *  },
 * });
 * ```
 */
export interface CommandBusContract<
  KnownCommands extends Record<string, CommandContract>,
  KnownQueries extends Record<string, QueryContract>
> {
  /**
   * The interceptor manager responsible for managing cross-cutting concerns for commands.
   *
   * @see InterceptorManagerContract - {@link InterceptorManagerContract}
   */
  interceptors: InterceptorManagerContract<
    CommandContract<
      string,
      unknown,
      CombinedPartialOptions<CommandContract, KnownCommands>
    >
  >;

  /**
   * Executes a command using the command bus's interceptor pipeline.
   *
   * @template TCommand - The inferred type of the command to execute.
   * @template TResponse - The expected response type from the command execution.
   * @param command - The command to execute.
   * @param handler? - An optional custom handler for executing the command, overriding registered handlers.
   * @returns A promise resolving to the result of the command execution.
   */
  execute<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(
    command: TCommand,
    handler?: CommandHandlerContract<CommandContract, TResponse>['execute']
  ): Promise<TResponse>;

  /**
   * Registers a command handler to the command bus.
   *
   * @template TCommand - The type of command the handler handles.
   * @param commandName - The name of the command the handler is associated with.
   * @param handler - The command handler to register.
   * @returns An unregistration function to remove the handler from the bus.
   */
  register<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): VoidFunction;

  /**
   * Unregisters a command handler from the command bus.
   *
   * @template TCommand - The type of command the handler handles.
   * @param commandName - The name of the command the handler is associated with.
   * @param handler - The command handler to unregister.
   */
  unregister<TCommand extends KnownCommands[keyof KnownCommands]>(
    commandName: TCommand['commandName'],
    handler:
      | CommandHandlerContract<TCommand>
      | CommandHandlerContract<TCommand>['execute']
  ): void;

  /**
   * Executes a command using the command bus's interceptor pipeline.
   *
   * @template TCommand - The inferred type of the command to execute.
   * @template TResponse - The expected response type from the command execution.
   * @param command - The command to execute.
   * @returns A promise resolving to the result of the command execution.
   */
  dispatch<
    TCommand extends InferredCommands<
      KnownCommands,
      KnownQueries
    >[keyof InferredCommands<KnownCommands, KnownQueries>],
    TResponse = void
  >(
    command: TCommand
  ): Promise<TResponse>;
}
