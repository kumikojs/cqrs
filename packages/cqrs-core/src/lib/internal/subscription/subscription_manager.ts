import { VoidFunction } from '../../types';

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

  unsubscribeAll() {
    for (const subscription of this.#subscriptions) {
      subscription();
    }
  }
}
