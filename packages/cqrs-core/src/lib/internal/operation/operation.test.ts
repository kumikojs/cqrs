import { Operation } from './operation';

describe('Operation', () => {
  it('should have an initial state', () => {
    const lifecycle = new Operation();
    expect(lifecycle.state).toEqual({
      status: 'idle',
      isIdle: true,
      isPending: false,
      isFulfilled: false,
      isRejected: false,
    });
  });

  it('should execute an operation', async () => {
    const lifecycle = new Operation();
    const operation = 'test';
    const handlerFn = vitest.fn().mockResolvedValue('response');
    const response = await lifecycle.execute(operation, handlerFn);
    expect(response).toBe('response');
    expect(handlerFn).toHaveBeenCalledWith(operation);
    expect(lifecycle.state).toEqual({
      status: 'fulfilled',
      response: 'response',
      isPending: false,
      isIdle: false,
      isFulfilled: true,
      isRejected: false,
    });
  });

  it('should handle an error', async () => {
    const lifecycle = new Operation();
    const operation = 'test';
    const handlerFn = vitest.fn().mockRejectedValue(new Error('test'));
    await expect(lifecycle.execute(operation, handlerFn)).rejects.toThrow(
      'test'
    );
    expect(handlerFn).toHaveBeenCalledWith(operation);
    expect(lifecycle.state).toEqual({
      status: 'rejected',
      error: new Error('test'),
      isPending: false,
      isIdle: false,
      isFulfilled: false,
      isRejected: true,
    });
  });
});
