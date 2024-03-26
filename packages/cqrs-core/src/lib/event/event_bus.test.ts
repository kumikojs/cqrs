/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventBus } from './event_bus';

import type {
  EventBusContract,
  EventContract,
  EventHandlerContract,
} from './contracts';

class TestEvent implements EventContract {
  eventName: string;

  constructor(eventName: string) {
    this.eventName = eventName;
  }
}

describe('EventBus', () => {
  let eventBus: EventBusContract;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('register', () => {
    test('should register multiple event handlers', () => {
      const eventName = 'testEvent';
      const handler = {
        handle: vitest.fn(),
      };
      const handler2 = {
        handle: vitest.fn(),
      };

      eventBus.on(eventName, handler);
      eventBus.on(eventName, handler2);

      eventBus.emit(new TestEvent(eventName));

      expect(handler.handle).toHaveBeenCalledTimes(1);
      expect(handler2.handle).toHaveBeenCalledTimes(1);
    });

    test('should register a event handler as a function and unregister it', () => {
      const eventName = 'testEvent';
      const spy = vitest.spyOn(console, 'log').mockImplementation(() => {
        return;
      });
      const handler = async () => {
        console.log('test');
      };

      const subscription = eventBus.on(eventName, handler);

      expect(() => eventBus.emit(new TestEvent(eventName))).not.toThrow();
      expect(spy).toHaveBeenCalledTimes(1);

      subscription();

      expect(() => eventBus.emit(new TestEvent(eventName))).rejects.toThrow();
    });

    test('should register a event handler as an object and unregister it', () => {
      const eventName = 'testEvent';
      const spy = vitest.spyOn(console, 'log').mockImplementation(() => {
        return;
      });

      const handler = {
        handle: async () => {
          console.log('test');
        },
      };

      const subscription = eventBus.on(eventName, handler);

      expect(() => eventBus.emit(new TestEvent(eventName))).not.toThrow();
      expect(spy).toHaveBeenCalledTimes(1);

      subscription();

      expect(() => eventBus.emit(new TestEvent(eventName))).rejects.toThrow();
    });

    test('should register a event handler as a class and unregister it', () => {
      const eventName = 'testEvent';
      class TestEventHandler implements EventHandlerContract<TestEvent> {
        async handle() {
          return;
        }
      }

      const handler = new TestEventHandler();

      const subscription = eventBus.on(eventName, handler);

      expect(() => eventBus.emit(new TestEvent(eventName))).not.toThrow();

      subscription();

      expect(() => eventBus.emit(new TestEvent(eventName))).rejects.toThrow();
    });
  });

  describe('handle', () => {
    test('should handle multiple event handlers for the same event', () => {
      const eventName = 'testEvent';
      const handler = {
        handle: vitest.fn(),
      };

      eventBus.on(eventName, handler);
      eventBus.on(eventName, handler);
      eventBus.on(eventName, handler);
      eventBus.on(eventName, handler);

      eventBus.emit(new TestEvent(eventName));

      expect(handler.handle).toHaveBeenCalledTimes(4);
    });

    test('should handle multiple event handlers', () => {
      const eventName = 'testEvent';
      const handler = {
        handle: vitest.fn(),
      };
      const handler2 = {
        handle: vitest.fn(),
      };

      eventBus.on(eventName, handler);
      eventBus.on(eventName, handler2);

      eventBus.emit(new TestEvent(eventName));

      expect(handler.handle).toHaveBeenCalledTimes(1);
      expect(handler2.handle).toHaveBeenCalledTimes(1);
    });
  });
});
