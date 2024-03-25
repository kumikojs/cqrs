import type { AsyncFunction } from '../../types';

export abstract class Strategy<TOptions> {
  protected options: TOptions;

  public constructor(options: TOptions) {
    this.options = options;
  }

  public abstract execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult>;
}
