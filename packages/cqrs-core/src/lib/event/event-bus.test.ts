/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EventContract } from './event';
import { EventBus, type EventBusContract } from './event-bus';
import type { EventHandlerContract } from './event-handler';

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
    test('should register a event handler as a function and unregister it', () => {
      const eventName = 'testEvent';
      const handler = vitest.fn();

      const unregister = eventBus.bind(eventName).to(handler);

      expect(() => eventBus.execute(new TestEvent(eventName))).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);

      unregister();

      expect(() =>
        eventBus.execute(new TestEvent(eventName))
      ).rejects.toThrow();
    });

    test('should register a event handler as an object and unregister it', () => {
      const eventName = 'testEvent';
      const handler = {
        execute: vitest.fn(),
      };

      const unregister = eventBus.bind(eventName).to(handler);

      expect(() => eventBus.execute(new TestEvent(eventName))).not.toThrow();
      expect(handler.execute).toHaveBeenCalledTimes(1);

      unregister();

      expect(() =>
        eventBus.execute(new TestEvent(eventName))
      ).rejects.toThrow();
    });

    test('should register a event handler as a class and unregister it', () => {
      const eventName = 'testEvent';
      class TestEventHandler implements EventHandlerContract<TestEvent> {
        execute(): Promise<string> {
          return Promise.resolve('test');
        }
      }

      const handler = new TestEventHandler();

      const unregister = eventBus.bind(eventName).to(handler);

      expect(() => eventBus.execute(new TestEvent(eventName))).not.toThrow();

      unregister();

      expect(() =>
        eventBus.execute(new TestEvent(eventName))
      ).rejects.toThrow();
    });
  });

  test('should execute a event without interceptor configured', async () => {
    const eventName = 'testEvent';
    const event = new TestEvent(eventName);
    const handler = vitest.fn();

    eventBus.bind(eventName).to(handler);

    await eventBus.execute(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  test('should apply an interceptor globally', async () => {
    const interceptor = vitest.fn();
    const event = new TestEvent('testEvent');
    const event2 = new TestEvent('testEvent2');

    eventBus.bind('testEvent').to(async () => 'test');
    eventBus.bind('testEvent2').to(async () => 'test');
    eventBus.interceptors.apply(interceptor);

    await Promise.all([eventBus.execute(event), eventBus.execute(event2)]);

    expect(interceptor).toHaveBeenCalledWith(event, expect.any(Function));
    expect(interceptor).toHaveBeenCalledWith(event2, expect.any(Function));
  });

  describe('task manager', () => {
    test('should execute the same event only once', async () => {
      const eventName = 'testEvent';
      const handler = vitest.fn().mockResolvedValue('result');

      eventBus.bind(eventName).to(handler);

      const event = new TestEvent(eventName);

      await Promise.all([
        eventBus.execute(event),
        eventBus.execute(event),
        eventBus.execute(event),
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should intercept the same event execution and execute the event only once', async () => {
      const eventName = 'testEvent';
      const handler = vitest.fn().mockResolvedValue('result');
      const interceptor = vitest
        .fn()
        .mockImplementation(async (event, next) => {
          return next?.(event);
        });

      eventBus.bind(eventName).to(handler);
      eventBus.interceptors.apply(interceptor);

      const event = new TestEvent(eventName);

      await Promise.all([
        eventBus.execute(event),
        eventBus.execute(event),
        eventBus.execute(event),
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(interceptor).toHaveBeenCalledTimes(1);
    });
  });

  describe('aborting the event execution', () => {
    test('should stop the execution of the event by using the abort controller from event context', async () => {
      const eventName = 'testEvent';
      const handler = vitest.fn().mockResolvedValue('result');
      const interceptor = vitest
        .fn()
        .mockImplementation(async (event, next) => {
          event.abortController.abort();
          return next?.(event);
        });

      eventBus.bind(eventName).to(handler);
      eventBus.interceptors.apply(interceptor);

      const event = new TestEvent(eventName);

      await expect(eventBus.execute(event)).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
      expect(interceptor).toHaveBeenCalledTimes(1);
    });
  });
});
