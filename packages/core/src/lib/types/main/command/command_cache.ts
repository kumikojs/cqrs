import type { QueriesRegistry } from '../query/types';

export interface CommandCacheContract<QR extends QueriesRegistry> {
  invalidateQueries(
    ...queries: (QR[keyof QR]['input']['name'] | QR[keyof QR]['input'])[]
  ): void;

  optimisticUpdate<QueryName extends keyof QR & string>(
    queryName: QueryName,
    updater: (
      prev: QR[QueryName]['output'] | undefined
    ) => QR[QueryName]['output']
  ): Promise<void>;
}
