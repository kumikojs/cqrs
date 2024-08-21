import { ms } from '../../utilities/ms/ms';

import type { DurationUnit } from '../../types/helpers';

export class CacheScheduler {
  #tasks: VoidFunction[];
  #interval: DurationUnit;

  constructor(interval: DurationUnit) {
    this.#tasks = [];
    this.#interval = interval;
  }

  schedule(task: VoidFunction) {
    this.#tasks.push(task);

    return this;
  }

  connect() {
    setInterval(() => {
      this.#tasks.forEach((task) => {
        task();
      });
    }, ms(this.#interval));

    return this;
  }

  disconnect() {
    clearInterval(this.#interval);

    return this;
  }
}
