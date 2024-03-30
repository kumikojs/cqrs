import { LocalStorageCacheDriver } from './local_storage_cache';

describe('LocalStorageCacheDriver', () => {
  let driver: LocalStorageCacheDriver<string>;

  beforeEach(() => {
    driver = new LocalStorageCacheDriver();
  });

  it('should get a value from the cache', () => {
    const key = 'test';
    const value = 'value';

    driver.set('ns', key, value);

    expect(driver.get('ns', key)).toBe(value);
  });

  it('should return undefined if the key does not exist', () => {
    expect(driver.get('ns', 'key')).toBeUndefined();
  });

  it('should return undefined if the key has expired', () => {
    const key = 'test';
    const value = 'value';

    driver.set('ns', key, value, '1ms');

    setTimeout(() => {
      expect(driver.get('ns', key)).toBeUndefined();
    }, 2);
  });

  it('should delete a key from the cache', () => {
    const key = 'test';
    const value = 'value';

    driver.set('ns', key, value);

    driver.delete('ns', key);

    expect(driver.get('ns', key)).toBeUndefined();
  });

  it('should delete a namespace from the cache', () => {
    const key = 'test';
    const value = 'value';

    driver.set('ns', key, value);

    driver.delete('ns');

    expect(driver.get('ns', key)).toBeUndefined();
  });

  it('should invalidate a key from the cache', () => {
    const key = 'test';
    const value = 'value';

    driver.set('ns', key, value);

    driver.invalidate('ns', key);

    expect(driver.get('ns', key)).toBeUndefined();
  });

  it('should invalidate a namespace from the cache', () => {
    const key = 'test';
    const value = 'value';

    driver.set('ns', key, value);

    driver.invalidate('ns');

    expect(driver.get('ns', key)).toBeUndefined();
  });

  it('should subscribe to an invalidate event', () => {
    const key = 'test';
    const value = 'value';

    driver.set('ns', key, value);

    const handler = vitest.fn();

    driver.onInvalidate('ns', handler);

    driver.invalidate('ns', key);

    expect(handler).toBeCalledWith(key);
  });

  it('should unsubscribe from an invalidate event', () => {
    const key = 'test';
    const value = 'value';

    driver.set('ns', key, value);

    const handler = vitest.fn();

    const unsubscribe = driver.onInvalidate('ns', handler);

    unsubscribe();

    driver.invalidate('ns', key);

    expect(handler).not.toBeCalled();
  });
});
