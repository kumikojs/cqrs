import { CacheScheduler } from './cache_scheduler';
import { ms } from '../../utilities/ms/ms';

describe('CacheScheduler', () => {
  let scheduler: CacheScheduler;
  const interval = '5s';
  const task1 = vitest.fn();
  const task2 = vitest.fn();

  beforeEach(() => {
    scheduler = new CacheScheduler(interval);
    vitest.useFakeTimers();
  });

  afterEach(() => {
    vitest.clearAllMocks();
    scheduler.disconnect();
  });

  describe('schedule', () => {
    it('should execute scheduled tasks at the specified interval', () => {
      scheduler.schedule(task1);
      scheduler.schedule(task2);
      scheduler.connect();

      vitest.advanceTimersByTime(ms(interval));

      expect(task1).toHaveBeenCalledTimes(1);
      expect(task2).toHaveBeenCalledTimes(1);
    });
  });

  describe('connect', () => {
    it('should execute tasks multiple times as the interval elapses', () => {
      scheduler.schedule(task1);
      scheduler.connect();

      vitest.advanceTimersByTime(ms(interval));
      expect(task1).toHaveBeenCalledTimes(1);

      vitest.advanceTimersByTime(ms(interval));
      expect(task1).toHaveBeenCalledTimes(2);
    });
  });

  describe('disconnect', () => {
    it('should stop executing tasks', () => {
      scheduler.schedule(task1);
      scheduler.connect();

      vitest.advanceTimersByTime(ms(interval));
      expect(task1).toHaveBeenCalledTimes(1);

      scheduler.disconnect();

      vitest.advanceTimersByTime(ms(interval));
      expect(task1).toHaveBeenCalledTimes(1);
    });
  });
});
