/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EventContract } from '../event/event';
import { EventBus, type EventBusContract } from '../event/event-bus';
import { SagaStateMachine } from './internal/saga-state-machine';
import { SagaStepManager } from './internal/saga-step-manager';

export type Step<T> = {
  execute: (event: EventContract) => Promise<void>;
  compensate?: (data: T) => Promise<void>;
};

interface SagaContract {
  runOn<T>(eventName: EventContract['eventName'], steps: Step<T>[]): void;
}

export class Saga implements SagaContract {
  #eventBus: EventBusContract;
  #stateMachine: SagaStateMachine;
  #sagaStepManager: SagaStepManager;

  constructor({
    eventBus = new EventBus(),
    stateMachine = new SagaStateMachine(),
    sagaStepManager = new SagaStepManager(),
  }: {
    eventBus?: EventBusContract;
    stateMachine?: SagaStateMachine;
    sagaStepManager?: SagaStepManager;
  } = {}) {
    this.#eventBus = eventBus;
    this.#stateMachine = stateMachine;
    this.#sagaStepManager = sagaStepManager;
  }

  public runOn<T>(
    eventName: EventContract['eventName'],
    steps: Step<T>[]
  ): void {
    this.#sagaStepManager.add(...steps);

    this.#eventBus.bind(eventName).to({
      handle: async (event: EventContract) => {
        this.#stateMachine.transition({ type: 'run' });

        try {
          await this.#sagaStepManager.run(event);
          this.#stateMachine.transition({ type: 'complete' });
        } catch (error) {
          this.#stateMachine.transition({ type: 'error' });
          await this.#sagaStepManager.compensate(event);
          this.#stateMachine.transition({ type: 'compensate' });
          throw error;
        }
      },
    });
  }
}
