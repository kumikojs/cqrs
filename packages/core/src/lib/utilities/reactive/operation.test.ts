import { Operation, OPERATION_STATE } from './operation';

describe('Operation', () => {
  let operation: Operation<number>;

  beforeEach(() => {
    operation = new Operation<number>();
  });

  it('should initialize with INITIAL state', () => {
    expect(operation.state).toEqual({
      state: OPERATION_STATE.INITIAL,
      isInitial: true,
      isLoading: false,
      isSuccess: false,
      isError: false,
      isOutdated: false,
    });
  });

  it('should execute an operation and transition through LOADING to SUCCESS state', async () => {
    const mockHandler = async () => 42;
    const promise = operation.execute('testOperation', mockHandler);

    // Check if the state is loading immediately after execution starts
    expect(operation.state).toEqual({
      state: OPERATION_STATE.LOADING,
      isInitial: false,
      isLoading: true,
      isSuccess: false,
      isError: false,
      isOutdated: false,
    });

    const result = await promise;

    expect(result).toBe(42);
    expect(operation.state).toEqual({
      state: OPERATION_STATE.SUCCESS,
      response: 42,
      isInitial: false,
      isLoading: false,
      isSuccess: true,
      isError: false,
      isOutdated: false,
    });
  });

  it('should transition to ERROR state when operation fails', async () => {
    const mockHandler = async () => {
      throw new Error('Test error');
    };

    const promise = operation.execute('testOperation', mockHandler);

    expect(operation.state).toEqual({
      state: OPERATION_STATE.LOADING,
      isInitial: false,
      isLoading: true,
      isSuccess: false,
      isError: false,
      isOutdated: false,
    });

    await expect(promise).rejects.toThrow('Test error');

    expect(operation.state).toEqual({
      state: OPERATION_STATE.ERROR,
      error: expect.any(Error),
      isInitial: false,
      isLoading: false,
      isSuccess: false,
      isError: true,
      isOutdated: false,
    });
  });

  it('should mark the operation as outdated', () => {
    const outdatedValue = 99;
    operation.markAsOutdated(outdatedValue);

    expect(operation.state).toEqual({
      state: OPERATION_STATE.OUTDATED,
      response: outdatedValue,
      isInitial: false,
      isLoading: false,
      isSuccess: false,
      isError: false,
      isOutdated: true,
    });
  });

  it('should maintain metadata through state transitions', async () => {
    const initialMetadata = { page: 1 };
    operation = new Operation<number>(initialMetadata);

    expect(operation.state.metadata).toEqual(initialMetadata);

    const mockHandler = async () => 42;
    await operation.execute('testOperation', mockHandler);

    expect(operation.state.metadata).toEqual(initialMetadata);

    const newMetadata = { page: 2 };
    operation.updateMetadata(newMetadata);

    expect(operation.state.metadata).toEqual(newMetadata);
  });

  it('should call onSuccess callback when operation succeeds', async () => {
    const onSuccess = vitest.fn();
    const mockHandler = async () => 42;

    await operation.execute('testOperation', mockHandler, { onSuccess });

    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it('should call onError callback when operation fails', async () => {
    const onError = vi.fn();
    const testError = new Error('Test error');
    const mockHandler = async () => {
      throw testError;
    };

    await expect(
      operation.execute('testOperation', mockHandler, { onError })
    ).rejects.toThrow('Test error');

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(testError);
    });
  });
});
