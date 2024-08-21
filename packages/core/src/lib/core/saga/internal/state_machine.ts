export const RUN_ACTION = 'run';
export const COMPENSATE_ACTION = 'compensate';
export const ERROR_ACTION = 'error';
export const COMPLETE_ACTION = 'complete';

const IDLE_STATE = 'idle';
const RUNNING_STATE = 'running';
const COMPLETED_STATE = 'completed';
const FAILED_STATE = 'failed';
const COMPENSATED_STATE = 'compensated';

type SagaStates =
  | typeof IDLE_STATE
  | typeof RUNNING_STATE
  | typeof COMPLETED_STATE
  | typeof FAILED_STATE
  | typeof COMPENSATED_STATE;

type SagaAction = {
  type:
    | typeof RUN_ACTION
    | typeof COMPENSATE_ACTION
    | typeof ERROR_ACTION
    | typeof COMPLETE_ACTION;
};

class StateMachineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateMachineError';
  }
}

export class StateMachine {
  #state: SagaStates;

  constructor() {
    this.#state = IDLE_STATE;
  }

  public get state(): SagaStates {
    return this.#state;
  }

  public transition(action: SagaAction): void {
    switch (action.type) {
      case RUN_ACTION:
        if (
          this.#state === IDLE_STATE ||
          this.#state === COMPENSATED_STATE ||
          this.#state === FAILED_STATE ||
          this.#state === COMPLETED_STATE
        ) {
          this.#state = RUNNING_STATE;
        } else {
          throw new StateMachineError(
            'Invalid transition: ' + this.#state + ' -> ' + RUNNING_STATE
          );
        }
        break;
      case ERROR_ACTION:
        if (this.#state === RUNNING_STATE) {
          this.#state = FAILED_STATE;
        } else {
          throw new StateMachineError(
            'Invalid transition: ' + this.#state + ' -> ' + FAILED_STATE
          );
        }
        break;
      case COMPENSATE_ACTION:
        if (this.#state === FAILED_STATE) {
          this.#state = COMPENSATED_STATE;
        } else {
          throw new StateMachineError(
            'Invalid transition: ' + this.#state + ' -> ' + COMPENSATED_STATE
          );
        }
        break;
      case COMPLETE_ACTION:
        if (this.#state === RUNNING_STATE) {
          this.#state = COMPLETED_STATE;
        } else {
          throw new StateMachineError(
            'Invalid transition: ' + this.#state + ' -> ' + COMPLETED_STATE
          );
        }
        break;
    }
  }
}
