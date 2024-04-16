import { AbortManager } from './abort_manager';

describe('AbortManager', () => {
  let manager: AbortManager;

  beforeEach(() => {
    manager = new AbortManager();
  });

  it('should be able to cancel an ongoing request', async () => {
    const operation = vitest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const promise = manager.execute('test', operation);

    manager.cancelRequest('test');

    await expect(promise).rejects.toThrow("Request 'test' aborted");
  });
});
