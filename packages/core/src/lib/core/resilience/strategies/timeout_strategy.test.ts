import { describe, it, expect, vi } from 'vitest';
import { TimeoutStrategy } from './timeout_strategy';
import { TimeoutException } from './exceptions/timeout_exception';

describe('TimeoutStrategy', () => {
  it('should execute task successfully within timeout', async () => {
    const strategy = new TimeoutStrategy({ timeout: '100ms' });

    const task = vi.fn(async () => 'result');

    const fakeTimer = vi.useFakeTimers();

    const executePromise = strategy.execute({}, task);

    fakeTimer.advanceTimersByTime(50);

    const result = await executePromise;

    expect(result).toBe('result');
    expect(task).toHaveBeenCalled();

    fakeTimer.clearAllTimers();
  });

  it('should throw TimeoutException when task exceeds timeout', async () => {
    const strategy = new TimeoutStrategy({ timeout: '50ms' });

    const task = vi.fn(async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('result'), 100);
      });
    });

    const fakeTimer = vi.useFakeTimers();

    const executePromise = strategy.execute({}, task);

    fakeTimer.advanceTimersByTime(50);

    await expect(executePromise).rejects.toThrow(TimeoutException);
    expect(task).toHaveBeenCalled();

    fakeTimer.clearAllTimers();
  });

  it('should use default timeout if not provided', async () => {
    const strategy = new TimeoutStrategy();

    const task = vi.fn(async () => 'result');

    const fakeTimer = vi.useFakeTimers();

    const executePromise = strategy.execute({}, task);

    fakeTimer.advanceTimersByTime(29999);

    const result = await executePromise;

    expect(result).toBe('result');
    expect(task).toHaveBeenCalled();
    fakeTimer.clearAllTimers();
  });

  it('should clear timeout after task completion', async () => {
    const strategy = new TimeoutStrategy({ timeout: '100ms' });

    const task = vi.fn(async () => 'completed');

    const fakeTimer = vi.useFakeTimers();

    // Execute the task
    const executePromise = strategy.execute({}, task);

    // Fast-forward time by 50ms (less than the timeout)
    fakeTimer.advanceTimersByTime(50);

    // Ensure task resolves before the timeout
    const result = await executePromise;

    expect(result).toBe('completed');
    expect(task).toHaveBeenCalled();

    // Now advance the timer beyond the timeout and ensure no TimeoutException occurs
    fakeTimer.advanceTimersByTime(100); // This should do nothing since the task already completed

    fakeTimer.clearAllTimers();
  });
});
