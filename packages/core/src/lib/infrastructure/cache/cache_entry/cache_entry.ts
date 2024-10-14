import { ms } from '../../../utilities/ms/ms';
import { JsonSerializer } from '../../../utilities/serializer/json_serializer';
import type { DurationUnit } from '../../../utilities/ms/types';

/**
 * Represents the data structure for a cache entry.
 */
type CacheEntryData<TValue> = {
  key: string;
  value?: TValue;
  expiration: number;
  validityPeriod: DurationUnit;
  gracePeriod?: DurationUnit;
};

/**
 * Represents the properties of a cache entry.
 */
type CacheEntryProps<TValue> = {
  key: string;
  value?: TValue;
  validityPeriod?: DurationUnit;
  expiration?: number;
  gracePeriod?: DurationUnit;
};

/*
 * ---------------------------------------------------------------------------
 * **CacheEntry Class**
 * ---------------------------------------------------------------------------
 * A utility for managing cache entries with expiration and stale states.
 *
 * Key features:
 * - **State Management**: Defines valid, stale, and invalid states for cache entries.
 * - **Graceful Handling**: Allows using stale entries temporarily while refreshing.
 *
 * ---------------------------------------------------------------------------
 */
export class CacheEntry<TValue> {
  #key: string;
  #value?: TValue;
  #expiration: number;
  #validityPeriod: DurationUnit;
  #gracePeriod?: DurationUnit;
  #staleUntil?: number;

  static #serializer: JsonSerializer = new JsonSerializer();

  constructor({
    key,
    value,
    validityPeriod,
    expiration,
    gracePeriod,
  }: CacheEntryProps<TValue>) {
    this.#key = key;
    this.#value = value;
    this.#validityPeriod = validityPeriod ?? Infinity;
    this.#expiration = expiration ?? Date.now() + ms(this.#validityPeriod);
    this.#gracePeriod = gracePeriod;
    this.#staleUntil = gracePeriod
      ? this.#expiration + ms(gracePeriod)
      : undefined;
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
  get validityPeriod() {
    return this.#validityPeriod;
  }

  /**
   * Checks if the cache entry has expired and is no longer usable.
   * @returns True if the cache entry has expired, false otherwise.
   */
  hasExpired() {
    return Date.now() > this.#expiration;
  }

  /**
   * Checks if the cache entry is stale.
   * @returns True if the cache entry is stale, false otherwise.
   */
  isStale() {
    if (!this.#staleUntil) return false; // If no stale threshold, not stale
    const now = Date.now();
    return now > this.#expiration && now <= this.#staleUntil;
  }

  /**
   * Checks if the cache entry is defunct (expired and not stale).
   * @returns True if the cache entry is defunct, false otherwise.
   */
  isDefunct() {
    return this.hasExpired() && !this.isStale();
  }

  /**
   * Serializes the cache entry to a string.
   * @returns The serialized cache entry string, or null if serialization fails.
   */
  serialize(): string | null {
    const serialized = CacheEntry.#serializer.serialize({
      key: this.#key,
      value: this.#value,
      expiration: this.#expiration,
      validityPeriod: this.#validityPeriod,
      gracePeriod: this.#gracePeriod,
      staleUntil: this.#staleUntil,
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

    return new CacheEntry<TValue>({
      key,
      value: deserialized.value.value,
      expiration: deserialized.value.expiration,
      validityPeriod: deserialized.value.validityPeriod,
      gracePeriod: deserialized.value.gracePeriod,
    });
  }
}
