/* eslint-disable @typescript-eslint/no-explicit-any */
import { InMemoryCacheDriver } from './in-memory-cache-driver';

describe('InMemoryCacheDriver', () => {
  let driver: InMemoryCacheDriver<string, string>;

  beforeEach(() => {
    driver = InMemoryCacheDriver.getInstance();
  });

  test('should get the same instance', () => {
    const instance1 = InMemoryCacheDriver.getInstance();
    const instance2 = InMemoryCacheDriver.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should get undefined for non-existing key', () => {
    expect(driver.get('non-existing-key')).toBeUndefined();
  });

  test('should get the value for an existing key', () => {
    driver.set('key', 'value');
    expect(driver.get('key')).toBe('value');
  });

  test('should get undefined for an expired key', () => {
    vitest.useFakeTimers();
    driver.set('key', 'value', '1ms');
    vitest.advanceTimersByTime(2);
    expect(driver.get('key')).toBeUndefined();
  });

  test('should delete a key', () => {
    driver.set('key', 'value');
    driver.delete('key');
    expect(driver.get('key')).toBeUndefined();
  });
});
