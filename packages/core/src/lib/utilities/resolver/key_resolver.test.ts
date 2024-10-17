import { describe, it, expect } from 'vitest';
import { KeyResolver } from './key_resolver';

describe('KeyResolver', () => {
  const keyResolver = new KeyResolver();

  describe('generateKey', () => {
    it('should generate a key without payload and default prefix', () => {
      const key = keyResolver.generateKey({ name: 'getUser' });
      expect(key).toBe('cache:getUser');
    });

    it('should generate a key without payload and custom prefix', () => {
      const key = keyResolver.generateKey({ name: 'getUser' }, 'command');
      expect(key).toBe('command:getUser');
    });

    it('should generate a key with a simple payload and default prefix', () => {
      const key = keyResolver.generateKey({
        name: 'getUser',
        payload: { id: 1 },
      });
      expect(key).toBe('cache:getUser:id:1');
    });

    it('should generate a key with a complex object payload', () => {
      const key = keyResolver.generateKey({
        name: 'getUser',
        payload: { id: 1, name: 'John' },
      });
      expect(key).toBe('cache:getUser:id:1|name:John');
    });

    it('should generate a key with an array payload', () => {
      const key = keyResolver.generateKey({
        name: 'getItems',
        payload: [1, 2, 3],
      });
      expect(key).toBe('cache:getItems:1,2,3');
    });

    it('should generate a key with nested object payloads', () => {
      const key = keyResolver.generateKey({
        name: 'getNested',
        payload: { user: { id: 1, details: { name: 'John' } } },
      });
      expect(key).toBe('cache:getNested:user:details:name:John|id:1');
    });

    it('should handle payload as null', () => {
      const key = keyResolver.generateKey({
        name: 'getNullPayload',
        payload: null,
      });
      expect(key).toBe('cache:getNullPayload');
    });

    it('should handle non-object payloads like strings', () => {
      const key = keyResolver.generateKey({
        name: 'getStringPayload',
        payload: 'string',
      });
      expect(key).toBe('cache:getStringPayload:string');
    });
  });

  describe('extractName', () => {
    it('should extract the name from a key', () => {
      const name = keyResolver.extractName('cache:testQuery:id:1');
      expect(name).toBe('testQuery');
    });

    it('should return null if the key format is invalid', () => {
      const name = keyResolver.extractName('invalidKeyFormat');
      expect(name).toBeNull();
    });

    it('should return null if there is no name part', () => {
      const name = keyResolver.extractName('cache:');
      expect(name).toBeNull();
    });
  });
});
