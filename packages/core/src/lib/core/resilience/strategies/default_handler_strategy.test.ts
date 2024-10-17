import { describe, it, expect, vi } from 'vitest';
import { DefaultHandlerStrategy } from './default_handler_strategy';
import { NoHandlerFoundException } from '../../../infrastructure/bus/bus_exception';
import type { DefaultHandlerOptions } from '../../../types/core/options/resilience_options';

describe('DefaultHandlerStrategy', () => {
  it('should execute the task successfully', async () => {
    const options: DefaultHandlerOptions = {};
    const strategy = new DefaultHandlerStrategy(options);

    const request = {};
    const task = vi.fn(async () => 'success');

    const result = await strategy.execute(request, task);

    expect(result).toBe('success');
    expect(task).toHaveBeenCalledWith(request);
  });

  it('should call defaultHandler when NoHandlerFoundException is thrown', async () => {
    const defaultHandler = vi.fn().mockResolvedValue('defaultHandler');
    const options: DefaultHandlerOptions = { defaultHandler };
    const strategy = new DefaultHandlerStrategy(options);

    const request = {};
    const task = vi.fn(async () => {
      throw new NoHandlerFoundException('channel');
    });

    const result = await strategy.execute(request, task);

    expect(result).toBe('defaultHandler');
    expect(defaultHandler).toHaveBeenCalledWith(request);
  });

  it('should rethrow error if it is not NoHandlerFoundException', async () => {
    const options: DefaultHandlerOptions = {};
    const strategy = new DefaultHandlerStrategy(options);

    const request = {};
    const task = vi.fn(async () => {
      throw new Error('Some other error');
    });

    await expect(strategy.execute(request, task)).rejects.toThrow(
      'Some other error'
    );
  });

  it('should rethrow NoHandlerFoundException if no defaultHandler is provided', async () => {
    const options: DefaultHandlerOptions = {};
    const strategy = new DefaultHandlerStrategy(options);

    const request = {};
    const task = vi.fn(async () => {
      throw new NoHandlerFoundException('channel');
    });

    await expect(strategy.execute(request, task)).rejects.toThrow(
      NoHandlerFoundException
    );
  });
});
