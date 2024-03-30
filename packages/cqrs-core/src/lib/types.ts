/* eslint-disable @typescript-eslint/no-explicit-any */

// #region snippet: types
/**
 * Represents a value that can be either `T`, `null`, or `undefined`.
 *
 * @template T - The type of the original value.
 */
export type Nullable<T> = T | null | undefined;

/**
 * A function type that takes no arguments and returns nothing (void).
 */
export type VoidFunction = () => void;

/**
 * A function type that can take any number of arguments of any type
 * and return any type.
 *
 * **Note:** This type should be used sparingly as it bypasses type safety checks.
 */
export type AnyFunction = (...args: any[]) => any;

/**
 * A function type that returns a Promise, optionally resolving to a value of type `R`.
 *
 * @template R - The type of the resolved value (optional, defaults to `any`).
 */
export type AsyncFunction<R = any> = (...args: any[]) => Promise<R>;

// #endregion snippet: types

// #region snippet: combinedPartialOptions
/**
 * **ExtractedOptions<T>** (helper type)
 *
 * This internal helper type extracts the type of the `options` property from a class,
 * if it exists. Otherwise, it returns `never`.
 *
 * @template T - The type to extract the `options` property from.
 */
type ExtractedOptions<T> = T extends {
  options?: infer O;
}
  ? O
  : never;

/**
 * **UnionToIntersection<U>** (helper type)
 *
 * This internal helper type calculates the intersection type of a union.
 * It's a utility type used within `CombinedPartialOptions`.
 *
 * @template U - The union type for which to find the intersection.
 */
type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * **CombinedPartialOptions<TRequest, KnownRequests>**
 *
 * This type represents the combined partial properties derived from the optional
 * `options` properties of a group of known requests.
 *
 * @template TRequest - The base type of an individual request.
 * @template KnownRequests - A record type where keys are request names and values
 *   are the corresponding request types, each potentially having an optional `options` property.
 */
export type CombinedPartialOptions<
  TRequest,
  KnownRequests extends Record<string, TRequest>
> = Partial<
  UnionToIntersection<ExtractedOptions<KnownRequests[keyof KnownRequests]>>
>;

// #endregion snippet: combinedPartialOptions

// #region snippet: durationUnit

type Millisecond = `${number}ms`;
type Second = `${number}s`;
type Minute = `${number}m`;
type Hour = `${number}h`;
type SecondAndMillisecond = `${Second}${Millisecond}`;
type MinuteAndSecond = `${Minute}${Second}`;
type MinuteAndSecondAndMillisecond = `${Minute}${Second}${Millisecond}`;
type HourAndMinute = `${Hour}${Minute}`;
type HourAndMinuteAndSecond = `${Hour}${Minute}${Second}`;
type HourAndMinuteAndSecondAndMillisecond =
  `${Hour}${Minute}${Second}${Millisecond}`;

/**
 * **DurationUnit**
 *
 * This type represents a versatile way to express durations in various formats,
 * including numbers and string representations of milliseconds, seconds, minutes, and hours.
 *
 * @remarks
 * The duration unit can be:
 *  - A number representing milliseconds.
 *  - A string with a unit suffix: "ms" for milliseconds, "s" for seconds, "m" for minutes, "h" for hours (e.g., "500ms", "30s", "1h").
 *  - A combined string representing multiple units (e.g., "1h30m15s", "5m30s500ms").
 */
export type DurationUnit =
  | Millisecond
  | Second
  | Minute
  | Hour
  | SecondAndMillisecond
  | MinuteAndSecond
  | MinuteAndSecondAndMillisecond
  | HourAndMinute
  | HourAndMinuteAndSecond
  | HourAndMinuteAndSecondAndMillisecond
  | number;

// #endregion snippet: durationUnit
