import type { PromiseAnyFunction } from '../internal/types';
import { Strategy } from './internal/strategy';

export type BulkheadOptions = {
  /**
   * The maximum number of concurrent tasks that can be executed.
   * @default 3
   */
  maxConcurrent: number;

  /**
   * The maximum number of tasks that can be queued.
   * @default 3
   */
  maxQueue: number;
};

export class BulkheadStrategy extends Strategy<BulkheadOptions> {
  static #defaultOptions: BulkheadOptions = {
    maxConcurrent: 3,
    maxQueue: 3,
  };

  #active = 0;
  #queue: PromiseAnyFunction[] = [];

  constructor(options?: Partial<BulkheadOptions>) {
    super({
      ...BulkheadStrategy.#defaultOptions,
      ...options,
    });
  }

  public async execute<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    if (this.#executionSlot() > 0) {
      this.#active++;
      return this.#executeTask(request, task);
    }

    if (this.#queueSlot() > 0) {
      return this.#queueTask(request, task);
    }

    throw new Error(
      `Bulkhead is full with ${this.#active} active and ${
        this.#queue.length
      } queued`
    );
  }

  async #executeTask<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    try {
      return await task(request);
    } finally {
      this.#active--;
      this.#dequeueTask();
    }
  }

  #queueTask<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    return new Promise((resolve, reject) => {
      this.#queue.push(() => task(request).then(resolve, reject));
      this.#dequeueTask();
    });
  }

  #dequeueTask() {
    if (this.#queue.length === 0 || this.#executionSlot() === 0) {
      return;
    }

    const task = this.#queue.shift();
    this.#active++;

    if (task) {
      task().finally(() => {
        this.#active--;
        this.#dequeueTask();
      });
    }
  }

  #executionSlot(): number {
    return this.options.maxConcurrent - this.#active;
  }

  #queueSlot(): number {
    return this.options.maxQueue - this.#queue.length;
  }
}
