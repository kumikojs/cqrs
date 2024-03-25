import { StateMachine } from './internal/state_machine';
import { Stepper } from './internal/stepper';

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
  #stateMachine: StateMachine = new StateMachine();
  #stepper: Stepper = new Stepper();

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
      await this.#stepper.run(data);
      this.#stateMachine.transition({ type: 'complete' });
    } catch (error) {
      this.#stateMachine.transition({ type: 'error' });
      await this.#stepper.compensate(data);
      this.#stateMachine.transition({ type: 'compensate' });
      throw error;
    }
  }

  addStep(step: Step) {
    this.#stepper.add(step);

    return this;
  }

  addSteps(...steps: Step[]) {
    this.#stepper.add(...steps);

    return this;
  }

  public get state() {
    return this.#stateMachine.state;
  }
}
