import type { PromiseAnyFunction } from '../../internal/types';

export abstract class Strategy<TOptions> {
  protected options: TOptions;

  public constructor(options: TOptions) {
    this.options = options;
  }

  public abstract execute<
    TRequest,
    TTask extends PromiseAnyFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult>;
}
