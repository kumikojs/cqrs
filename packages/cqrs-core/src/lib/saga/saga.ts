import { StateMachine } from './internal/state_machine';
import { Stepper } from './internal/stepper';

import type { EventBusContract, EventContract } from '../event/contracts';

/**
 * A step is a single unit of work that can be executed as part of a saga.
 * It can also have a compensation step that is executed if the step fails.
 */
export type Step = {
  /**
   * The step to execute.
   * This is the main function that will be executed as part of the saga.
   * It should contain the main logic of the step.
   *
   * @param request - The request data for the step.
   */
  execute: <TRequest>(request: TRequest) => Promise<void>;

  /**
   * The optional compensation step to execute.
   * This is the function that will be executed if the step fails.
   * It should contain the logic to undo the work done by the main step.
   *
   * @param request - The request data for the step.
   */
  compensate?: <TRequest>(request: TRequest) => Promise<void>;
};

/**
 * The saga contract.
 */
interface SagaContract {
  /**
   * Run the saga on a specific event.
   *
   * @param eventName - The name of the event to run the saga on.
   * @param steps - The steps to run as part of the saga.
   */
  runOn(eventName: EventContract['eventName'], steps: Step[]): void;

  /**
   * Run the saga.
   *
   * @param data - The data to run the saga with.
   */
  run<T>(data: T): void;

  /**
   * Add a step to the saga.
   *
   * @param step - The step to add to the saga.
   * @returns The saga instance.
   */
  addStep(step: Step): this;

  /**
   * Add multiple steps to the saga.
   *
   * @param steps - The steps to add to the saga.
   * @returns The saga instance.
   */
  addSteps(...steps: Step[]): this;
}

/**
 * The saga class.
 *
 * This class is responsible for running a saga.
 * A saga is a sequence of steps that are executed in response to an event.
 * If any step fails, the saga will be rolled back by executing the compensation steps.
 *
 * @implements SagaContract - The saga contract. {@link SagaContract}
 */
export class Saga implements SagaContract {
  #eventBus: EventBusContract;
  #stateMachine: StateMachine = new StateMachine();
  #stepper: Stepper = new Stepper();

  constructor(eventBus: EventBusContract) {
    this.#eventBus = eventBus;
  }

  /**
   * Run the saga on a specific event.
   *
   * @param eventName - The name of the event to run the saga on.
   * @param steps - The steps to run as part of the saga.
   * @returns A function to unsubscribe from the event.
   */
  public runOn(eventName: EventContract['eventName']) {
    return this.#eventBus.on(eventName, async (event: EventContract) => {
      await this.run(event);
    });
  }

  /**
   * Run the saga.
   *
   * @param data - The data to run the saga with.
   */
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

  /**
   * Add a step to the saga.
   *
   * @param step - The step to add to the saga.
   * @returns The saga instance.
   */
  addStep(step: Step) {
    this.#stepper.add(step);

    return this;
  }

  /**
   * Add multiple steps to the saga.
   *
   * @param steps - The steps to add to the saga.
   * @returns The saga instance.
   */
  addSteps(...steps: Step[]) {
    this.#stepper.add(...steps);

    return this;
  }

  /**
   * Get the current state of the saga.
   *
   * @returns The current state of the saga.
   */
  public get state() {
    return this.#stateMachine.state;
  }
}
