/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventBus } from '../event/bus';
import { Saga } from './saga';

import type { EventBusContract } from '../event/contracts';

describe('Saga', () => {
  let saga: Saga;
  let eventBus: EventBusContract;

  beforeEach(() => {
    eventBus = new EventBus();
    saga = new Saga(eventBus);
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

    await eventBus.emit(event);

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
