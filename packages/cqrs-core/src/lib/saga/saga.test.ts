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
    saga.addStep(step);

    saga.runOn('event');

    await eventBus.handle(event);

    expect(step.execute).toHaveBeenCalledWith(event);
  });

  test('should compensate saga when error occurs', async () => {
    const data = {
      eventName: 'event',
      payload: {},
    };
    const step = {
      execute: vitest.fn().mockRejectedValue(new Error('error')),
      compensate: vitest.fn(),
    };
    saga.addStep(step);

    await expect(saga.run(data)).rejects.toThrow('error');

    expect(step.compensate).toHaveBeenCalledWith(data);
  });
});
