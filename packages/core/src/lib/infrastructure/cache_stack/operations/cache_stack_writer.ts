import { CacheOperation } from './cache_operation';
import { CacheEntry } from '../../cache/cache_entry/cache_entry';

import type { DurationUnit } from '../../../utilities/ms/types';

export class CacheStackWriter extends CacheOperation {
  async set<TValue>(
    key: string,
    value: TValue,
    options: {
      validityPeriod?: DurationUnit;
      cacheTime?: DurationUnit;
    } = {}
  ): Promise<void> {
    const results = await Promise.allSettled(
      this.orderedLayers.map(async (layerName) => {
        const cache = this.layers.get(layerName);
        try {
          await cache?.set(key, value, options);
          return { layerName, success: true };
        } catch (error) {
          console.error(`Failed to write to cache layer ${layerName}:`, error);
          return { layerName, success: false, error };
        }
      })
    );

    const allFailed = results.every(
      (result) =>
        result.status === 'rejected' ||
        (result.status === 'fulfilled' && !result.value.success)
    );

    if (allFailed) {
      console.error('Failed to write to all cache layers');
    }
  }

  async setEntry<TValue>(
    key: string,
    entry: CacheEntry<TValue>
  ): Promise<void> {
    const results = await Promise.allSettled(
      this.orderedLayers.map(async (layerName) => {
        const cache = this.layers.get(layerName);
        try {
          await cache?.setEntry(key, entry);
          return { layerName, success: true };
        } catch (error) {
          console.error(
            `Failed to write entry to cache layer ${layerName}:`,
            error
          );
          return { layerName, success: false, error };
        }
      })
    );

    const allFailed = results.every(
      (result) =>
        result.status === 'rejected' ||
        (result.status === 'fulfilled' && !result.value.success)
    );

    if (allFailed) {
      console.error('Failed to write entry to all cache layers');
    }
  }
}
