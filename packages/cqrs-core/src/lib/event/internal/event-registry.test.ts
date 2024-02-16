import {
  EventNotRegisteredException,
  EventRegistry,
  type EventRegistryContract,
} from './event-registry';

describe('EventRegistry', () => {
  let eventRegistry: EventRegistryContract;

  beforeEach(() => {
    eventRegistry = new EventRegistry();
  });

  describe('register', () => {
    test('should register an event handler and unregister it', () => {
      const eventName = 'testEvent';
      const handler = {
        handle: vitest.fn(),
      };

      const unregister = eventRegistry.register(eventName, handler);

      expect(() => eventRegistry.resolve(eventName)).not.toThrow();
      expect(eventRegistry.resolve(eventName)).toEqual([handler]);

      unregister();

      expect(() => eventRegistry.resolve(eventName)).toThrowError(
        new EventNotRegisteredException(eventName)
      );
    });

    test('should register multiple event handlers and unregister the first one', () => {
      const eventName = 'testEvent';
      const handler = {
        handle: vitest.fn(),
      };
      const handler2 = {
        handle: vitest.fn(),
      };

      const unregister = eventRegistry.register(eventName, handler);
      eventRegistry.register(eventName, handler2);

      expect(() => eventRegistry.resolve(eventName)).not.toThrow();
      expect(eventRegistry.resolve(eventName)).toEqual([handler, handler2]);

      unregister();

      expect(() => eventRegistry.resolve(eventName)).not.toThrow();
      expect(eventRegistry.resolve(eventName)).toEqual([handler2]);
    });
  });

  describe('resolve', () => {
    test('should resolve an event handler', () => {
      const eventName = 'testEvent';
      const handler = {
        handle: vitest.fn(),
      };

      eventRegistry.register(eventName, handler);

      expect(eventRegistry.resolve(eventName)).toEqual([handler]);
    });

    test('should throw an error if event handler is not registered', () => {
      const eventName = 'testEvent';

      expect(() => eventRegistry.resolve(eventName)).toThrowError(
        new EventNotRegisteredException(eventName)
      );
    });
  });
});
