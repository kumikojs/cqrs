import { Operation } from './operation';

describe('Operation', () => {
  let operation: Operation<number>;

  beforeEach(() => {
    operation = new Operation<number>();
  });

  it('should initialize with IDLE state', () => {
    expect(operation.state).toEqual({
      status: 'idle',
      isPending: false,
      isIdle: true,
      isFulfilled: false,
      isRejected: false,
      isStale: false,
    });
  });

  it('should execute an operation and transition to PENDING and then FULFILLED state', async () => {
    const mockHandler = async () => 42;

    const promise = operation.execute('testOperation', mockHandler);

    // Check if the state is pending immediately after execution starts
    expect(operation.state).toEqual({
      status: 'pending',
      isPending: true,
      isIdle: false,
      isFulfilled: false,
      isRejected: false,
      isStale: false,
    });

    const result = await promise;

    expect(result).toBe(42);
    expect(operation.state).toEqual({
      status: 'fulfilled',
      response: 42,
      isPending: false,
      isIdle: false,
      isFulfilled: true,
      isRejected: false,
      isStale: false,
    });
  });

  it('should transition to REJECTED state on error', async () => {
    const mockHandler = async () => {
      throw new Error('Test error');
    };

    const promise = operation.execute('testOperation', mockHandler);

    // Check if the state is pending immediately after execution starts
    expect(operation.state).toEqual({
      status: 'pending',
      isPending: true,
      isIdle: false,
      isFulfilled: false,
      isRejected: false,
      isStale: false,
    });

    await expect(promise).rejects.toThrow('Test error');

    expect(operation.state).toEqual({
      status: 'rejected',
      error: expect.any(Error),
      isPending: false,
      isIdle: false,
      isFulfilled: false,
      isRejected: true,
      isStale: false,
    });
  });

  it('should mark the operation as stale', () => {
    const staleValue = 99;
    operation.stale(staleValue);

    expect(operation.state).toEqual({
      status: 'stale',
      response: staleValue,
      isPending: false,
      isIdle: false,
      isFulfilled: false,
      isRejected: false,
      isStale: true,
    });
  });
});
