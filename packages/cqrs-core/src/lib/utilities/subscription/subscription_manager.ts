import type { VoidFunction } from '../../types/helpers';

export class SubscriptionManager {
  #subscriptions: VoidFunction[] = [];

  subscribe(subscription: VoidFunction) {
    this.#subscriptions.push(subscription);

    return this;
  }

  unsubscribe(subscription: VoidFunction) {
    this.#subscriptions = this.#subscriptions.filter(
      (sub) => sub !== subscription
    );

    return this;
  }

  disconnect() {
    for (const subscription of this.#subscriptions) {
      subscription();
    }
  }
}
