import { MemoryCacheDriver } from './memory_cache';

describe('MemoryCacheDriver', () => {
  let driver: MemoryCacheDriver<string>;

  beforeEach(() => {
    driver = new MemoryCacheDriver();
  });

  describe('Get', () => {
    test('should get undefined for non-existing key in a namespace', () => {
      expect(driver.get('ns1', 'non-existing-key')).toBeUndefined();
    });

    test('should get the value for an existing key in a namespace', () => {
      driver.set('ns1', 'key1', 'value1');
      expect(driver.get('ns1', 'key1')).toBe('value1');
    });
  });

  describe('Set', () => {
    test('should set a value in a namespace', () => {
      driver.set('ns2', 'key2', 'value2');
      expect(driver.get('ns2', 'key2')).toBe('value2');
    });
  });

  describe('Delete', () => {
    test('should delete a key from a namespace', () => {
      driver.set('ns3', 'key3', 'value3');
      driver.delete('ns3', 'key3');
      expect(driver.get('ns3', 'key3')).toBeUndefined();
    });

    test('should delete an entire namespace', () => {
      driver.set('ns4', 'key4', 'value4');
      driver.delete('ns4');
      expect(driver.get('ns4', 'key4')).toBeUndefined();
    });
  });

  describe('Invalidate', () => {
    test('should remove a key from a namespace', () => {
      driver.set('ns5', 'key5', 'value5');
      driver.invalidate('ns5', 'key5');
      expect(driver.get('ns5', 'key5')).toBeUndefined();
    });
  });

  describe('Expiration', () => {
    test('should get undefined for an expired key in a namespace', () => {
      vitest.useFakeTimers();
      driver.set('ns6', 'key6', 'value6', '1ms');
      vitest.advanceTimersByTime(2);

      expect(driver.get('ns6', 'key6')).toBeUndefined();

      vitest.clearAllTimers();
    });
  });

  describe('Events handling', () => {
    test('should emit an invalidation event when a key is invalidated', () => {
      const mockHandler = vitest.fn();
      driver.onInvalidate('ns7', mockHandler);

      driver.set('ns7', 'key7', 'value7');
      driver.invalidate('ns7', 'key7');

      expect(mockHandler).toHaveBeenCalledWith('key7');
    });
  });
});
