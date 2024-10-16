/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryInput } from '../../types/core/query';

export class QueryKeyResolver {
  /**
   * Generates a cache key from the query input.
   */
  generateKey({ queryName, payload }: QueryInput): string {
    if (!payload) {
      return `cache:${queryName}`;
    }

    const payloadHash = this.#hashPayload(payload);
    return `cache:${queryName}:${payloadHash}`;
  }

  /**
   * Extracts the query name from a cache key.
   */
  extractQueryName(key: string): string | null {
    const parts = key.split(':');
    return parts.length > 1 ? parts[1] : null;
  }

  /**
   * Hashes the payload for inclusion in the key.
   */
  #hashPayload(payload: any): string {
    if (typeof payload !== 'object' || payload === null) {
      return String(payload);
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.#hashPayload(item)).join(','); // Handle arrays recursively
    }

    return Object.keys(payload)
      .sort()
      .map((key) => `${key}:${this.#hashPayload(payload[key])}`) // Recurse into nested objects
      .join('|');
  }
}
