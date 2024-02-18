type SagaStates = 'idle' | 'running' | 'completed' | 'failed' | 'compensated';

type SagaAction = {
  type: 'run' | 'compensate' | 'error' | 'complete';
};

export class SagaStateMachine {
  #state: SagaStates;

  constructor() {
    this.#state = 'idle';
  }

  public get state(): SagaStates {
    return this.#state;
  }

  public transition(action: SagaAction): void {
    switch (action.type) {
      case 'run':
        if (
          this.#state === 'idle' ||
          this.#state === 'compensated' ||
          this.#state === 'failed' ||
          this.#state === 'completed'
        ) {
          this.#state = 'running';
        } else {
          throw new Error('Invalid transition');
        }
        break;
      case 'error':
        if (this.#state === 'running') {
          this.#state = 'failed';
        } else {
          throw new Error('Invalid transition');
        }
        break;
      case 'compensate':
        if (this.#state === 'failed') {
          this.#state = 'compensated';
        } else {
          throw new Error('Invalid transition');
        }
        break;
      case 'complete':
        if (this.#state === 'running') {
          this.#state = 'completed';
        } else {
          throw new Error('Invalid transition');
        }
        break;
    }
  }
}
