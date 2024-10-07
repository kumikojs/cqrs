import { Signal } from '@kumiko/core';
import type { Event, EventBusContract } from '@kumiko/core/types';
import { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * React hook to observe and emit signals using SignalSubject and EventBus.
 */
export function useBaseSignal<T extends Event>(
  eventBus: EventBusContract<any>,
  signalName: string,
  initialState?: T['payload']
) {
  const [subject] = useState(
    () => new Signal<T>(eventBus, signalName, initialState)
  );

  const subscribeToSignal = useCallback(
    (onStateChange: VoidFunction) => subject.subscribe(onStateChange),
    [subject]
  );

  const getCurrentState = useCallback(() => subject.state, [subject]);

  const result = useSyncExternalStore(
    subscribeToSignal,
    getCurrentState,
    getCurrentState
  );

  const emitSignal = useCallback(
    (update: T['payload'] | ((prev: T['payload']) => T['payload'])) => {
      const prevState = subject.state;
      const newState =
        typeof update === 'function'
          ? (update as (prev: T['payload']) => T['payload'])(prevState)
          : update;
      subject.emit(newState);
    },
    [subject]
  );

  return [result, emitSignal] as const;
}
