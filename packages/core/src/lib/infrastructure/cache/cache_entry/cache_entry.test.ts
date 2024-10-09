import { fail } from 'assert';
import { ms } from '../../../utilities/ms/ms';
import { Failure } from '../../../utilities/result/result';
import { JsonSerializer } from '../../../utilities/serializer/json_serializer';
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

  describe('Expiration Check', () => {
    it('should not be expired if the expiration time is in the future', () => {
      expect(entry.hasExpired()).toBe(false);
    });

    it('should be expired if the expiration time is in the past', () => {
      entry = new CacheEntry('key', 'value', '1ms');

      vitest.useFakeTimers({ now: Date.now() + ms('1s') });

      expect(entry.hasExpired()).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should correctly serialize the cache entry', () => {
      const serialized = entry.serialize();
      expect(serialized).toBeTruthy(); // Check that it's not null or undefined
      expect(serialized).toMatch(
        /^{"expiration":\d+,"key":"key","ttl":"1s","value":"value"}$/
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

  describe('Deserialization', () => {
    it('should correctly deserialize the cache entry', () => {
      const serialized = entry.serialize();

      if (!serialized) {
        console.error(serialized);
        fail('Failed to serialize entry');
      }

      const deserialized = CacheEntry.deserialize('key', serialized);

      expect(deserialized).toBeTruthy(); // Check that it's not undefined
      expect(deserialized).toEqual(entry);
    });

    it('should return undefined if deserialization fails', () => {
      const deserialized = CacheEntry.deserialize('key', 'invalid');

      expect(deserialized).toBeUndefined();
    });
  });
});
