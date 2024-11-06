import { KeyResolver } from './key_resolver';

describe('KeyResolver', () => {
  const keyResolver = new KeyResolver();

  describe('generateKey', () => {
    it('should generate a key without payload and meta, with default prefix', () => {
      const key = keyResolver.generateKey({ name: 'getUser' });
      expect(key).toBe('cache:getUser');
    });

    it('should generate a key without payload and meta, with custom prefix', () => {
      const key = keyResolver.generateKey({ name: 'getUser' }, 'command');
      expect(key).toBe('command:getUser');
    });

    it('should generate a key with a simple payload and default prefix', () => {
      const key = keyResolver.generateKey({
        name: 'getUser',
        payload: { id: 1 },
      });
      expect(key).toBe('cache:getUser:payload:id:1');
    });

    it('should generate a key with a simple meta and default prefix', () => {
      const key = keyResolver.generateKey({
        name: 'getUser',
        meta: { timestamp: '2023-01-01' },
      });
      expect(key).toBe('cache:getUser:meta:timestamp:2023-01-01');
    });

    it('should generate a key with both payload and meta', () => {
      const key = keyResolver.generateKey({
        name: 'getUser',
        payload: { id: 1 },
        meta: { timestamp: '2023-01-01' },
      });
      expect(key).toBe('cache:getUser:meta:timestamp:2023-01-01|payload:id:1');
    });

    it('should generate a key with a complex object payload and meta', () => {
      const key = keyResolver.generateKey({
        name: 'getUser',
        payload: { id: 1, name: 'John' },
        meta: { role: 'admin' },
      });
      expect(key).toBe('cache:getUser:meta:role:admin|payload:id:1|name:John');
    });

    it('should generate a key with an array payload and meta', () => {
      const key = keyResolver.generateKey({
        name: 'getItems',
        payload: [1, 2, 3],
        meta: { page: 1 },
      });
      expect(key).toBe('cache:getItems:meta:page:1|payload:1,2,3');
    });

    it('should generate a key with nested object payloads and meta', () => {
      const key = keyResolver.generateKey({
        name: 'getNested',
        payload: { user: { id: 1, details: { name: 'John' } } },
        meta: { session: { token: 'abc123' } },
      });
      expect(key).toBe(
        'cache:getNested:meta:session:token:abc123|payload:user:details:name:John|id:1'
      );
    });

    it('should handle non-object payloads and meta like strings', () => {
      const key = keyResolver.generateKey({
        name: 'getStringValues',
        payload: 'stringPayload',
        meta: 'stringMeta',
      });
      expect(key).toBe(
        'cache:getStringValues:meta:stringMeta|payload:stringPayload'
      );
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
