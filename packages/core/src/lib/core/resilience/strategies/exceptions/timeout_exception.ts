/**
 * A custom exception thrown when a task execution exceeds the configured timeout.
 */
export class TimeoutException extends Error {
  public constructor(timeout: number) {
    super(`Task execution exceeded timeout of ${timeout}ms`);
  }
}
