import { AbortManager } from './abort_manager';

describe('AbortManager', () => {
  const abortManager = new AbortManager();

  afterEach(() => {
    abortManager.disconnect();
  });

  it('should add a request and execute it', async () => {
    const requestId = 'request1';
    const mockOperation = vi.fn(() => Promise.resolve('response'));

    const response = await abortManager.execute(requestId, mockOperation);

    expect(response).toBe('response');
    expect(mockOperation).toHaveBeenCalledTimes(1); // Verify the operation was called
  });

  it('should cancel a request', async () => {
    const requestId = 'request1';
    const mockOperation = vi.fn((abortController) => {
      return new Promise((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          reject(
            new DOMException(`Request ${requestId} was aborted`, 'AbortError')
          );
        });
      });
    });

    const promise = abortManager.execute(requestId, mockOperation);

    abortManager.cancelRequest(requestId);

    await expect(promise).rejects.toThrow(DOMException);
    await expect(promise).rejects.toThrow('Request request1 was aborted');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should disconnect all ongoing requests', async () => {
    const requestId1 = 'request1';
    const requestId2 = 'request2';

    const mockOperation1 = vi.fn(
      () =>
        new Promise((resolve) => setTimeout(() => resolve('response1'), 100))
    );
    const mockOperation2 = vi.fn(
      () =>
        new Promise((resolve) => setTimeout(() => resolve('response2'), 100))
    );

    await abortManager.execute(requestId1, mockOperation1);
    await abortManager.execute(requestId2, mockOperation2);

    abortManager.disconnect();

    expect(mockOperation1).toHaveBeenCalledTimes(1);
    expect(mockOperation2).toHaveBeenCalledTimes(1);
  });
});
