import type { EventContract } from '../event/event';
import { EventBus, type EventBusContract } from '../event/bus';
import { SagaStateMachine } from './internal/saga-state-machine';
import { SagaStepManager } from './internal/saga-step-manager';

export type Step = {
  execute: <TRequest>(request: TRequest) => Promise<void>;
  compensate?: <TRequest>(request: TRequest) => Promise<void>;
};

interface SagaContract {
  runOn(eventName: EventContract['eventName'], steps: Step[]): void;
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
