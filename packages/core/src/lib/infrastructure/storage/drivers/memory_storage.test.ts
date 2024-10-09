import { MemoryStorageDriver } from './memory_storage';

describe('MemoryStorageDriver', () => {
  let storageDriver: MemoryStorageDriver;

  beforeEach(() => {
    storageDriver = new MemoryStorageDriver();
  });

  it('should initialize with zero length', () => {
    expect(storageDriver.length).toBe(0);
  });

  it('should set and get an item', () => {
    storageDriver.setItem('key1', 'value1');
    expect(storageDriver.getItem('key1')).toBe('value1');
  });

  it('should return null for a non-existing item', () => {
    expect(storageDriver.getItem('nonExistentKey')).toBe(null);
  });

  it('should remove an item', () => {
    storageDriver.setItem('key1', 'value1');
    storageDriver.removeItem('key1');
    expect(storageDriver.getItem('key1')).toBe(null);
  });

  it('should clear all items', () => {
    storageDriver.setItem('key1', 'value1');
    storageDriver.setItem('key2', 'value2');
    storageDriver.clear();
    expect(storageDriver.length).toBe(0);
    expect(storageDriver.getItem('key1')).toBe(null);
    expect(storageDriver.getItem('key2')).toBe(null);
  });

  it('should return the correct key by index', () => {
    storageDriver.setItem('key1', 'value1');
    storageDriver.setItem('key2', 'value2');
    expect(storageDriver.key(0)).toBe('key1');
    expect(storageDriver.key(1)).toBe('key2');
    expect(storageDriver.key(2)).toBe(null);
  });

  it('should return the correct length after adding and removing items', () => {
    expect(storageDriver.length).toBe(0);
    storageDriver.setItem('key1', 'value1');
    expect(storageDriver.length).toBe(1);
    storageDriver.setItem('key2', 'value2');
    expect(storageDriver.length).toBe(2);
    storageDriver.removeItem('key1');
    expect(storageDriver.length).toBe(1);
    storageDriver.clear();
    expect(storageDriver.length).toBe(0);
  });
});
