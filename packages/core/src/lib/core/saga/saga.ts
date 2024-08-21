import {
  COMPENSATE_ACTION,
  COMPLETE_ACTION,
  ERROR_ACTION,
  RUN_ACTION,
  StateMachine,
} from './internal/state_machine';
import { Stepper } from './internal/stepper';
import { EventBus } from '../event/event_bus';

import type { Event } from '../../types/core/event';

/**
 * Represents a single unit of work within a saga execution flow.
 *
 * A `Step` defines both the primary execution logic and an optional compensation step to handle failures.
 */
export type Step = {
  /**
   * The core function of the step, containing the essential logic to be executed as part of the saga.
   *
   * @param request - The request data passed to the step for processing.
   * @returns A Promise that resolves upon successful step execution.
   */
  execute: <TRequest>(request: TRequest) => Promise<void>;

  /**
   * An optional compensation function to be invoked if the `execute` step encounters an error.
   * This function's purpose is to undo the work performed by the primary step, ensuring data consistency.
   *
   * @param request - The same request data used by the `execute` step.
   * @returns A Promise that resolves upon successful compensation execution (if applicable).
   */
  compensate?: <TRequest>(request: TRequest) => Promise<void>;
};

/**
 * A saga coordinates a sequence of steps triggered in response to specific events.
 * If any step within the saga fails, the entire saga is rolled back by executing the compensation steps of preceding steps.
 */
export class Saga {
  /** @private The event bus used for event subscription. */
  #eventBus: EventBus;

  /** @private The internal state machine for tracking saga execution state. */
  #stateMachine: StateMachine = new StateMachine();

  /** @private The stepper instance responsible for managing step execution and compensation. */
  #stepper: Stepper = new Stepper();

  /**
   * Creates a new Saga instance.
   *
   * @param eventBus - The event bus to use for event subscription.
   */
  constructor(eventBus: EventBus) {
    this.#eventBus = eventBus;
  }

  /**
   * Attaches the saga to a specific event emitted by the event bus.
   *
   * @param eventName - The name of the event that triggers saga execution.
   * @param steps - An array of `Step` objects defining the saga's execution flow.
   * @returns A function to unsubscribe from the attached event listener.
   */
  public runOn(eventName: Event['eventName']) {
    return this.#eventBus.on(eventName, async (event: Event) => {
      await this.run(event);
    });
  }

  /**
   * Executes the saga with the provided data.
   *
   * @param data - The data used for processing within the saga's steps.
   * @returns A Promise that resolves upon successful saga completion or rejects with an error if any step fails.
   */
  public async run<T>(data: T) {
    this.#stateMachine.transition({ type: RUN_ACTION });

    try {
      await this.#stepper.run(data);
      this.#stateMachine.transition({ type: COMPLETE_ACTION });
    } catch (error) {
      this.#stateMachine.transition({ type: ERROR_ACTION });
      await this.#stepper.compensate(data);
      this.#stateMachine.transition({ type: COMPENSATE_ACTION });
      throw error; // Re-throw the error for external handling
    }
  }

  /**
   * Adds a single step to the saga's execution flow.
   *
   * @param step - The `Step` object to be incorporated into the saga.
   * @returns The `Saga` instance itself, allowing for method chaining.
   */
  addStep(step: Step) {
    this.#stepper.add(step);

    return this;
  }

  /**
   * Adds multiple steps to the saga's execution flow in a single call.
   *
   * @param steps - An array of `Step` objects representing the steps to be added.
   * @returns The `Saga` instance itself, allowing for method chaining.
   */
  addSteps(...steps: Step[]) {
    this.#stepper.add(...steps);

    return this;
  }

  /**
   * Retrieves the current state of the saga's internal state machine.
   *
   * @returns The current state of the `StateMachine` instance.
   */
  public get state() {
    return this.#stateMachine.state;
  }
}
