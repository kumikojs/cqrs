import { Cache } from '../../cache/cache';

export abstract class CacheOperation {
  constructor(
    protected layers: Map<string, Cache>,
    protected orderedLayers: string[]
  ) {}
}
