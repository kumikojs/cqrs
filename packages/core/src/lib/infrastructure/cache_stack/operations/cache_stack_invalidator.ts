import { CacheOperation } from './cache_operation';

export class CacheStackInvalidator extends CacheOperation {
  async invalidate(key: string): Promise<void> {
    const results = await Promise.allSettled(
      this.orderedLayers.map(async (layerName) => {
        const cache = this.layers.get(layerName);
        try {
          await cache?.invalidate(key);
          return { layerName, success: true };
        } catch (error) {
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
      console.error('Failed to invalidate in all cache layers');
    }
  }

  async invalidateMany(keys: string[]): Promise<void> {
    const results = await Promise.allSettled(
      this.orderedLayers.map(async (layerName) => {
        const cache = this.layers.get(layerName);
        try {
          await cache?.invalidateMany(keys);
          return { layerName, success: true };
        } catch (error) {
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
      console.error('Failed to invalidate in all cache layers');
    }
  }

  async invalidatePattern(pattern: RegExp): Promise<void> {
    const matchingKeys = new Set<string>();

    await Promise.all(
      this.orderedLayers.map(async (layerName) => {
        const cache = this.layers.get(layerName);
        if (!cache) return;

        const keys = cache.keys();
        for await (const key of keys) {
          if (key.match(pattern)) {
            matchingKeys.add(key);
          }
        }
      })
    );

    await this.invalidateMany([...matchingKeys]);
  }

  async invalidateStale(): Promise<void> {
    const staleKeys = new Set<string>();

    await Promise.all(
      this.orderedLayers.map(async (layerName) => {
        const cache = this.layers.get(layerName);
        if (!cache) return;

        const keys = cache.keys();
        for await (const key of keys) {
          const entry = await cache.getEntry(key);
          if (entry?.isStale() && !entry.shouldDelete()) {
            staleKeys.add(key);
          }
        }
      })
    );

    await this.invalidateMany([...staleKeys]);
  }
}
