import type { DurationUnit } from '../../../../utilities/ms/types';

/**
 * A custom exception thrown when the request rate limit is exceeded.
 * Provides information about the limit and the time interval.
 */
export class ThrottleException extends Error {
  public constructor(rate: number, ttl: DurationUnit) {
    super(
      `Throttle limit of ${rate} reached for interval ${ttl}${ThrottleException.#suffix(
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
