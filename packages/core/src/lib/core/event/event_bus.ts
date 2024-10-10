import { MemoryBusDriver } from '../../infrastructure/bus/drivers/memory_bus';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';

import type {
  Event,
  EventBusContract,
  EventHandlerOrFunction,
  EventRegistry,
} from '../../types/core/event';
import type { BusDriver } from '../../types/infrastructure/bus';

export class EventBus<KnownEvents extends EventRegistry = EventRegistry>
  implements EventBusContract<KnownEvents>
{
  #driver: BusDriver<string>;

  #logger: KumikoLogger;

  constructor(logger: KumikoLogger) {
    this.#logger = logger.child({ topics: ['event'] });

    this.#driver = new MemoryBusDriver({
      maxHandlersPerChannel: Infinity,
      logger: this.#logger,
    });

    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.emit = this.emit.bind(this);
  }

  disconnect(): void {
    this.#driver.disconnect();
  }

  on<EventType extends Event>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): VoidFunction {
    this.#driver.subscribe(eventName, handler);

    return () => this.off(eventName, handler);
  }

  off<EventType extends Event>(
    eventName: EventType['eventName'],
    handler: EventHandlerOrFunction<EventType>
  ): void {
    this.#driver.unsubscribe(eventName, handler);
  }

  async emit<TEvent extends Event>(event: TEvent): Promise<void> {
    await this.#driver.publish(event.eventName, event);
  }
}
