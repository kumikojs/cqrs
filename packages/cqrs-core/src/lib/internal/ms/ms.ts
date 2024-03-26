import type { DurationUnit } from './types';

const toMilliseconds = (value: number, unit: string): number => {
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 1000 * 60;
    case 'h':
      return value * 1000 * 60 * 60;
    default:
      throw new Error(`Invalid unit: ${unit}`);
  }
};

const parse = (duration: string): [number, string][] => {
  const matches = duration.match(/(\d+(\.\d+)?)(ms|s|m|h)/g);
  if (!matches) {
    console.warn(`Invalid duration: ${duration}, defaulting to 0`);
    return [];
  }

  return matches.map((match) => {
    const [, valueStr, , unit] = match.match(/(\d+(\.\d+)?)(ms|s|m|h)/) || [];
    const value = parseFloat(valueStr);
    return [value, unit];
  });
};

/**
 * Convert a duration string to milliseconds.
 *
 * @param {DurationUnit} duration - The duration to convert.
 * @returns {number} The duration in milliseconds.
 */
export const ms = (duration: DurationUnit): number => {
  if (typeof duration === 'number') {
    return duration < 0 ? duration * -1 : duration;
  }

  const parsedValues = parse(duration);
  if (parsedValues.length === 0) {
    return 0;
  }

  return parsedValues.reduce(
    (acc, [value, unit]) => acc + toMilliseconds(value, unit),
    0
  );
};
