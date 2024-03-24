import { Subject } from '../reactive/subject';

const STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
} as const;

type PendingResult = {
  status: 'pending';
  isPending: true;
  isIdle: false;
  isFulfilled: false;
  isRejected: false;
};

type IdleResult = {
  status: 'idle';
  isPending: false;
  isIdle: true;
  isFulfilled: false;
  isRejected: false;
};

type FulfilledResult = {
  status: 'fulfilled';
  isPending: false;
  isIdle: false;
  isFulfilled: true;
  isRejected: false;
};

type RejectedResult = {
  status: 'rejected';
  isPending: false;
  isIdle: false;
  isFulfilled: false;
  isRejected: true;
};

type OperationState<T> = {
  response?: T;
  error?: Error;
};

export type OperationResult<T> = OperationState<T> &
  (PendingResult | IdleResult | FulfilledResult | RejectedResult);

export class OperationLifecycle<T> extends Subject<OperationResult<T>> {
  constructor() {
    super({
      status: STATUS.IDLE,
      isIdle: true,
      isPending: false,
      isFulfilled: false,
      isRejected: false,
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
      };
      throw error;
    }
  }
}
