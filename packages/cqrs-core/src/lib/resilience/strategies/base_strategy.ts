import type { AsyncFunction } from '../../types';

/**
 * The base strategy.
 * This is the base class for all strategies.
 *
 * @template TOptions - The strategy options.
 */
export abstract class Strategy<TOptions> {
  /**
   * The options for the strategy.
   */
  protected options: TOptions;

  public constructor(options: TOptions) {
    this.options = options;
  }

  /**
   * Execute the task.
   *
   * @template TRequest - The type of request.
   * @template TTask - The type of task.
   * @template TResult - The type of result.
   * @param {TRequest} request - The request to execute the task with.
   * @param {TTask} task - The task to execute.
   * @returns {Promise<TResult>} The result of the task.
   */
  public abstract execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult>;
}
