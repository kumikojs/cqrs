import type { CommandOptions } from './command_types';

/**
 * Interface defining the structure of a command.
 * Represents an instruction for performing a "write" operation that modifies application state or triggers actions with side effects.
 *
 * @template TName - The unique name of the command, typically a string literal.
 * @template TPayload - The optional payload data associated with the command.
 * @template TOptions - The optional configuration options for the command, extending the generic {@link CommandOptions} interface.
 * @example
 * ```typescript
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
   * The unique name of the command that serves as an identifier.
   */
  commandName: TName;

  /**
   * The optional payload data associated with the command, providing additional information or arguments for its execution.
   */
  payload?: TPayload;

  /**
   * The optional configuration options for the command. Can extend the generic {@link CommandOptions} interface for custom configurations.
   */
  options?: TOptions & CommandOptions & Record<string, unknown>;
}

/**
 * Interface defining the contract for a command handler.
 * Represents a function or class responsible for executing a specific command type.
 *
 * @template TCommand - The type of command the handler accepts, extending the {@link CommandContract} interface.
 * @template TResponse - The optional return type of the command execution, indicating any result or output. * @example
 * ```typescript
 * import type { CommandContract, CommandHandlerContract } from '@stoik/cqrs-core';
 *
 * type CreateUserCommand = CommandContract<'user.create', { name: string; }>;
 * type UpdateUserCommand = CommandContract<'user.update', { id: number; name: string; }>;
 *
 * // Function-based handler
 * const createUserHandler: CommandHandlerContract<CreateUserCommand> = {
 *   async execute(command) {
 *     console.log('User created:', command.payload.name);
 *   },
 * };
 *
 * // Class-based handler
 * class UpdateUserHandler implements CommandHandlerContract<UpdateUserCommand, boolean> {
 *   async execute(command) {
 *     console.log('User updated:', command.payload.name);
 *     return true; // Example of returning a value
 *   }
 * }
 * ```
 */
export interface CommandHandlerContract<
  TCommand extends CommandContract = CommandContract,
  TResponse = void,
  TContext = unknown
> {
  /**
   * Executes the given command.
   *
   * @param command - The command to execute.
   * @returns A promise resolving to the result of the command execution.
   * As commands typically modify application state or trigger actions, the return type is often `void`.
   */
  execute(command: TCommand, context: TContext): Promise<TResponse>;
}
