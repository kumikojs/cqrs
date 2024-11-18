import { CacheOperation } from './cache_operation';

import type { CacheEvent } from '../../cache/cache';

export class CacheStackEmitter extends CacheOperation {
  emit(event: CacheEvent, key: string): void {
    this.orderedLayers.map((layerName) => {
      const cache = this.layers.get(layerName);
      cache?.emit(event, key);
    });
  }

  on(event: CacheEvent, handler: (key: string) => void): () => void {
    const unsubscribes = this.orderedLayers.map((layerName) => {
      const cache = this.layers.get(layerName);
      try {
        const unsubscribe = cache?.on(event, handler);
        if (!unsubscribe) {
          console.error(
            `Failed to subscribe to event in cache layer ${layerName}`
          );
        }
        return unsubscribe;
      } catch (error) {
        console.error(
          `Failed to subscribe to event in cache layer ${layerName}:`,
          error
        );
        return undefined;
      }
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => {
        try {
          unsubscribe?.();
        } catch (error) {
          console.error('Failed to unsubscribe handler:', error);
        }
      });
    };
  }

  disconnect(): void {
    const results = this.orderedLayers.map((layerName) => {
      const cache = this.layers.get(layerName);
      try {
        cache?.disconnect();
        return { layerName, success: true };
      } catch (error) {
        console.error(`Failed to disconnect cache layer ${layerName}:`, error);
        return { layerName, success: false, error };
      }
    });

    const allFailed = results.every((result) => !result.success);

    if (allFailed) {
      console.error('Failed to disconnect all cache layers');
    }
  }
}
