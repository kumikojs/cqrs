/* eslint-disable @typescript-eslint/no-explicit-any */

interface KeyInput {
  name: string;
  payload?: any;
}

export class KeyResolver {
  /**
   * Generates a cache key from the input, which could be a query or a command.
   */
  generateKey({ name, payload }: KeyInput, prefix = 'cache'): string {
    if (!payload) {
      return `${prefix}:${name}`;
    }

    const payloadHash = this.#hashPayload(payload);
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
