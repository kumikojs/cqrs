import { Signal } from '@kumiko/core';
import type { Event, EventBusContract } from '@kumiko/core/types';
import { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * React hook to observe and emit signals using SignalSubject and EventBus.
 *
 * @param eventBus - The EventBus instance used to emit and listen to signals.
 * @param signalName - The unique name of the signal (event name).
 * @param initialState - The initial state of the signal.
 * @returns A tuple containing the current signal state and a function to emit new signals.
 */
export function useBaseSignal<T extends Event>(
  eventBus: EventBusContract<any>,
  signalName: string,
  initialState?: T['payload']
): readonly [T['payload'], (newState: T['payload']) => void] {
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
    (newState: T['payload']) => {
      subject.emit(newState);
    },
    [subject]
  );

  return [result, emitSignal] as const;
}
