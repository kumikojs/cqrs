import type { Event, EventBusContract } from '../../types/core/event';
import { Subject } from '../../utilities/reactive/subject';

export class Signal<T extends Event> extends Subject<T['payload']> {
  #eventBus: EventBusContract;
  #signalName: string;

  constructor(
    eventBus: EventBusContract,
    signalName: string,
    initialState: T['payload']
  ) {
    super(initialState);
    this.#eventBus = eventBus;
    this.#signalName = signalName;

    this.#eventBus.on(this.#signalName, async (event: T) => {
      this.state = event.payload;
      this.notify();
    });
  }

  /**
   * Emit a new signal, which is broadcasted via the EventBus.
   */
  emit(newState: T['payload']) {
    this.state = newState;

    this.#eventBus.emit({
      eventName: this.#signalName,
      payload: newState,
    });
  }
}
