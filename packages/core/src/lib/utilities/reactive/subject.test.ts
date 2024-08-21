import { Subject } from './subject';

describe('Subject', () => {
  it('should notify listeners when state changes', () => {
    const subject = new Subject<number>(0);
    const listener = vitest.fn();

    subject.subscribe(listener);
    subject.state = 1;

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should not notify listeners when state does not change', () => {
    const subject = new Subject<number>(0);
    const listener = vitest.fn();

    subject.subscribe(listener);
    subject.state = 0;

    expect(listener).not.toHaveBeenCalled();
  });

  it('should not notify listeners when unsubscribed', () => {
    const subject = new Subject<number>(0);
    const listener = vitest.fn();
    const unsubscribe = subject.subscribe(listener);

    unsubscribe();
    subject.state = 1;

    expect(listener).not.toHaveBeenCalled();
  });
});
