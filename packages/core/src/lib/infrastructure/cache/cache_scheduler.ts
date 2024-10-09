import { ms } from '../../utilities/ms/ms';

import type { DurationUnit } from '../../types/helpers';

type TimerId = number | NodeJS.Timeout;

export class CacheScheduler {
  #tasks: VoidFunction[];
  #interval: DurationUnit;
  #intervalId?: TimerId;

  constructor(interval: DurationUnit) {
    this.#tasks = [];
    this.#interval = interval;
  }

  schedule(task: VoidFunction) {
    this.#tasks.push(task);

    return this;
  }

  connect() {
    if (!this.#intervalId) {
      this.#intervalId = setInterval(() => {
        this.#tasks.forEach((task) => {
          task();
        });
      }, ms(this.#interval));
    }

    return this;
  }

  disconnect() {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }

    return this;
  }
}
