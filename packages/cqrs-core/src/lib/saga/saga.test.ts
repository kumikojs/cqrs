/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventBus, type EventBusContract } from '../event/event-bus';
import { Saga } from './saga';

describe('Saga', () => {
  let saga: Saga;
  let eventBus: EventBusContract;

  beforeEach(() => {
    eventBus = new EventBus();
    saga = new Saga({
      eventBus,
    });
  });

  test('should run saga when event is received', async () => {
    const event = {
      eventName: 'event',
      payload: {},
    };
    const step = {
      execute: vitest.fn(),
    };
    saga.runOn('event', [step]);
    await eventBus.handle(event);
    expect(step.execute).toHaveBeenCalledWith(event);
  });
});
