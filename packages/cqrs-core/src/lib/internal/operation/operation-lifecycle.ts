import { Subject } from '../reactive/subject';

const STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
  INVALIDATED: 'invalidated',
} as const;

type PendingResult = {
  status: 'pending';
  isPending: true;
  isIdle: false;
  isFulfilled: false;
  isRejected: false;
  isInvalidated: false;
};

type IdleResult = {
  status: 'idle';
  isPending: false;
  isIdle: true;
  isFulfilled: false;
  isRejected: false;
  isInvalidated: false;
};

type FulfilledResult = {
  status: 'fulfilled';
  isPending: false;
  isIdle: false;
  isFulfilled: true;
  isRejected: false;
  isInvalidated: false;
};

type RejectedResult = {
  status: 'rejected';
  isPending: false;
  isIdle: false;
  isFulfilled: false;
  isRejected: true;
  isInvalidated: false;
};

type InvalidatedResult = {
  status: 'invalidated';
  isPending: false;
  isIdle: false;
  isFulfilled: false;
  isRejected: false;
  isInvalidated: true;
};

type OperationState<T> = {
  response?: T;
  error?: Error;
};

export type OperationResult<T> = OperationState<T> &
  (
    | PendingResult
    | IdleResult
    | FulfilledResult
    | RejectedResult
    | InvalidatedResult
  );

export class OperationLifecycle<T> extends Subject<OperationResult<T>> {
  constructor() {
    super({
      status: STATUS.IDLE,
      isIdle: true,
      isPending: false,
      isFulfilled: false,
      isRejected: false,
      isInvalidated: false,
    });
  }

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
      isInvalidated: false,
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
        isInvalidated: false,
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
        isInvalidated: false,
      };
      throw error;
    }
  }

  invalidate() {
    this.state = {
      ...this.state,
      status: STATUS.INVALIDATED,
      isPending: false,
      isIdle: false,
      isFulfilled: false,
      isRejected: false,
      isInvalidated: true,
    };
  }
}
