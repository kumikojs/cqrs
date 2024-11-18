import { CacheOperation } from './cache_operation';
import { CacheEntry } from '../../cache/cache_entry/cache_entry';

export class CacheStackReader extends CacheOperation {
  async get<TValue>(
    key: string
  ): Promise<{ data: TValue | undefined; isStale: boolean }> {
    for (const layerName of this.orderedLayers) {
      const cache = this.layers.get(layerName);
      try {
        const result = await cache?.get<TValue>(key);
        if (result && result.data !== undefined) {
          try {
            await this.#promoteEntry(layerName, key);
          } catch (error) {
            console.error('Promotion failed:', error);
          }
          return result;
        }
      } catch (error) {
        console.error(`Cache layer ${layerName} failed:`, error);
        continue;
      }
    }
    return { data: undefined, isStale: false };
  }

  async getEntry<TValue>(key: string): Promise<CacheEntry<TValue> | undefined> {
    for (const layerName of this.orderedLayers) {
      const cache = this.layers.get(layerName);
      try {
        const entry = await cache?.getEntry<TValue>(key);
        if (entry && entry.value !== undefined) {
          try {
            await this.#promoteEntry(layerName, key);
          } catch (error) {
            console.error('Promotion failed:', error);
          }
          return entry;
        }
      } catch (error) {
        console.error(`Cache layer ${layerName} failed:`, error);
        continue;
      }
    }
    return undefined;
  }

  async #promoteEntry<TValue>(
    foundInLayer: string,
    key: string
  ): Promise<void> {
    const sourceCache = this.layers.get(foundInLayer);
    const entry = await sourceCache?.getEntry<TValue>(key);
    if (!entry || entry.shouldDelete()) return;

    const layerIndex = this.orderedLayers.indexOf(foundInLayer);
    await Promise.allSettled(
      this.orderedLayers.slice(0, layerIndex).map(async (layerName) => {
        const cache = this.layers.get(layerName);
        try {
          await cache?.setEntry(key, entry);
        } catch (error) {
          console.error(`Promotion to layer ${layerName} failed:`, error);
        }
      })
    );
  }
}
