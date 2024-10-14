import { EventBus } from './event_bus';
import { NoHandlerFoundException } from '../../infrastructure/bus/bus_exception';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus(new KumikoLogger());
  });

  describe('Subscription Management', () => {
    it('should subscribe to an event with a handler function', async () => {
      const mockHandler = vi.fn();
      const unsubscribe = bus.on('user.created', mockHandler);

      await bus.emit({
        eventName: 'user.created',
        payload: { id: 1, name: 'John Doe' },
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith({
        eventName: 'user.created',
        payload: { id: 1, name: 'John Doe' },
      });

      unsubscribe();
    });

    it('should subscribe to an event with a handler object', async () => {
      const mockHandler = {
        handle: vi.fn(),
      };
      const unsubscribe = bus.on('user.updated', mockHandler);

      await bus.emit({
        eventName: 'user.updated',
        payload: { id: 2, name: 'Jane Doe' },
      });

      expect(mockHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockHandler.handle).toHaveBeenCalledWith({
        eventName: 'user.updated',
        payload: { id: 2, name: 'Jane Doe' },
      });

      unsubscribe();
    });

    it('should allow multiple handlers for the same event', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('user.created', handler1);
      bus.on('user.created', handler2);

      await bus.emit({
        eventName: 'user.created',
        payload: { id: 3, name: 'Alice' },
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe from an event', async () => {
      const handler = vi.fn();
      const unsubscribe = bus.on('user.created', handler);

      unsubscribe(); // Unsubscribe handler

      await expect(
        bus.emit({
          eventName: 'user.created',
          payload: { id: 4, name: 'Bob' },
        })
      ).rejects.toThrowError(NoHandlerFoundException);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw BusException if no handler exists for an event', async () => {
      await expect(
        bus.emit({
          eventName: 'user.created',
          payload: { id: 5, name: 'Unknown' },
        })
      ).rejects.toThrowError(NoHandlerFoundException);
    });

    it('should emit to all handlers and not fail on unsubscription', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const unsubscribe1 = bus.on('user.created', handler1);
      const unsubscribe2 = bus.on('user.created', handler2);

      await bus.emit({
        eventName: 'user.created',
        payload: { id: 6, name: 'Eve' },
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      unsubscribe1();
      unsubscribe2();

      await expect(
        bus.emit({
          eventName: 'user.created',
          payload: { id: 7, name: 'Zoe' },
        })
      ).rejects.toThrowError(NoHandlerFoundException);

      expect(handler1).toHaveBeenCalledTimes(1); // Ensure handlers were unsubscribed
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disconnect', () => {
    it('should disconnect the event bus and clear all handlers', async () => {
      const handler = vi.fn();
      bus.on('user.created', handler);

      bus.disconnect();

      await expect(
        bus.emit({
          eventName: 'user.created',
          payload: { id: 9, name: 'Disconnected User' },
        })
      ).rejects.toThrowError(NoHandlerFoundException);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
