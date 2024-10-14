export type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd';
type TimeFormat = `${number}${TimeUnit}`;

/**
 * ---------------------------------------------------------------------------
 * **DurationUnit**
 * ---------------------------------------------------------------------------
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
  | TimeFormat
  | `${TimeFormat}${TimeFormat}`
  | `${TimeFormat}${TimeFormat}${TimeFormat}`
  | `${TimeFormat}${TimeFormat}${TimeFormat}${TimeFormat}`
  | number;
