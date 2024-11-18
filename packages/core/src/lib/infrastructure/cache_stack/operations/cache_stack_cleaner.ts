import { CacheOperation } from './cache_operation';

export class CacheStackCleaner extends CacheOperation {
  async delete(key: string): Promise<void> {
    await Promise.allSettled(
      this.orderedLayers.map(async (layerName) => {
        const cache = this.layers.get(layerName);
        try {
          await cache?.delete(key);
        } catch (error) {
          console.error(`Cache layer ${layerName} failed:`, error);
        }
      })
    );
  }
}
