/**
 * A custom exception thrown when a task execution exceeds the configured timeout.
 */
export class TimeoutException extends Error {
  public constructor(timeout: number) {
    super(`Task timed out after ${timeout}ms`);
  }
}
