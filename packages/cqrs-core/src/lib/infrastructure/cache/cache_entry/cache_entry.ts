import { ms } from '../../../utilities/ms/ms';
import { JsonSerializer } from '../../../utilities/serializer/json_serializer';

import type { Nullable, Optional } from '../../../types/helpers';
import type { DurationUnit } from '../../../types/utilities/duration_unit';

/**
 * Represents the data structure for a cache entry.
 */
type CacheEntryData<TValue> = {
  key: string;
  value: Optional<TValue>;
  expiration: number;
  ttl: DurationUnit;
};

/**
 * Represents a cache entry.
 */
export class CacheEntry<TValue> {
  #key: string;
  #value: Optional<TValue>;
  #expiration: number;
  #ttl: DurationUnit;

  static #serializer: JsonSerializer = new JsonSerializer();

  /**
   * Creates a new instance of CacheEntry.
   * @param key - The key of the cache entry.
   * @param value - The value of the cache entry.
   * @param ttl - The time-to-live duration of the cache entry.
   * @param expiration - The expiration timestamp of the cache entry.
   */
  constructor(
    key: string,
    value: Optional<TValue>,
    ttl: Optional<DurationUnit>,
    expiration?: Optional<number>
  ) {
    this.#key = key;
    this.#value = value;
    this.#ttl = ttl ?? Infinity;
    this.#expiration = expiration ?? Date.now() + ms(this.#ttl);
  }

  /**
   * Gets the key of the cache entry.
   */
  get key() {
    return this.#key;
  }

  /**
   * Gets the value of the cache entry.
   */
  get value() {
    return this.#value;
  }

  /**
   * Gets the expiration timestamp of the cache entry.
   */
  get expiration() {
    return this.#expiration;
  }

  /**
   * Gets the time-to-live duration of the cache entry.
   */
  get ttl() {
    return this.#ttl;
  }

  /**
   * Checks if the cache entry has expired.
   * @returns True if the cache entry has expired, false otherwise.
   */
  hasExpired() {
    return Date.now() > this.#expiration;
  }

  /**
   * Serializes the cache entry to a string.
   * @returns The serialized cache entry string, or null if serialization fails.
   */
  serialize(): Nullable<string> {
    const serialized = CacheEntry.#serializer.serialize({
      key: this.#key,
      value: this.#value,
      expiration: this.#expiration,
      ttl: this.#ttl,
    });

    if (serialized.isFailure()) {
      console.warn(`Failed to serialize cache entry: ${this.#key}`);
      console.error(serialized.error);
      return null;
    }

    return serialized.value;
  }

  /**
   * Deserializes a cache entry from a string.
   * @param key - The key of the cache entry.
   * @param serialized - The serialized cache entry string.
   * @returns The deserialized cache entry, or undefined if deserialization fails.
   */
  static deserialize<TValue>(
    key: string,
    serialized: string
  ): CacheEntry<TValue> | undefined {
    const deserialized =
      this.#serializer.deserialize<CacheEntryData<TValue>>(serialized);

    if (deserialized.isFailure()) {
      console.warn(`Failed to deserialize cache entry: ${key}`);
      console.error(deserialized.error);
      return undefined;
    }

    return new CacheEntry<TValue>(
      key,
      deserialized.value.value,
      deserialized.value.ttl,
      deserialized.value.expiration
    );
  }
}
