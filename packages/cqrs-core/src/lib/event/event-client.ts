import { EventBus, type EventBusContract } from './event-bus';

export class EventClient {
  #eventBus: EventBusContract;

  constructor({ eventBus = new EventBus() } = {}) {
    this.#eventBus = eventBus;
  }

  get eventBus() {
    return this.#eventBus;
  }
}
