/* eslint-disable @typescript-eslint/no-explicit-any */
import { Stepper } from './stepper';
import type { Event } from '../../../types/core/event';

describe('Stepper', () => {
  let executor: Stepper;
  let event: Event;

  beforeEach(() => {
    executor = new Stepper();
    event = {
      eventName: 'event',
      payload: {},
    };
  });

  test('should run all steps', async () => {
    const step1 = {
      execute: vitest.fn(),
    };
    const step2 = {
      execute: vitest.fn(),
    };
    executor.add(step1, step2);

    await executor.run(event);

    expect(step1.execute).toHaveBeenCalledWith(event);
    expect(step2.execute).toHaveBeenCalledWith(event);
  });

  test('should compensate the first step if it fails at the beginning', async () => {
    const step1 = {
      execute: vitest.fn().mockRejectedValue(new Error('step1')),
      compensate: vitest.fn(),
    };
    const step2 = {
      execute: vitest.fn(),
      compensate: vitest.fn(),
    };
    executor.add(step1, step2);

    await expect(executor.run(event)).rejects.toThrow('step1');

    expect(step1.execute).toHaveBeenCalledWith(event);
    expect(step2.execute).not.toHaveBeenCalled();

    await executor.compensate(event);

    expect(step1.compensate).toHaveBeenCalledWith(event);
    expect(step2.compensate).not.toHaveBeenCalled();
  });

  test('should compensate the two first steps if the second fails', async () => {
    const step1 = {
      execute: vitest.fn(),
      compensate: vitest.fn(),
    };
    const step2 = {
      execute: vitest.fn().mockRejectedValue(new Error('step2')),
      compensate: vitest.fn(),
    };
    const step3 = {
      execute: vitest.fn(),
      compensate: vitest.fn(),
    };
    executor.add(step1, step2, step3);

    await expect(executor.run(event)).rejects.toThrow('step2');

    expect(step1.execute).toHaveBeenCalledWith(event);
    expect(step2.execute).toHaveBeenCalledWith(event);
    expect(step3.execute).not.toHaveBeenCalled();

    await executor.compensate(event);

    expect(step1.compensate).toHaveBeenCalledWith(event);
    expect(step2.compensate).toHaveBeenCalledWith(event);
    expect(step3.compensate).not.toHaveBeenCalled();
  });

  test('should compensate all steps if the last one fails', async () => {
    const step1 = {
      execute: vitest.fn(),
      compensate: vitest.fn(),
    };
    const step2 = {
      execute: vitest.fn(),
      compensate: vitest.fn(),
    };
    const step3 = {
      execute: vitest.fn().mockRejectedValue(new Error('step3')),
      compensate: vitest.fn(),
    };
    executor.add(step1, step2, step3);

    await expect(executor.run(event)).rejects.toThrow('step3');

    expect(step1.execute).toHaveBeenCalledWith(event);
    expect(step2.execute).toHaveBeenCalledWith(event);
    expect(step3.execute).toHaveBeenCalledWith(event);

    await executor.compensate(event);

    expect(step1.compensate).toHaveBeenCalledWith(event);
    expect(step2.compensate).toHaveBeenCalledWith(event);
    expect(step3.compensate).toHaveBeenCalledWith(event);
  });

  test('should compensate in reverse order', async () => {
    const step1 = {
      execute: vitest.fn(),
      compensate: vitest.fn(),
    };
    const step2 = {
      execute: vitest.fn(),
      compensate: vitest.fn(),
    };
    const step3 = {
      execute: vitest.fn().mockRejectedValue(new Error('step3')),
      compensate: vitest.fn(),
    };
    executor.add(step1, step2, step3);

    await expect(executor.run(event)).rejects.toThrow('step3');

    expect(step1.execute).toHaveBeenCalledWith(event);
    expect(step2.execute).toHaveBeenCalledWith(event);
    expect(step3.execute).toHaveBeenCalledWith(event);

    await executor.compensate(event);

    expect(step1.compensate.mock.invocationCallOrder[0]).toBeGreaterThan(
      step2.compensate.mock.invocationCallOrder[0]
    );
    expect(step2.compensate.mock.invocationCallOrder[0]).toBeGreaterThan(
      step3.compensate.mock.invocationCallOrder[0]
    );
    expect(step3.compensate).toHaveBeenCalledWith(event);
  });
});
