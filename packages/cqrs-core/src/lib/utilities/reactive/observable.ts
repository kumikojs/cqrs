import type { VoidFunction } from '../../types/helpers';

/**
 * The Observable class is a simple class that allows you to create
 * observable objects that can be subscribed to.
 */
export abstract class Observable {
  /**
   * The listeners set.
   *
   * @type {Set<VoidFunction>}
   */
  #listeners: Set<VoidFunction>;

  constructor() {
    this.#listeners = new Set();
  }

  /**
   * Subscribe to the observable.
   *
   * @param {VoidFunction} listener - The listener to subscribe.
   * @returns {VoidFunction} A function to unsubscribe the listener.
   */
  subscribe(listener: VoidFunction): VoidFunction {
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  /**
   * Get the listeners set.
   * This is used internally by subjects to notify listeners.
   */
  protected get listeners() {
    return this.#listeners;
  }
}
