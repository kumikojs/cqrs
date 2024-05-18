import type { AsyncFunction } from '../../../types/main';

/**
 * The fundamental building block for defining task execution strategies.
 * This abstract class serves as the foundation for all concrete strategy implementations.
 *
 * @template TOptions - The type representing the options configurable for the strategy.
 */
export abstract class Strategy<TOptions> {
  /**
   * Options that govern the behavior and execution details of the strategy.
   * @protected
   */
  protected options: TOptions;

  /**
   * Constructs a new `Strategy` instance, initializing it with the provided options.
   *
   * @param options - The options to configure the strategy's behavior.
   */
  constructor(options: TOptions) {
    this.options = options;
  }

  /**
   * The core method responsible for executing a task using the defined strategy.
   *
   * @template TRequest - The type of the request data used for task execution.
   * @template TTask - The type of the task to be executed, constrained to be an asynchronous function.
   * @template TResult - The type representing the expected result of the task execution.
   *                   Defaults to the return type inferred from the `TTask` type.
   *
   * @param request - The request data to be passed to the task during execution.
   * @param task - The asynchronous function representing the actual task to be executed.
   * @returns A promise that resolves with the result of the task execution.
   *
   * @abstract This method must be implemented by concrete strategy subclasses to provide their specific execution logic.
   */
  abstract execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult>;
}
