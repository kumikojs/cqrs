import { Observable } from './observable';

/**
 * A subject is a reactive object that can be observed by multiple observers.
 * It is used to notify observers when its state changes.
 */
export class Subject<T> extends Observable {
  /**
   * The state of the subject.
   * This state is used to notify observers when it changes.
   */
  #state: T;

  constructor(state: T) {
    super();

    this.#state = state;
  }

  /**
   * Get the state of the subject.
   *
   * @returns The state of the subject.
   */
  get state(): T {
    return this.#state;
  }

  /**
   * Set the state of the subject.
   * This will notify all observers of the change.
   *
   * @param state - The new state of the subject.
   */
  set state(state: T) {
    if (this.#state !== state) {
      this.#state = state;
      this.notify();
    }
  }

  /**
   * Notify all observers of the subject.
   */
  protected notify() {
    this.listeners.forEach((listener) => listener());
  }
}
