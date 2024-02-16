import { QueryRegistry, type QueryRegistryContract } from './query-registry';

describe('QueryRegistry', () => {
  let registry: QueryRegistryContract;

  beforeEach(() => {
    registry = new QueryRegistry();
  });

  describe('register', () => {
    test('should register a query handler', () => {
      // Arrange
      const queryName = 'queryName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      const unregister = registry.register(queryName, handler);

      // Assert
      expect(registry.resolve(queryName)).toBe(handler);
      unregister();
      expect(() => registry.resolve(queryName)).toThrow();
    });

    test('should throw an error if query handler is already registered', () => {
      // Arrange
      const queryName = 'queryName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      registry.register(queryName, handler);

      // Assert
      expect(() => registry.register(queryName, handler)).toThrow();
    });
  });

  describe('resolve', () => {
    test('should resolve a registered query handler', () => {
      // Arrange
      const queryName = 'queryName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      registry.register(queryName, handler);

      // Assert
      expect(registry.resolve(queryName)).toBe(handler);
    });

    test('should throw an error if query handler is not registered', () => {
      // Arrange
      const queryName = 'queryName';

      // Assert
      expect(() => registry.resolve(queryName)).toThrow();
    });
  });

  afterEach(() => {
    vitest.clearAllMocks();
    registry.clear();
  });
});
