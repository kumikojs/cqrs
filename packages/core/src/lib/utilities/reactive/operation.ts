import { Subject } from './subject';

export const OPERATION_STATE = {
  INITIAL: 'initial',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  OUTDATED: 'outdated',
} as const;

export type OperationStateType =
  (typeof OPERATION_STATE)[keyof typeof OPERATION_STATE];

export type BaseMetadata = Record<string, unknown>;

export interface BaseState<T, M extends BaseMetadata = BaseMetadata> {
  response?: T;
  error?: Error;
  metadata?: M;
}

type StateResult<S extends OperationStateType> = {
  state: S;
} & {
  [K in OperationStateType as `is${Capitalize<K>}`]: K extends S ? true : false;
};

type OperationStateResult<
  S extends OperationStateType,
  T,
  M extends BaseMetadata
> = BaseState<T, M> & StateResult<S>;

export type InitialState<T, M extends BaseMetadata> = OperationStateResult<
  typeof OPERATION_STATE.INITIAL,
  T,
  M
>;
export type LoadingState<T, M extends BaseMetadata> = OperationStateResult<
  typeof OPERATION_STATE.LOADING,
  T,
  M
>;
export type SuccessState<T, M extends BaseMetadata> = OperationStateResult<
  typeof OPERATION_STATE.SUCCESS,
  T,
  M
>;
export type ErrorState<T, M extends BaseMetadata> = OperationStateResult<
  typeof OPERATION_STATE.ERROR,
  T,
  M
>;
export type OutdatedState<T, M extends BaseMetadata> = OperationStateResult<
  typeof OPERATION_STATE.OUTDATED,
  T,
  M
>;

export type OperationResult<T, M extends BaseMetadata = BaseMetadata> =
  | InitialState<T, M>
  | LoadingState<T, M>
  | SuccessState<T, M>
  | ErrorState<T, M>
  | OutdatedState<T, M>;

export interface OperationOptions<M extends BaseMetadata> {
  metadata?: M;
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
}

export class Operation<
  T,
  M extends BaseMetadata = BaseMetadata
> extends Subject<OperationResult<T, M>> {
  constructor(initialMetadata?: M) {
    super({
      state: OPERATION_STATE.INITIAL,
      isInitial: true,
      isLoading: false,
      isSuccess: false,
      isError: false,
      isOutdated: false,
      ...(initialMetadata ? { metadata: initialMetadata } : {}),
    } as OperationResult<T, M>);
  }

  async execute<TOperation = unknown, TResponse extends T = T>(
    operation: TOperation,
    handlerFn: (operation: TOperation) => Promise<TResponse>,
    options: OperationOptions<M> = {}
  ): Promise<TResponse> {
    this.state = {
      ...this.state,
      state: OPERATION_STATE.LOADING,
      isLoading: true,
      isInitial: false,
      isSuccess: false,
      isError: false,
      isOutdated: false,
      ...(options.metadata ? { metadata: options.metadata } : {}),
    } as OperationResult<T, M>;

    try {
      const response = await handlerFn(operation);

      this.state = {
        state: OPERATION_STATE.SUCCESS,
        response,
        isLoading: false,
        isInitial: false,
        isSuccess: true,
        isError: false,
        isOutdated: false,
        ...(this.state.metadata ? { metadata: this.state.metadata } : {}),
      } as OperationResult<T, M>;

      options.onSuccess?.(response);
      return response;
    } catch (error) {
      const errorObject =
        error instanceof Error ? error : new Error(String(error));

      this.state = {
        error: errorObject,
        state: OPERATION_STATE.ERROR,
        isLoading: false,
        isInitial: false,
        isSuccess: false,
        isError: true,
        isOutdated: false,
        ...(this.state.metadata ? { metadata: this.state.metadata } : {}),
      } as OperationResult<T, M>;

      options.onError?.(errorObject);
      throw error;
    }
  }

  updateMetadata(metadata: Partial<M>) {
    this.state = {
      ...this.state,
      metadata: {
        ...this.state.metadata,
        ...metadata,
      },
    } as OperationResult<T, M>;
  }

  markAsOutdated(value: T, metadata?: M) {
    this.state = {
      state: OPERATION_STATE.OUTDATED,
      response: value,
      isLoading: false,
      isInitial: false,
      isSuccess: false,
      isError: false,
      isOutdated: true,
      ...(metadata || this.state.metadata
        ? {
            metadata: {
              ...this.state.metadata,
              ...metadata,
            },
          }
        : {}),
    } as OperationResult<T, M>;
  }
}
