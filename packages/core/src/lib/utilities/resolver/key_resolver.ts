/* eslint-disable @typescript-eslint/no-explicit-any */
interface KeyInput {
  name: string;
  payload?: any;
  meta?: any;
}

export class KeyResolver {
  /**
   * Generates a cache key from the input, which could be a query or a command.
   */
  generateKey({ name, payload, meta }: KeyInput, prefix = 'cache'): string {
    if (!payload && !meta) {
      return `${prefix}:${name}`;
    }

    const combined: any = {};

    if (payload !== undefined) {
      combined.payload = payload;
    }

    if (meta !== undefined) {
      combined.meta = meta;
    }

    const payloadHash = this.#hashPayload(combined);
    return `${prefix}:${name}:${payloadHash}`;
  }

  /**
   * Extracts the name (query or command) from a key.
   */
  extractName(key: string): string | null {
    const parts = key.split(':');

    return parts.length > 1 ? (parts[1] === '' ? null : parts[1]) : null;
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
