/* eslint-disable @typescript-eslint/no-explicit-any */

import { BusException } from '../bus_options';
import { MemoryBusDriver } from './memory_bus';

describe('MemoryBusDriver', () => {
  describe('maxHandlersPerChannel option', () => {
    it('should allow only one handler per channel', async () => {
      const bus = new MemoryBusDriver<string>({ maxHandlersPerChannel: 1 });

      bus.subscribe('channel', vitest.fn());
      expect(() => bus.subscribe('channel', vitest.fn())).toThrowError(
        new BusException('MAX_HANDLERS_PER_CHANNEL', {
          message: 'Limit of 1 handler(s) per channel reached.',
          channel: 'channel',
        })
      );
    });

    it('should allow multiple handlers per channel', async () => {
      const bus = new MemoryBusDriver<string>({ maxHandlersPerChannel: 2 });

      bus.subscribe('channel', vitest.fn());
      bus.subscribe('channel', vitest.fn());
    });
  });

  describe('mode option', () => {
    it('should throw an error if no handler is found', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'hard' });

      expect(() => bus.publish('channel', {})).rejects.toThrowError(
        new BusException('NO_HANDLER_FOUND', {
          message: 'No handler found for this channel.',
          channel: 'channel',
        })
      );
    });

    it('should not throw an error if no handler is found', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });

      expect(() => bus.publish('channel', {})).not.toThrow();
    });

    it('should throw an error if handler is not found', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'hard' });

      bus.subscribe('channel', async () => {
        return;
      });

      expect(() =>
        bus.unsubscribe('channel', async () => {
          return;
        })
      ).toThrowError(
        new BusException('NO_HANDLER_FOUND', {
          message: 'No handler found for this channel.',
          channel: 'channel',
        })
      );
    });

    it('should not throw an error if handler is not found', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });

      bus.subscribe('channel', vitest.fn());

      expect(() => bus.unsubscribe('channel', vitest.fn())).not.toThrow();
    });
  });

  describe('pubsub', () => {
    it('should publish and subscribe to a channel', async () => {
      const bus = new MemoryBusDriver<string>();

      const handler = vitest.fn();
      bus.subscribe('channel', handler);

      await bus.publish('channel', 'test');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should publish and unsubscribe from a channel', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });

      const handler = vitest.fn();
      bus.subscribe('channel', handler);

      await bus.publish('channel', 'test');

      expect(handler).toHaveBeenCalledTimes(1);

      bus.unsubscribe('channel', handler);

      await bus.publish('channel', 'test');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should publish and unsubscribe from a channel with multiple handlers', async () => {
      const bus = new MemoryBusDriver<string>({
        mode: 'soft',
        maxHandlersPerChannel: 2,
      });

      const handler = vitest.fn();
      const handler2 = vitest.fn();
      bus.subscribe('channel', handler);
      bus.subscribe('channel', handler2);

      await bus.publish('channel', 'test');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      bus.unsubscribe('channel', handler);

      await bus.publish('channel', 'test');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(2);
    });
  });
});
