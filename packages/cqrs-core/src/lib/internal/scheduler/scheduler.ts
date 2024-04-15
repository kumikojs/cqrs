import { ms } from '../ms/ms';

import type { DurationUnit } from '../../types';

export class Scheduler {
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

  start() {
    setInterval(() => {
      this.#tasks.forEach((task) => {
        task();
      });
    }, ms(this.#interval));

    return this;
  }

  stop() {
    clearInterval(this.#interval);

    return this;
  }
}
