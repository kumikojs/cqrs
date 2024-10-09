import { SubscriptionManager } from './subscription_manager';

describe('SubscriptionManager', () => {
  let subscriptionManager: SubscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  it('should call all subscriptions on disconnect', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    subscriptionManager.subscribe(callback1);
    subscriptionManager.subscribe(callback2);

    subscriptionManager.disconnect();

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it('should not throw an error when disconnecting with no subscriptions', () => {
    expect(() => {
      subscriptionManager.disconnect();
    }).not.toThrow();
  });

  it('should not call unsubscribed functions on disconnect', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    subscriptionManager.subscribe(callback1);
    subscriptionManager.subscribe(callback2);
    subscriptionManager.unsubscribe(callback1);

    subscriptionManager.disconnect();

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });
});
