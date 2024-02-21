import type { Step } from '../saga';

export class SagaStepManager {
  #currentStep: number;
  #steps: Step[];

  constructor() {
    this.#steps = [];
    this.#currentStep = 0;
  }

  public add(...steps: Step[]): void {
    this.#steps.push(...steps);
  }

  async run<T>(data: T): Promise<void> {
    this.#currentStep = 0;

    for (const step of this.#steps) {
      await step.execute(data);
      this.#currentStep++;
    }
  }

  async compensate<T>(data: T): Promise<void> {
    const steps = this.#getStepsToCompensate().reverse();

    for (const step of steps) {
      if (step.compensate) {
        await step.compensate(data);
      }
    }
  }

  #getStepsToCompensate = () => {
    return this.#steps.slice(0, this.#currentStep + 1);
  };
}
