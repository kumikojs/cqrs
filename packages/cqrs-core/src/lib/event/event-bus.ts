/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TaskManagerContract } from '../internal/task/task-manager';
import type { EventContract, EventName } from './event';
import type { EventHandlerContract } from './event-handler';
import {
  EventInterceptorManager,
  type EventInterceptorManagerContract,
} from './internal/event-interceptor-manager';
import {
  EventRegistry,
  type EventRegistryContract,
} from './internal/event-registry';
import { EventTaskManager } from './internal/event-task-manager';

type EventHandlerFn<
  T extends EventContract = EventContract,
  TResponse = any
> = (event: T) => Promise<TResponse>;

type BindToSyntax<TEvent extends EventContract> = {
  to: (
    handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>
  ) => VoidFunction;
};

export interface EventBusContract<
  BaseEvent extends EventContract = EventContract
> {
  bind<TEvent extends BaseEvent>(eventName: EventName): BindToSyntax<TEvent>;

  execute<TEvent extends BaseEvent, TResponse = any>(
    event: TEvent
  ): Promise<TResponse>;

  interceptors: Pick<EventInterceptorManagerContract, 'apply' | 'select'>;
}

export class EventBus implements EventBusContract {
  #eventRegistry: EventRegistryContract;
  #eventInterceptorManager: EventInterceptorManagerContract;
  #taskManager: TaskManagerContract<
    EventContract,
    EventHandlerContract['execute']
  >;

  constructor({
    registry = new EventRegistry(),
    interceptorManager = new EventInterceptorManager(),
    taskManager = new EventTaskManager(),
  }: {
    registry?: EventRegistryContract;
    interceptorManager?: EventInterceptorManagerContract;
    taskManager?: TaskManagerContract<
      EventContract,
      EventHandlerContract['execute']
    >;
  } = {}) {
    this.#eventRegistry = registry;
    this.#eventInterceptorManager = interceptorManager;
    this.#taskManager = taskManager;
  }

  bind<TEvent extends EventContract>(
    eventName: EventName
  ): BindToSyntax<TEvent> {
    return {
      to: (handler: EventHandlerContract<TEvent> | EventHandlerFn<TEvent>) => {
        if (typeof handler === 'function') {
          handler = {
            execute: handler,
          };
        }

        return this.#eventRegistry.register(eventName, handler);
      },
    };
  }

  async execute<TEvent extends EventContract, TResponse = any>(
    event: TEvent
  ): Promise<TResponse> {
    const handler = this.#eventRegistry.resolve(event.eventName);

    if (!event.context?.abortController) {
      event.context = {
        ...event.context,
        abortController: new AbortController(),
      };
    }

    return this.#taskManager.execute(event, () =>
      this.#eventInterceptorManager.execute(event, handler.execute)
    );
  }

  get interceptors(): Pick<
    EventInterceptorManagerContract,
    'apply' | 'select'
  > {
    return this.#eventInterceptorManager;
  }
}
