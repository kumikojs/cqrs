/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { MemoryBusDriver } from './memory_bus';

describe('MemoryBusDriver', () => {
  describe('maxHandlersPerChannel option', () => {
    it('should allow only one handler per channel', async () => {
      const bus = new MemoryBusDriver<string>({ maxHandlersPerChannel: 1 });

      bus.subscribe('channel', async () => {});
      expect(() => bus.subscribe('channel', async () => {})).toThrowError(
        'Max handler per channel: 1'
      );
    });

    it('should allow multiple handlers per channel', async () => {
      const bus = new MemoryBusDriver<string>({ maxHandlersPerChannel: 2 });

      bus.subscribe('channel', async () => {});
      bus.subscribe('channel', async () => {});
    });
  });

  describe('mode option', () => {
    it('should throw an error if no handler is found', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'hard' });

      expect(() => bus.publish('channel', {})).rejects.toThrowError(
        'No handler for channel: channel'
      );
    });

    it('should not throw an error if no handler is found', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });

      expect(() => bus.publish('channel', {})).not.toThrow();
    });

    it('should throw an error if handler is not found', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'hard' });

      bus.subscribe('channel', async () => {});

      expect(() => bus.unsubscribe('channel', async () => {})).toThrowError(
        'Handler not found for channel: channel'
      );
    });

    it('should not throw an error if handler is not found', async () => {
      const bus = new MemoryBusDriver<string>({ mode: 'soft' });

      bus.subscribe('channel', async () => {});

      expect(() => bus.unsubscribe('channel', async () => {})).not.toThrow();
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
