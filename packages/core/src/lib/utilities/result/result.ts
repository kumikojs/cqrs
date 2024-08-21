export type Result<T, E> = Success<T, E> | Failure<T, E>;

export class Success<T, E> {
  constructor(public value: T) {}

  isFailure(): this is Failure<T, E> {
    return false;
  }

  isSuccess(): this is Success<T, E> {
    return true;
  }
}

export class Failure<T, E> {
  constructor(public error: E) {}

  isFailure(): this is Failure<T, E> {
    return true;
  }

  isSuccess(): this is Success<T, E> {
    return false;
  }
}
