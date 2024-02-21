import type { VoidFunction } from '../types';

export abstract class Observable {
  #listeners: Set<VoidFunction>;

  constructor() {
    this.#listeners = new Set();
  }

  subscribe(listener: VoidFunction) {
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  protected get listeners() {
    return this.#listeners;
  }
}
