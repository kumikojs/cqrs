/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  InvalidHandlerException,
  MaxHandlersPerChannelException,
  NoHandlerFoundException,
} from '../bus_exception';
import { MemoryBusDriver } from './memory_bus';

const CHANNEL_NAME = 'channel';

describe('MemoryBusDriver', () => {
  describe('when configured with maxHandlersPerChannel option', () => {
    it('should throw an error when trying to subscribe more than one handler to a channel', async () => {
      const bus = new MemoryBusDriver<string>({ maxHandlersPerChannel: 1 });
      const handler1 = vitest.fn();

      bus.subscribe(CHANNEL_NAME, handler1);
      expect(() => bus.subscribe(CHANNEL_NAME, vitest.fn())).toThrowError(
        new MaxHandlersPerChannelException(CHANNEL_NAME, 1)
      );
    });

    it('should allow multiple handlers to subscribe to a channel when the limit is higher', async () => {
      const bus = new MemoryBusDriver<string>({ maxHandlersPerChannel: 2 });
      const handler1 = vitest.fn();
      const handler2 = vitest.fn();

      bus.subscribe(CHANNEL_NAME, handler1);
      bus.subscribe(CHANNEL_NAME, handler2);

      expect(bus).toBeDefined(); // Check if bus instance is defined
    });
  });

  describe('when configured with mode option', () => {
    it('should throw an error when no handler is found in hard mode during publishing', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'hard' });

      await expect(bus.publish(CHANNEL_NAME, {})).rejects.toThrowError(
        new NoHandlerFoundException(CHANNEL_NAME)
      );
    });

    it('should not throw an error when no handler is found in soft mode during publishing', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });

      await expect(bus.publish(CHANNEL_NAME, {})).resolves.not.toThrow();
    });

    it('should throw an error when trying to unsubscribe a non-existing handler in hard mode', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'hard' });

      const handler = vitest.fn();

      expect(() => bus.unsubscribe(CHANNEL_NAME, handler)).toThrowError(
        new NoHandlerFoundException(CHANNEL_NAME)
      );
    });

    it('should not throw an error when trying to unsubscribe a non-existing handler in soft mode', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });
      const handler = vitest.fn();

      bus.subscribe(CHANNEL_NAME, handler);

      expect(() => bus.unsubscribe(CHANNEL_NAME, vitest.fn())).not.toThrow();
    });
  });

  describe('Pub/Sub functionality', () => {
    it('should call the subscribed handler when a message is published to the channel', async () => {
      const bus = new MemoryBusDriver<string>();
      const handler = vitest.fn();

      bus.subscribe(CHANNEL_NAME, handler);
      await bus.publish(CHANNEL_NAME, 'test');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should stop calling the handler after it is unsubscribed from the channel', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });
      const handler = vitest.fn();

      bus.subscribe(CHANNEL_NAME, handler);
      await bus.publish(CHANNEL_NAME, 'test');

      expect(handler).toHaveBeenCalledTimes(1);

      bus.unsubscribe(CHANNEL_NAME, handler);
      await bus.publish(CHANNEL_NAME, 'test');

      expect(handler).toHaveBeenCalledTimes(1); // Verify the handler was not called again
    });

    it('should allow multiple handlers to be subscribed and correctly invoke them on publish', async () => {
      const bus = new MemoryBusDriver<string>({
        mode: 'soft',
        maxHandlersPerChannel: 2,
      });

      const handler1 = vitest.fn();
      const handler2 = vitest.fn();

      bus.subscribe(CHANNEL_NAME, handler1);
      bus.subscribe(CHANNEL_NAME, handler2);

      await bus.publish(CHANNEL_NAME, 'test');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      bus.unsubscribe(CHANNEL_NAME, handler1);
      await bus.publish(CHANNEL_NAME, 'test');

      expect(handler1).toHaveBeenCalledTimes(1); // Verify handler1 was not called again
      expect(handler2).toHaveBeenCalledTimes(2); // Verify handler2 was called again
    });
  });

  describe('disconnect functionality', () => {
    it('should clear all subscriptions when disconnect is called', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });
      const handler = vitest.fn();

      bus.subscribe(CHANNEL_NAME, handler);
      await bus.publish(CHANNEL_NAME, 'test');

      expect(handler).toHaveBeenCalledTimes(1);

      bus.disconnect();

      await bus.publish(CHANNEL_NAME, 'test');
      expect(handler).toHaveBeenCalledTimes(1); // Should not be called again after disconnect
    });
  });

  describe('handler validation', () => {
    it('should throw an error if a handler is of an invalid type', async () => {
      const bus = new MemoryBusDriver<string>({
        mode: 'hard',
      });

      // Invalid handler missing necessary methods
      const invalidHandler: any = {
        badMethod: vitest.fn(),
      };

      expect(() => bus.subscribe(CHANNEL_NAME, invalidHandler)).toThrowError(
        new InvalidHandlerException(CHANNEL_NAME)
      );
    });
  });
});
