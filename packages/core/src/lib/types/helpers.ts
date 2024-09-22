/* eslint-disable @typescript-eslint/no-explicit-any */

export type Maybe<T> = T | null | undefined;

export type VoidFunction = () => void;

export type AsyncFunction<R = any> = (...args: any[]) => Promise<R>;

export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// #region snippet: duration_unit

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

// #endregion snippet: duration_unit
