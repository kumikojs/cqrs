import { Mock } from 'vitest';
import { Client } from '../../client';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import { QueryInput } from '../../types/core/query';
import { QuerySubject } from './query_subject';

describe('QuerySubject', () => {
  let client: Client;
  let query: QueryInput;
  let handler: Mock;

  beforeEach(() => {
    client = new Client({
      resilience: {
        query: {
          timeout: 0,
        },
      },
      cache: {
        l2: {
          driver: new MemoryStorageDriver(),
        },
      },
    });

    query = {
      queryName: 'testQuery',
      payload: { id: '1' },
      options: {
        retry: false,
      },
    };

    handler = vi.fn().mockResolvedValue('result');
    client.query.dispatch = vi.fn().mockResolvedValue('result');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Execution', () => {
    it('should execute a query using the provided handler', async () => {
      const subject = new QuerySubject(query, client, handler);
      await subject.execute(query);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(query);
    });

    it('should fall back to client dispatch if no handler is provided', async () => {
      const subject = new QuerySubject(query, client);
      await subject.execute(query);

      expect(client.query.dispatch).toHaveBeenCalledTimes(1);
      expect(client.query.dispatch).toHaveBeenCalledWith(query);
    });

    it('should handle query execution errors and update state accordingly', async () => {
      const error = new Error('Execution failed');
      handler.mockRejectedValue(error);

      const subject = new QuerySubject(query, client, handler);

      await expect(subject.execute(query)).rejects.toThrow('Execution failed');
      expect(subject.state.isRejected).toBe(true);
      expect(subject.state.isFulfilled).toBe(false);
      expect(subject.state.error).toBe(error);
    });
  });

  describe('State Management', () => {
    it('should initialize with idle state', () => {
      const subject = new QuerySubject(query, client);

      expect(subject.state.isIdle).toBe(true);
      expect(subject.state.isPending).toBe(false);
      expect(subject.state.isFulfilled).toBe(false);
      expect(subject.state.isRejected).toBe(false);
    });

    it('should update state to pending while executing a query', async () => {
      const subject = new QuerySubject(query, client, handler);
      const stateSpy = vi.fn();
      subject.subscribe(stateSpy);

      const executePromise = subject.execute(query);

      expect(subject.state.isPending).toBe(true);
      expect(subject.state.isIdle).toBe(false);

      await executePromise;

      expect(subject.state.isPending).toBe(false);
    });

    it('should update state to fulfilled after successful query execution', async () => {
      const subject = new QuerySubject(query, client, handler);
      await subject.execute(query);

      expect(subject.state.isFulfilled).toBe(true);
      expect(subject.state.isPending).toBe(false);
      expect(subject.state.isRejected).toBe(false);
    });
  });

  describe('Subscription', () => {
    it('should allow subscribing to state changes during execution', async () => {
      const subject = new QuerySubject(query, client, handler);
      const stateChanges = vi.fn();
      subject.subscribe(stateChanges);

      await subject.execute(query);

      expect(stateChanges).toHaveBeenCalledTimes(2); // Called once for pending, once for fulfilled
    });

    it('should unsubscribe from state changes correctly', async () => {
      const subject = new QuerySubject(query, client, handler);
      const stateChanges = vi.fn();

      const unsubscribe = subject.subscribe(stateChanges);
      await subject.execute(query);

      unsubscribe(); // Unsubscribe from further state changes
      await subject.execute(query);

      expect(stateChanges).toHaveBeenCalledTimes(2); // Only subscribed during the first query
    });
  });

  describe('Cache Handling', () => {
    it('should handle optimistic updates via cache and update state accordingly', async () => {
      const subject = new QuerySubject(query, client, handler);
      const optimisticUpdateSpy = vi.fn();

      subject.subscribe(optimisticUpdateSpy);
      await subject.execute(query);
      await client.cache.optimisticUpdate(query, 'optimisticValue');

      expect(subject.state.isFulfilled).toBe(false);
      expect(subject.state.isStale).toBe(true);
      expect(subject.state.response).toBe('optimisticValue');
    });

    it('should handle cache invalidation and re-execute the handler with different results', async () => {
      handler.mockResolvedValueOnce('initialResult');
      handler.mockResolvedValueOnce('newResultAfterInvalidation');

      const subject = new QuerySubject(query, client, handler);
      const stateChanges = vi.fn();
      subject.subscribe(stateChanges);

      await subject.execute(query);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(subject.state.response).toBe('initialResult');

      await client.cache.invalidateQueries(query.queryName);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(subject.state.response).toBe('newResultAfterInvalidation');
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
