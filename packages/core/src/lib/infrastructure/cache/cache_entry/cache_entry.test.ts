import { fail } from 'assert';
import { ms } from '../../../utilities/ms/ms';
import { Failure } from '../../../utilities/result/result';
import { JsonSerializer } from '../../../utilities/serializer/json_serializer';
import { CacheEntry } from './cache_entry';

describe('CacheEntry', () => {
  let entry: CacheEntry<string>;

  beforeEach(() => {
    entry = new CacheEntry({
      key: 'key',
      value: 'value',
      validityPeriod: '1s',
      gracePeriod: '500ms',
    });
    vitest.useFakeTimers();
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
      entry = new CacheEntry({
        key: 'key',
        value: 'value',
        validityPeriod: '1ms',
      });
      vitest.setSystemTime(Date.now() + ms('1s'));
      expect(entry.hasExpired()).toBe(true);
    });
  });

  describe('Staleness Check', () => {
    it('should not be stale if the staleness time has not been reached', () => {
      vitest.advanceTimersByTime(ms('1s') - ms('300ms'));
      expect(entry.isStale()).toBe(false);
    });

    it('should be stale if the staleness time has passed', () => {
      vitest.advanceTimersByTime(ms('1s') + ms('300ms'));
      expect(entry.isStale()).toBe(true);
    });

    it('should not be invalid if it’s stale but within the expiration time', () => {
      vitest.advanceTimersByTime(ms('1s') + ms('100ms'));
      expect(entry.isStale()).toBe(true);
      expect(entry.isDefunct()).toBe(false);
    });

    it('should expire if both the expiration time and staleness time have passed', () => {
      vitest.advanceTimersByTime(ms('1.5s') + ms('100ms'));
      expect(entry.hasExpired()).toBe(true);
      expect(entry.isStale()).toBe(false);
      expect(entry.isDefunct()).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should correctly serialize the cache entry', () => {
      const serialized = entry.serialize();

      expect(serialized).toBeTruthy();
      expect(serialized).toMatch(
        /^{"expiration":\d+,"gracePeriod":"\d+ms","key":"key","staleUntil":\d+,"validityPeriod":"\d+s","value":"value"}$/
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

      expect(deserialized).toBeTruthy();
      expect(deserialized).toEqual(entry);
    });

    it('should return undefined if deserialization fails', () => {
      const deserialized = CacheEntry.deserialize('key', 'invalid');

      expect(deserialized).toBeUndefined();
    });
  });
});
