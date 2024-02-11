/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TaskManagerContract<TRequest, TTask> {
  execute<TResult>(request: TRequest, task: TTask): Promise<TResult>;
}

export abstract class TaskManager<
  TRequest,
  TTask extends (request: TRequest) => Promise<any>
> implements TaskManagerContract<TRequest, TTask>
{
  private pendingTasks: Map<string, Promise<any>> = new Map();

  async execute<TResult>(request: TRequest, task: TTask): Promise<TResult> {
    const taskKey = this.serialize(request);

    if (this.pendingTasks.has(taskKey)) {
      return this.pendingTasks.get(taskKey);
    }

    const taskPromise = task(request);

    this.pendingTasks.set(taskKey, taskPromise);

    try {
      return await taskPromise;
    } finally {
      this.pendingTasks.delete(taskKey);
    }
  }

  protected abstract serialize(request: TRequest): string;
}
