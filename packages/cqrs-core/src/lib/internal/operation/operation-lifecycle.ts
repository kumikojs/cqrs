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

type FulfilledResult<T> = {
  status: 'fulfilled';
  isPending: false;
  isIdle: false;
  isFulfilled: true;
  isRejected: false;
  response: T;
};

type RejectedResult = {
  status: 'rejected';
  isPending: false;
  isIdle: false;
  isFulfilled: false;
  isRejected: true;
  error: Error;
};

type OperationResult<T> =
  | PendingResult
  | IdleResult
  | FulfilledResult<T>
  | RejectedResult;

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
