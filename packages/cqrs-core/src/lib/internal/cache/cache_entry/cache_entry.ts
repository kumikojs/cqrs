import { ms } from '../../ms/ms';
import { JsonSerializer } from '../../serializer/json_serializer';

import type { DurationUnit } from '../../../types';

type CacheEntryData<TValue> = {
  key: string;
  value: TValue | undefined;
  expiration: number;
  ttl: DurationUnit;
};

export class CacheEntry<TValue> {
  #key: string;
  #value: TValue | undefined;
  #expiration: number;
  #ttl: DurationUnit;

  static #serializer: JsonSerializer = new JsonSerializer();

  constructor(
    key: string,
    value: TValue | undefined,
    ttl: DurationUnit | undefined,
    expiration?: number
  ) {
    this.#key = key;
    this.#value = value;
    this.#ttl = ttl ?? Infinity;
    this.#expiration = expiration ?? Date.now() + ms(this.#ttl);
  }

  get key() {
    return this.#key;
  }

  get value() {
    return this.#value;
  }

  get expiration() {
    return this.#expiration;
  }

  get ttl() {
    return this.#ttl;
  }

  hasExpired() {
    console.log('Date.now()', Date.now());
    console.log('this.#expiration', this.#expiration);
    console.log('Date.now() > this.#expiration', Date.now() > this.#expiration);

    const result = Date.now() > this.#expiration;

    console.log('result', result);

    return result;
  }

  serialize(): string | null {
    const serialized = CacheEntry.#serializer.serialize({
      key: this.#key,
      value: this.#value,
      expiration: this.#expiration,
      ttl: this.#ttl,
    });

    if (serialized.isFailure()) {
      return null;
    }

    return serialized.value;
  }

  static deserialize<TValue>(
    key: string,
    serialized: string
  ): CacheEntry<TValue> | undefined {
    const deserialized =
      this.#serializer.deserialize<CacheEntryData<TValue>>(serialized);

    if (deserialized.isFailure()) {
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
