/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EventContract } from '../../event/event';
import type { Step } from '../saga';

export class SagaStepManager {
  #currentStep: number;
  #steps: Step<any>[];

  constructor() {
    this.#steps = [];
    this.#currentStep = 0;
  }

  public add<T>(...steps: Step<T>[]): void {
    this.#steps.push(...steps);
  }

  async run(event: EventContract): Promise<void> {
    this.#currentStep = 0;

    for (const step of this.#steps) {
      await step.execute(event);
      this.#currentStep++;
    }
  }

  async compensate(event: EventContract): Promise<void> {
    const steps = this.#getStepsToCompensate().reverse();

    for (const step of steps) {
      if (step.compensate) {
        await step.compensate(event);
      }
    }
  }

  #getStepsToCompensate = () => {
    return this.#steps.slice(0, this.#currentStep + 1);
  };
}
