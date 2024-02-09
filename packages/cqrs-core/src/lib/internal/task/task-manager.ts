/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TaskManagerContract<TContext, TTask> {
  execute<TResult>(context: TContext, task: TTask): Promise<TResult>;
}

export class TaskManager<
  TContext,
  TTask extends (context: TContext) => Promise<any>
> implements TaskManagerContract<TContext, TTask>
{
  private pendingTasks: Map<string, Promise<any>> = new Map();

  async execute<TResult>(context: TContext, task: TTask): Promise<TResult> {
    const taskKey = this.#serialize(context);

    if (this.pendingTasks.has(taskKey)) {
      return this.pendingTasks.get(taskKey);
    }

    const taskPromise = task(context);

    this.pendingTasks.set(taskKey, taskPromise);

    try {
      return await taskPromise;
    } finally {
      this.pendingTasks.delete(taskKey);
    }
  }

  #serialize(context: TContext): string {
    return JSON.stringify(context);
  }
}
