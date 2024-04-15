import { VoidFunction } from '../../types';

export class SubscriptionManager {
  #subscriptions: VoidFunction[] = [];

  subscribe(subscription: VoidFunction) {
    this.#subscriptions.push(subscription);

    return this;
  }

  unsubscribe() {
    for (const subscription of this.#subscriptions) {
      subscription();
    }
  }
}
