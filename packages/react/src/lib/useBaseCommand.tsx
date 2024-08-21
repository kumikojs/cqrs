/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useSyncExternalStore } from 'react';

import { CommandSubject, Kumiko } from '@kumiko/core';
import type { Command, CommandHandlerOrFunction } from '@kumiko/core/types';

/**
 * Base hook for executing commands.
 *
 * @template TRequest - The type of the command to execute.
 * @param client - The CQRS client instance.
 * @param command - The command to execute.
 * @param handler - Optional handler function to execute the command.
 * @returns A tuple containing the current state of the command execution and the execute function.
 */
export function useBaseCommand<TRequest extends Command>(
  client: Kumiko<any>,
  command: TRequest,
  // FIXME: This should be `CommandHandlerOrFunction<TRequest>` instead of `CommandHandlerOrFunction<any>`
  //       but it's not possible to infer the correct type for the handler.
  handler?: CommandHandlerOrFunction<any>
) {
  const [subject] = useState(() => new CommandSubject(client, handler));

  const result = useSyncExternalStore(
    useCallback((onStateChange) => subject.subscribe(onStateChange), [subject]),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(
    (payload?: TRequest['payload']) => {
      subject.execute({
        ...command,
        payload,
      });
    },
    [subject, command]
  );

  return [result, execute] as const;
}
