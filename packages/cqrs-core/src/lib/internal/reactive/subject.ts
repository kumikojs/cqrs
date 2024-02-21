import { Observable } from './observable';

export class Subject<T> extends Observable {
  #state: T | undefined;

  constructor(state?: T) {
    super();

    this.#state = state;
  }

  get state(): T | undefined {
    return this.#state;
  }

  set state(state: T) {
    if (this.#state !== state) {
      this.#state = state;
      this.notify();
    }
  }

  protected notify() {
    this.listeners.forEach((listener) => listener());
  }
}
