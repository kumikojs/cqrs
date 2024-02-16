import { EventRegistry, type EventRegistryContract } from './event-registry';

describe('EventRegistry', () => {
  let registry: EventRegistryContract;

  beforeEach(() => {
    registry = new EventRegistry();
  });

  describe('register', () => {
    test('should register a event handler', () => {
      // Arrange
      const eventName = 'eventName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      const unregister = registry.register(eventName, handler);

      // Assert
      expect(registry.resolve(eventName)).toBe(handler);
      unregister();
      expect(() => registry.resolve(eventName)).toThrow();
    });

    test('should throw an error if event handler is already registered', () => {
      // Arrange
      const eventName = 'eventName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      registry.register(eventName, handler);

      // Assert
      expect(() => registry.register(eventName, handler)).toThrow();
    });
  });

  describe('resolve', () => {
    test('should resolve a registered event handler', () => {
      // Arrange
      const eventName = 'eventName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      registry.register(eventName, handler);

      // Assert
      expect(registry.resolve(eventName)).toBe(handler);
    });

    test('should throw an error if event handler is not registered', () => {
      // Arrange
      const eventName = 'eventName';

      // Assert
      expect(() => registry.resolve(eventName)).toThrow();
    });
  });

  afterEach(() => {
    vitest.clearAllMocks();
    registry.clear();
  });
});
