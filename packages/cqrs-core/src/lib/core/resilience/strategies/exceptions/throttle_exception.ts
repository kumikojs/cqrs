import type { DurationUnit } from '../../../../types/utilities/duration_unit';

/**
 * A custom exception thrown when the request rate limit is exceeded.
 * Provides information about the limit and the time interval.
 */
export class ThrottleException extends Error {
  public constructor(rate: number, ttl: DurationUnit) {
    super(
      `Rate limit exceeded. Limit: ${rate} requests per ${ttl}${ThrottleException.#suffix(
        ttl
      )}`
    );
  }

  /**
   * Retrieves the suffix for the duration unit.
   *
   * @param ttl - The duration unit.
   * @returns The suffix string (e.g., 'ms', 's', 'm').
   */
  static #suffix = (ttl: DurationUnit): string =>
    typeof ttl === 'number' ? 'ms' : '';
}
