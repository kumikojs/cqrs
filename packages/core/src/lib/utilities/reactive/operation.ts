import { Subject } from './subject';

const STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
  STALE: 'stale',
} as const;

type PendingResult = {
  status: 'pending';
  isPending: true;
  isIdle: false;
  isFulfilled: false;
  isRejected: false;
  isStale: false;
};

type IdleResult = {
  status: 'idle';
  isPending: false;
  isIdle: true;
  isFulfilled: false;
  isRejected: false;
  isStale: false;
};

type FulfilledResult = {
  status: 'fulfilled';
  isPending: false;
  isIdle: false;
  isFulfilled: true;
  isRejected: false;
  isStale: false;
};

type RejectedResult = {
  status: 'rejected';
  isPending: false;
  isIdle: false;
  isFulfilled: false;
  isRejected: true;
  isStale: false;
};

type StaleResult = {
  status: 'stale';
  isPending: false;
  isIdle: false;
  isFulfilled: false;
  isRejected: false;
  isStale: true;
};

type OperationState<T> = {
  response?: T;
  error?: Error;
};

/**
 * The result of an operation.
 *
 * @template T - The type of the operation response.
 * @property {string} status - The status of the operation.
 * @property {boolean} isPending - Whether the operation is pending.
 * @property {boolean} isIdle - Whether the operation is idle.
 * @property {boolean} isFulfilled - Whether the operation is fulfilled.
 * @property {boolean} isRejected - Whether the operation is rejected.
 * @property {boolean} isStale - Whether the operation is stale.
 * @property {T | undefined} response - The response of the operation.
 * @property {Error | undefined} error - The error of the operation.
 */
export type OperationResult<T> = OperationState<T> &
  (PendingResult | IdleResult | FulfilledResult | RejectedResult | StaleResult);

/**
 * Wraps an operation and provides a reactive interface for it.
 *
 * @template T - The type of the operation response.
 * @extends {Subject<OperationResult<T>>}
 */
export class Operation<T> extends Subject<OperationResult<T>> {
  constructor() {
    super({
      status: STATUS.IDLE,
      isIdle: true,
      isPending: false,
      isFulfilled: false,
      isRejected: false,
      isStale: false,
    });
  }

  /**
   * Executes an operation and updates the state accordingly.
   *
   * @template TOperation - The type of the operation.
   * @template TResponse - The type of the operation response.
   * @param {TOperation} operation - The operation to execute.
   * @param {(operation: TOperation) => Promise<TResponse>} handlerFn - The handler function for the operation.
   * @returns {Promise<TResponse>} The response of the operation.
   */
  async execute<TOperation = unknown, TResponse extends T = T>(
    operation: TOperation,
    handlerFn: (operation: TOperation) => Promise<TResponse>
  ): Promise<TResponse> {
    this.state = {
      ...this.state,
      status: STATUS.PENDING,
      isPending: true,
      isIdle: false,
      isFulfilled: false,
      isRejected: false,
      isStale: false,
    };

    try {
      const response = await handlerFn(operation);

      this.state = {
        status: STATUS.FULFILLED,
        response,
        isPending: false,
        isIdle: false,
        isFulfilled: true,
        isRejected: false,
        isStale: false,
      };

      return response;
    } catch (error) {
      this.state = {
        error: error instanceof Error ? error : new Error(String(error)),
        status: STATUS.REJECTED,
        isPending: false,
        isIdle: false,
        isFulfilled: false,
        isRejected: true,
        isStale: false,
      };
      throw error;
    }
  }

  /**
   * Marks the operation as stale.
   */
  stale(value: T) {
    this.state = {
      status: STATUS.STALE,
      response: value,
      isPending: false,
      isIdle: false,
      isFulfilled: false,
      isRejected: false,
      isStale: true,
    };
  }
}
