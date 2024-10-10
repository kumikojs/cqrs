/* eslint-disable @typescript-eslint/no-explicit-any */

import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';
import { CommandCache } from './command_cache';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';

describe('CommandCache', () => {
  let cache: QueryCache;
  let logger: KumikoLogger;
  let commandCache: CommandCache;

  beforeEach(() => {
    cache = new QueryCache({
      l2: { driver: new MemoryStorageDriver() },
    });
    logger = {
      trace: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as KumikoLogger;

    commandCache = new CommandCache({ cache, logger });
  });

  describe('invalidateQueries', () => {
    it('should invalidate specified queries', () => {
      const query1 = 'TestQuery1';
      const query2 = 'TestQuery2';

      const invalidateSpy = vitest.spyOn(cache, 'invalidateQueries');

      commandCache.invalidateQueries(query1, query2);

      expect(invalidateSpy).toHaveBeenCalledWith(query1, query2);
    });
  });

  describe('optimisticUpdate', () => {
    it('should optimistically update a query and invalidate it afterward', async () => {
      const queryName = 'TestQuery';
      const updater = vitest.fn().mockReturnValue({ data: 'newData' });

      vitest.spyOn(cache, 'get').mockResolvedValue(null); // No previous data
      const cacheSpy = vitest
        .spyOn(cache, 'optimisticUpdate')
        .mockResolvedValue(undefined);
      const invalidateSpy = vitest.spyOn(cache, 'invalidateQueries');

      await commandCache.optimisticUpdate({ queryName }, updater);

      expect(updater).toHaveBeenCalled();
      expect(cacheSpy).toHaveBeenCalledWith({ queryName }, { data: 'newData' });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryName });
    });

    it('should revert to previous data if update fails', async () => {
      const queryName = 'TestQuery';
      const previousData = { data: 'oldData' };
      const newData = { data: 'newData' };

      // Simulate a failure in optimistic update
      const updater = vitest.fn().mockReturnValue(newData);
      vitest.spyOn(cache, 'get').mockResolvedValue(previousData);
      vitest
        .spyOn(cache, 'optimisticUpdate')
        .mockRejectedValueOnce(new Error('Failed update')); // Fails the first time

      // Spy on the logger for error tracking
      const loggerSpy = vitest.spyOn(logger, 'error');

      // Call optimisticUpdate
      await commandCache.optimisticUpdate({ queryName }, updater);

      // Ensure logger.error was called with the expected message
      expect(loggerSpy).toHaveBeenCalledWith('Failed to update query', {
        query: { queryName },
      });

      // Ensure the optimisticUpdate was called twice:
      // 1. First time with newData which failed
      // 2. Second time with previousData for rollback
      expect(cache.optimisticUpdate).toHaveBeenCalledWith(
        { queryName },
        previousData // rollback to oldData
      );
    });

    it('should invalidate queries only after the provided promise resolves', async () => {
      // Create a promise that resolves after a short delay
      const promise = new Promise<void>((resolve) => setTimeout(resolve, 1000));

      commandCache = new CommandCache({ cache, logger }, promise);

      const queryName = 'TestQuery';
      const updater = vitest.fn().mockReturnValue({ data: 'newData' });

      const invalidateSpy = vitest.spyOn(cache, 'invalidateQueries');

      // Use fake timers to control the timing of the promise
      vitest.useFakeTimers();

      // Perform the optimistic update
      const updatePromise = commandCache.optimisticUpdate(queryName, updater);

      // Check that invalidateQueries has NOT been called before the promise resolves
      expect(invalidateSpy).not.toHaveBeenCalled();

      // Advance the fake timers to simulate the passage of time
      vitest.advanceTimersByTime(1000);

      // Wait for the promise to resolve
      await updatePromise;

      // Now the invalidateQueries method should be called after the promise resolves
      expect(invalidateSpy).toHaveBeenCalledWith({ queryName });

      vitest.useRealTimers();
    });

    it('should skip cache invalidation if the promise is rejected', async () => {
      const failingPromise = Promise.reject(new Error('Promise failed'));
      commandCache = new CommandCache({ cache, logger }, failingPromise);
      const queryName = 'TestQuery';
      const updater = vitest.fn().mockReturnValue({ data: 'newData' });

      const invalidateSpy = vitest.spyOn(cache, 'invalidateQueries');
      const loggerSpy = vitest.spyOn(logger, 'error');

      // Avoid unhandled promise rejection by catching the promise rejection
      await expect(
        commandCache.optimisticUpdate(queryName, updater)
      ).resolves.toBeUndefined();

      await expect(failingPromise).rejects.toThrow('Promise failed');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Promise failed, skipping cache invalidation',
        {
          query: { queryName },
        }
      );
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('should log an error if rollback also fails', async () => {
      const queryName = 'TestQuery';
      const previousData = { data: 'oldData' };
      const newData = { data: 'newData' };

      // Simulate a failure in optimistic update
      const updater = vitest.fn().mockReturnValue(newData);
      vitest.spyOn(cache, 'get').mockResolvedValue(previousData);

      // First failure on optimistic update
      vitest
        .spyOn(cache, 'optimisticUpdate')
        .mockRejectedValueOnce(new Error('Failed update')) // Simulates the first update failure
        .mockRejectedValueOnce(new Error('Failed rollback')); // Simulates rollback failure

      // Spy on the logger for error tracking
      const loggerSpy = vitest.spyOn(logger, 'error');

      // Call optimisticUpdate
      await commandCache.optimisticUpdate({ queryName }, updater);

      // Ensure logger.error was called twice:
      // 1. First time for the failed update
      // 2. Second time for the failed rollback
      expect(loggerSpy).toHaveBeenCalledWith('Failed to update query', {
        query: { queryName },
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to rollback query update',
        {
          query: { queryName },
        }
      );

      // Ensure optimisticUpdate was called twice:
      // 1. First time with newData which failed
      // 2. Second time with previousData which also failed
      expect(cache.optimisticUpdate).toHaveBeenCalledTimes(2);
      expect(cache.optimisticUpdate).toHaveBeenCalledWith(
        { queryName },
        previousData // rollback to oldData, but fails
      );
    });
  });
});
