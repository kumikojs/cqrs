import { BusException } from '../internal/bus/bus_options';
import { EventBus } from './event_bus';

interface UserCreatedEvent {
  eventName: 'user.created';
  payload: { id: number; name: string };
}

interface UserUpdatedEvent {
  eventName: 'user.updated';
  payload: { id: number; name: string };
}

type KnownEvents = {
  'user.created': UserCreatedEvent;
  'user.updated': UserUpdatedEvent;
};

describe('EventBus', () => {
  let bus: EventBus<KnownEvents>;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should subscribe to an event with a handler function', async () => {
    const mockHandler = vitest.fn();
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
      handle: vitest.fn(),
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

  it('should unsubscribe from an event', async () => {
    const mockHandler = vitest.fn();
    const unsubscribe = bus.on('user.created', mockHandler);

    unsubscribe();

    expect(
      bus.emit({
        eventName: 'user.created',
        payload: { id: 3, name: 'Bob Smith' },
      })
    ).rejects.toThrowError(
      new BusException('NO_HANDLER_FOUND', {
        message: 'No handler found for this channel.',
        channel: 'user.created',
      })
    );

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should emit an event to subscribed handlers', async () => {
    const mockHandler1 = vitest.fn();
    const mockHandler2 = vitest.fn();

    bus.on('user.created', mockHandler1);
    bus.on('user.created', mockHandler2);

    await bus.emit({
      eventName: 'user.created',
      payload: { id: 4, name: 'Alice Jones' },
    });

    expect(mockHandler1).toHaveBeenCalledTimes(1);
    expect(mockHandler2).toHaveBeenCalledTimes(1);
  });
});
