import { Subject } from '../../utilities/reactive/subject';

import type {
  Event,
  EventBusContract,
  EventRegistry,
  InferEvent,
} from '../../types/core/event';

export class Signal<
  T extends Event,
  KnownEvents extends EventRegistry = EventRegistry
> extends Subject<T['payload']> {
  #eventBus: EventBusContract<KnownEvents>;
  #signalName: string;

  constructor(
    eventBus: EventBusContract<KnownEvents>,
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
    } as InferEvent<T, KnownEvents>);
  }
}
