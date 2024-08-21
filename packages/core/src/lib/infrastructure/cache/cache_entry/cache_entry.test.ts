import { ms } from '../../ms/ms';
import { JsonSerializer } from '../../serializer/json_serializer';
import { fail } from 'assert';
import { Failure } from '../../result/result';
import { CacheEntry } from './cache_entry';

describe('CacheEntry', () => {
  let entry: CacheEntry<string>;

  beforeEach(() => {
    entry = new CacheEntry('key', 'value', '1s');
  });

  afterEach(() => {
    vitest.restoreAllMocks();
    vitest.clearAllTimers();
  });

  describe('isExpired', () => {
    it('should return false if the expiration is in the future', () => {
      expect(entry.hasExpired()).toBeFalsy();
    });

    it('should return true if the expiration is in the past', () => {
      entry = new CacheEntry('key', 'value', '1ms');

      vitest.useFakeTimers({
        now: Date.now() + ms('1s'),
      });

      expect(entry.hasExpired()).toBeTruthy();
    });
  });

  describe('serialize', () => {
    it('should serialize the cache entry', () => {
      const serialized = entry.serialize();
      expect(serialized).not.toBeNull();
      expect(serialized).toMatch(
        /^{"key":"key","value":"value","expiration":\d+,"ttl":"1s"}$/
      );
    });

    it('should return null if serialization fails', () => {
      vitest
        .spyOn(JsonSerializer.prototype, 'serialize')
        .mockReturnValue(new Failure(new Error('Failed to serialize data')));

      const serialized = entry.serialize();
      expect(serialized).toBeNull();
    });
  });

  describe('deserialize', () => {
    it('should deserialize the cache entry', () => {
      const serialized = entry.serialize();

      if (!serialized) {
        console.error(serialized);
        fail('Failed to serialize entry');
      }

      const deserialized = CacheEntry.deserialize('key', serialized);

      expect(deserialized).not.toBeUndefined();
      expect(deserialized).toEqual(entry);
    });

    it('should return undefined if deserialization fails', () => {
      const deserialized = CacheEntry.deserialize('key', 'invalid');

      expect(deserialized).toBeUndefined();
    });
  });
});
