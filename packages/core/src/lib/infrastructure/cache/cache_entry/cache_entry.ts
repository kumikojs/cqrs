import { ms } from '../../../utilities/ms/ms';
import { JsonSerializer } from '../../../utilities/serializer/json_serializer';
import type { DurationUnit } from '../../../utilities/ms/types';

interface CacheEntryData<TValue> {
  key: string;
  value?: TValue;
  expiration: number;
  cacheExpiration: number;
  validityPeriod: DurationUnit;
  cacheTime: DurationUnit;
}

interface CacheEntryOptions<TValue> {
  key: string;
  value?: TValue;
  validityPeriod?: DurationUnit;
  cacheTime?: DurationUnit;
  expiration?: number;
  cacheExpiration?: number;
}

/**
 * CacheEntry manages cache entries with expiration and stale states.
 *
 * Features:
 * - Immediate staleness when validityPeriod is 0
 * - Separate cache expiration time for cleanup
 * - Serialization support for persistence
 *
 * @template TValue - The type of value being cached
 */
export class CacheEntry<TValue> {
  readonly #key: string;
  readonly #value?: TValue;
  readonly #validityPeriod: DurationUnit;
  readonly #expiration: number;
  readonly #cacheTime: DurationUnit;
  readonly #cacheExpiration: number;

  static readonly #serializer = new JsonSerializer();
  static readonly DEFAULT_VALIDITY_PERIOD: DurationUnit = '0';
  static readonly DEFAULT_CACHE_TIME: DurationUnit = '5m';

  constructor({
    key,
    value,
    validityPeriod = CacheEntry.DEFAULT_VALIDITY_PERIOD,
    cacheTime = CacheEntry.DEFAULT_CACHE_TIME,
    expiration,
    cacheExpiration,
  }: CacheEntryOptions<TValue>) {
    this.#key = key;
    this.#value = value;
    this.#validityPeriod = validityPeriod;
    this.#cacheTime = cacheTime;

    // Calculate expiration times
    const now = Date.now();
    this.#expiration = this.#calculateExpiration(
      now,
      validityPeriod,
      expiration
    );
    this.#cacheExpiration = this.#calculateCacheExpiration(
      now,
      cacheTime,
      cacheExpiration
    );
  }

  // Public getters
  get key(): string {
    return this.#key;
  }
  get value(): TValue | undefined {
    return this.#value;
  }
  get validityPeriod(): DurationUnit {
    return this.#validityPeriod;
  }
  get cacheTime(): DurationUnit {
    return this.#cacheTime;
  }
  get expiration(): number {
    return this.#expiration;
  }
  get cacheExpiration(): number {
    return this.#cacheExpiration;
  }

  // State checks
  isStale(): boolean {
    return Date.now() > this.#expiration;
  }

  shouldDelete(): boolean {
    return Date.now() > this.#cacheExpiration;
  }

  /**
   * Creates a new entry with updated expiration times
   */
  refresh(): CacheEntry<TValue> {
    return new CacheEntry({
      key: this.#key,
      value: this.#value,
      validityPeriod: this.#validityPeriod,
      cacheTime: this.#cacheTime,
    });
  }

  /**
   * Creates a new entry with a new value but same timing configuration
   */
  withValue<TNewValue>(value: TNewValue): CacheEntry<TNewValue> {
    return new CacheEntry({
      key: this.#key,
      value,
      validityPeriod: this.#validityPeriod,
      cacheTime: this.#cacheTime,
    });
  }

  /**
   * Serializes the cache entry
   */
  serialize(): string | null {
    const data: CacheEntryData<TValue> = {
      key: this.#key,
      value: this.#value,
      expiration: this.#expiration,
      cacheExpiration: this.#cacheExpiration,
      validityPeriod: this.#validityPeriod,
      cacheTime: this.#cacheTime,
    };

    const result = CacheEntry.#serializer.serialize(data);
    if (result.isFailure()) {
      console.warn(`Failed to serialize cache entry: ${this.#key}`);
      console.error(result.error);
      return null;
    }

    return result.value;
  }

  /**
   * Deserializes a cache entry from string
   */
  static deserialize<TValue>(
    key: string,
    serialized: string
  ): CacheEntry<TValue> | undefined {
    const result =
      this.#serializer.deserialize<CacheEntryData<TValue>>(serialized);
    if (result.isFailure()) {
      console.warn(`Failed to deserialize cache entry: ${key}`);
      console.error(result.error);
      return undefined;
    }

    return new CacheEntry({
      key,
      value: result.value.value,
      expiration: result.value.expiration,
      cacheExpiration: result.value.cacheExpiration,
      validityPeriod: result.value.validityPeriod,
      cacheTime: result.value.cacheTime,
    });
  }

  /**
   * Creates an immediately stale entry
   */
  static createStale<TValue>(
    key: string,
    value?: TValue,
    cacheTime: DurationUnit = CacheEntry.DEFAULT_CACHE_TIME
  ): CacheEntry<TValue> {
    return new CacheEntry({
      key,
      value,
      validityPeriod: '0',
      cacheTime,
    });
  }

  #calculateExpiration(
    now: number,
    validityPeriod: DurationUnit,
    providedExpiration?: number
  ): number {
    if (providedExpiration !== undefined) {
      return providedExpiration;
    }

    const validityMs = ms(validityPeriod);
    return validityMs === 0 ? now - 1 : now + validityMs;
  }

  #calculateCacheExpiration(
    now: number,
    cacheTime: DurationUnit,
    providedExpiration?: number
  ): number {
    return providedExpiration ?? now + ms(cacheTime);
  }
}
