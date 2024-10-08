import { KumikoClient } from '@kumiko/core';

import type { Feature } from '@kumiko/core/types';

import { useCommand } from './useCommand';
import { useEventListener } from './useEventListener';
import { useQuery } from './useQuery';
import { useSignal } from './useSignal';

export function createHooks<FeatureList extends Feature[] = Feature[]>(
  client: KumikoClient<FeatureList>
) {
  return {
    useCommand: useCommand(client),
    useEventListener: useEventListener(client),
    useQuery: useQuery(client),
    useSignal: useSignal(client),
  };
}
