import {
  BulkheadException,
  BulkheadStrategy,
} from '../strategy/bulkhead-strategy';
import { ThrottleException } from '../strategy/throttle-strategy';
import { TimeoutException } from '../strategy/timeout-strategy';
import { EventContract } from './event';
import { EventClient } from './event-client';

describe('EventClient', () => {
  let eventClient: EventClient;

  beforeEach(() => {
    eventClient = new EventClient({
      bulkheadStrategy: new BulkheadStrategy({
        maxConcurrent: 2,
        maxQueue: 2,
      }),
    });
  });

  test('should apply the fallback strategy', async () => {
    const event = {
      eventName: 'testEvent',
      payload: 'testPayload',
      options: { fallback: () => 'fallback' },
    } as EventContract;

    eventClient.eventBus.bind('testEvent').to(async () => {
      throw new Error('error');
    });

    const result = await eventClient.eventBus.execute(event);

    expect(result).toBe('fallback');
  });

  test('should apply the retry strategy', async () => {
    const event = {
      eventName: 'testEvent',
      options: {
        retry: {
          maxRetries: 1,
          delay: 1000,
        },
      },
    } as EventContract;
    let i = 0;

    eventClient.eventBus.bind('testEvent').to(async () => {
      if (i === 0) {
        i++;
        throw new Error('error');
      }

      return 'retryEvent';
    });

    const result = await eventClient.eventBus.execute(event);
    expect(result).toBe('retryEvent');
  });

  test('should apply the timeout strategy', async () => {
    const event = {
      eventName: 'testEvent',
      options: { timeout: '1ms' },
    } as EventContract;

    eventClient.eventBus.bind('testEvent').to(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testEvent';
    });

    const result = eventClient.eventBus.execute(event);

    expect(result).rejects.toThrowError(new TimeoutException(1));
  });

  test('should apply the bulkhead strategy', async () => {
    const options = { bulkhead: true } as EventContract['options'];

    const handler = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testEvent';
    };

    eventClient.eventBus.bind('testEvent').to(handler);
    eventClient.eventBus.bind('testEvent2').to(handler);
    eventClient.eventBus.bind('testEvent3').to(handler);
    eventClient.eventBus.bind('testEvent4').to(handler);
    eventClient.eventBus.bind('testEvent5').to(handler);

    const result = Promise.all([
      eventClient.eventBus.execute({ eventName: 'testEvent', options }),
      eventClient.eventBus.execute({
        eventName: 'testEvent2',
        options,
      }),
      eventClient.eventBus.execute({
        eventName: 'testEvent3',
        options,
      }),
      eventClient.eventBus.execute({
        eventName: 'testEvent4',
        options,
      }),
      eventClient.eventBus.execute({
        eventName: 'testEvent5',
        options,
      }),
    ]);

    expect(result).rejects.toThrowError(new BulkheadException(2, 2));
  });

  test('should apply the throttle strategy', async () => {
    const event = {
      eventName: 'testEvent',
      options: { throttle: { limit: 2, ttl: '1000ms' } },
    } as EventContract;

    eventClient.eventBus.bind('testEvent').to(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'testEvent';
    });

    eventClient.eventBus.execute(event);
    await new Promise((resolve) => setTimeout(resolve, 100));

    eventClient.eventBus.execute(event);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = eventClient.eventBus.execute(event);

    expect(result).rejects.toThrowError(new ThrottleException(2, '1000ms'));
  });

  describe('compose strategies', () => {
    test('should apply the retry before the fallback strategy', async () => {
      const event = {
        eventName: 'testEvent',
        options: {
          retry: { maxRetries: 2, delay: 100 },
          fallback: () => 'fallback',
        },
      } as EventContract;
      let i = 0;
      const watcher = vitest.fn();
      const handler = async () => {
        if (i <= 2) {
          i++;
          watcher();
          throw new Error('error');
        }

        return 'retryEvent';
      };

      eventClient.eventBus.bind(event.eventName).to(handler);

      const result = await eventClient.eventBus.execute(event);
      expect(result).toBe('fallback');
      expect(watcher).toHaveBeenCalledTimes(3);
    });

    test('should apply the timeout before the retry strategy', async () => {
      const event = {
        eventName: 'testEvent',
        options: {
          timeout: '1ms',
          retry: { maxRetries: 2, delay: 100 },
        },
      } as EventContract;
      let i = 0;
      const watcher = vitest.fn();

      const handler = async () => {
        if (i < 2) {
          i++;
          watcher();
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'testEvent';
        }

        return 'retryEvent';
      };

      eventClient.eventBus.bind(event.eventName).to(handler);

      const result = await eventClient.eventBus.execute(event);
      expect(result).toBe('retryEvent');
      expect(watcher).toHaveBeenCalledTimes(2);
    });

    test('should apply timeout->retry->fallback strategy', async () => {
      const event = {
        eventName: 'testEvent',
        options: {
          timeout: '1ms',
          retry: { maxRetries: 2, delay: 100 },
          fallback: () => 'fallback',
        },
      } as EventContract;
      let i = 0;
      const watcher = vitest.fn();
      const handler = async () => {
        if (i <= 2) {
          i++;
          watcher();
          await new Promise((resolve) => setTimeout(resolve, 100));
          throw new Error('error');
        }

        return 'retryEvent';
      };

      eventClient.eventBus.bind(event.eventName).to(handler);

      const result = await eventClient.eventBus.execute(event);
      expect(result).toBe('fallback');
      expect(watcher).toHaveBeenCalledTimes(3);
    });
  });
});
