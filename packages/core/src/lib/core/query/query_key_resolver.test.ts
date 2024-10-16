import { QueryKeyResolver } from './query_key_resolver';
import type { QueryInput } from '../../types/core/query';

describe('resolver', () => {
  const resolver = new QueryKeyResolver();

  describe('generateKey', () => {
    it('should generate a key without payload', () => {
      const input: QueryInput = { queryName: 'testQuery', payload: null };
      const key = resolver.generateKey(input);
      expect(key).toBe('cache:testQuery');
    });

    it('should generate a key with a simple payload', () => {
      const input: QueryInput = { queryName: 'testQuery', payload: { id: 1 } };
      const key = resolver.generateKey(input);
      expect(key).toBe('cache:testQuery:id:1');
    });

    it('should generate a key with a nested payload', () => {
      const input: QueryInput = {
        queryName: 'testQuery',
        payload: { id: 1, details: { name: 'test' } },
      };
      const key = resolver.generateKey(input);
      expect(key).toBe('cache:testQuery:details:name:test|id:1');
    });

    it('should generate a key with an array payload', () => {
      const input: QueryInput = { queryName: 'testQuery', payload: [1, 2, 3] };
      const key = resolver.generateKey(input);
      expect(key).toBe('cache:testQuery:1,2,3');
    });

    it('should generate a key with a mixed payload', () => {
      const input: QueryInput = {
        queryName: 'testQuery',
        payload: { id: 1, tags: ['a', 'b'] },
      };
      const key = resolver.generateKey(input);
      expect(key).toBe('cache:testQuery:id:1|tags:a,b');
    });
  });

  describe('extractQueryName', () => {
    it('should extract the query name from a key without payload', () => {
      const key = 'cache:testQuery';
      const queryName = resolver.extractQueryName(key);
      expect(queryName).toBe('testQuery');
    });

    it('should extract the query name from a key with payload', () => {
      const key = 'cache:testQuery:id:1';
      const queryName = resolver.extractQueryName(key);
      expect(queryName).toBe('testQuery');
    });

    it('should return null for an invalid key', () => {
      const key = 'invalidKey';
      const queryName = resolver.extractQueryName(key);
      expect(queryName).toBeNull();
    });
  });
});
