/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */

import { CacheEntry } from './cache_entry';

describe('CacheEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create entry with defaults', () => {
      const entry = new CacheEntry({ key: 'test' });

      expect(entry.key).toBe('test');
      expect(entry.value).toBeUndefined();
      expect(entry.validityPeriod).toBe('0');
      expect(entry.cacheTime).toBe('5m');
    });

    it('should use provided values', () => {
      const entry = new CacheEntry({
        key: 'test',
        value: 'data',
        validityPeriod: '1h',
        cacheTime: '2h',
      });

      expect(entry.key).toBe('test');
      expect(entry.value).toBe('data');
      expect(entry.validityPeriod).toBe('1h');
      expect(entry.cacheTime).toBe('2h');
    });

    it('should allow custom expiration times', () => {
      const now = Date.now();
      const expiration = now + 1000;
      const cacheExpiration = now + 2000;

      const entry = new CacheEntry({
        key: 'test',
        expiration,
        cacheExpiration,
      });

      expect(entry.expiration).toBe(expiration);
      expect(entry.cacheExpiration).toBe(cacheExpiration);
    });
  });

  describe('state management', () => {
    it('should be stale immediately with default validity period', () => {
      const entry = new CacheEntry({ key: 'test' });
      expect(entry.isStale()).toBe(true);
    });

    it('should handle zero duration correctly', () => {
      const entry = new CacheEntry({
        key: 'test',
        validityPeriod: '0',
        cacheTime: '1s',
      });

      expect(entry.isStale()).toBe(true);
      expect(entry.shouldDelete()).toBe(false);
    });

    it('should transition through states correctly', () => {
      const entry = new CacheEntry({
        key: 'test',
        validityPeriod: '1s',
        cacheTime: '2s',
      });

      expect(entry.isStale()).toBe(false);
      expect(entry.shouldDelete()).toBe(false);

      vi.advanceTimersByTime(1100);
      expect(entry.isStale()).toBe(true);
      expect(entry.shouldDelete()).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(entry.isStale()).toBe(true);
      expect(entry.shouldDelete()).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should refresh entry correctly', () => {
      const original = new CacheEntry({
        key: 'test',
        value: 'data',
        validityPeriod: '1s',
      });

      vi.advanceTimersByTime(1100);
      expect(original.isStale()).toBe(true);

      const refreshed = original.refresh();
      expect(refreshed.isStale()).toBe(false);
      expect(refreshed.value).toBe(original.value);
      expect(refreshed.validityPeriod).toBe(original.validityPeriod);
    });

    it('should update value correctly', () => {
      const original = new CacheEntry({
        key: 'test',
        value: 'old',
        validityPeriod: '1s',
      });

      const updated = original.withValue('new');
      expect(updated.value).toBe('new');
      expect(updated.validityPeriod).toBe(original.validityPeriod);
      expect(updated.isStale()).toBe(original.isStale());
    });

    it('should create stale entries', () => {
      const entry = CacheEntry.createStale('test', 'data');
      expect(entry.isStale()).toBe(true);
      expect(entry.value).toBe('data');
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const original = new CacheEntry({
        key: 'test',
        value: { data: 'test' },
        validityPeriod: '1h',
        cacheTime: '2h',
      });

      const serialized = original.serialize();
      expect(serialized).not.toBeNull();

      const deserialized = CacheEntry.deserialize('test', serialized!);
      expect(deserialized).toBeDefined();
      expect(deserialized?.key).toBe(original.key);
      expect(deserialized?.value).toEqual(original.value);
      expect(deserialized?.validityPeriod).toBe(original.validityPeriod);
      expect(deserialized?.cacheTime).toBe(original.cacheTime);
      expect(deserialized?.expiration).toBe(original.expiration);
      expect(deserialized?.cacheExpiration).toBe(original.cacheExpiration);
    });

    it('should handle serialization failures', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const circular: any = {};
      circular.self = circular;

      const entry = new CacheEntry({
        key: 'test',
        value: circular,
      });

      const serialized = entry.serialize();
      expect(serialized).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle deserialization failures', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = CacheEntry.deserialize('test', 'invalid json');

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values', () => {
      const entry = new CacheEntry({
        key: 'test',
        value: undefined,
      });

      expect(entry.value).toBeUndefined();
      const serialized = entry.serialize();
      const deserialized = CacheEntry.deserialize('test', serialized!);
      expect(deserialized?.value).toBeUndefined();
    });

    it('should handle very large durations', () => {
      const entry = new CacheEntry({
        key: 'test',
        validityPeriod: '999d',
        cacheTime: '1000d',
      });

      expect(entry.isStale()).toBe(false);
      expect(entry.shouldDelete()).toBe(false);
    });

    it('should handle numeric durations', () => {
      const entry = new CacheEntry({
        key: 'test',
        validityPeriod: 1000,
        cacheTime: 2000,
      });

      expect(entry.isStale()).toBe(false);
      vi.advanceTimersByTime(1100);
      expect(entry.isStale()).toBe(true);
    });

    it('should preserve value types after serialization', () => {
      const testCases = [
        { value: 'string', type: 'string' },
        { value: 123, type: 'number' },
        { value: true, type: 'boolean' },
        { value: { a: 1 }, type: 'object' },
        { value: [1, 2, 3], type: 'object' },
        { value: null, type: 'object' },
        { value: undefined, type: 'undefined' },
      ];

      for (const { value, type } of testCases) {
        const entry = new CacheEntry({ key: 'test', value });
        const serialized = entry.serialize();
        const deserialized = CacheEntry.deserialize('test', serialized!);

        expect(deserialized?.value).toEqual(value);
        expect(typeof deserialized?.value).toBe(type);
      }
    });
  });
});
