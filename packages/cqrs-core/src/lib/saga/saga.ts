import { SagaStateMachine } from './internal/saga-state-machine';
import { SagaStepManager } from './internal/saga-step-manager';

import type { EventBusContract, EventContract } from '../event/contracts';

export type Step = {
  execute: <TRequest>(request: TRequest) => Promise<void>;
  compensate?: <TRequest>(request: TRequest) => Promise<void>;
};

interface SagaContract {
  runOn(eventName: EventContract['eventName'], steps: Step[]): void;
}

export class Saga implements SagaContract {
  #eventBus: EventBusContract;
  #stateMachine: SagaStateMachine = new SagaStateMachine();
  #sagaStepManager: SagaStepManager = new SagaStepManager();

  constructor(eventBus: EventBusContract) {
    this.#eventBus = eventBus;
  }

  public runOn(eventName: EventContract['eventName']) {
    return this.#eventBus.on(eventName, async (event: EventContract) => {
      await this.run(event);
    });
  }

  public async run<T>(data: T) {
    this.#stateMachine.transition({ type: 'run' });

    try {
      await this.#sagaStepManager.run(data);
      this.#stateMachine.transition({ type: 'complete' });
    } catch (error) {
      this.#stateMachine.transition({ type: 'error' });
      await this.#sagaStepManager.compensate(data);
      this.#stateMachine.transition({ type: 'compensate' });
      throw error;
    }
  }

  addStep(step: Step) {
    this.#sagaStepManager.add(step);

    return this;
  }

  addSteps(...steps: Step[]) {
    this.#sagaStepManager.add(...steps);

    return this;
  }

  public get state() {
    return this.#stateMachine.state;
  }
}
