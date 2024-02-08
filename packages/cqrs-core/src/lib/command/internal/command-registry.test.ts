import {
  CommandRegistry,
  type CommandRegistryContract,
} from './command-registry';

describe('CommandRegistry', () => {
  let registry: CommandRegistryContract;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    test('should register a command handler', () => {
      // Arrange
      const commandName = 'commandName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      const unregister = registry.register(commandName, handler);

      // Assert
      expect(registry.resolve(commandName)).toBe(handler);
      unregister();
      expect(() => registry.resolve(commandName)).toThrow();
    });

    test('should throw an error if command handler is already registered', () => {
      // Arrange
      const commandName = 'commandName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      registry.register(commandName, handler);

      // Assert
      expect(() => registry.register(commandName, handler)).toThrow();
    });
  });

  describe('resolve', () => {
    test('should resolve a registered command handler', () => {
      // Arrange
      const commandName = 'commandName';
      const handler = {
        execute: vitest.fn(),
      };

      // Act
      registry.register(commandName, handler);

      // Assert
      expect(registry.resolve(commandName)).toBe(handler);
    });

    test('should throw an error if command handler is not registered', () => {
      // Arrange
      const commandName = 'commandName';

      // Assert
      expect(() => registry.resolve(commandName)).toThrow();
    });
  });

  afterEach(() => {
    vitest.clearAllMocks();
    registry.clear();
  });
});
