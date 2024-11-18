import type { DurationUnit, TimeUnit } from './types';

const convertToMilliseconds = (value: number, unit: TimeUnit): number => {
  const millisecondsConversion = {
    ms: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
  };

  const factor = millisecondsConversion[unit];
  if (factor === undefined) {
    throw new Error(`Invalid time unit: ${unit}`);
  }

  return value * factor;
};

const parseDuration = (duration: string): Array<[number, TimeUnit]> => {
  const regex = /(\d+(\.\d+)?)(ms|s|m|h|d)/g;
  const matches = [...duration.matchAll(regex)];

  if (matches.length === 0) {
    console.warn(`Invalid duration format: '${duration}'. Returning 0.`);
    return [];
  }

  return matches.map((match) => {
    const value = parseFloat(match[1]);
    const unit = match[3] as TimeUnit;
    return [value, unit];
  });
};

/**
 * Convert a duration string or number to milliseconds.
 *
 * @param {DurationUnit} duration - The duration to convert, either a number or a formatted string.
 * @returns {number} The duration in milliseconds.
 */
export const ms = (duration: DurationUnit): number => {
  if (typeof duration === 'number' || !isNaN(Number(duration))) {
    return Math.abs(Number(duration));
  }

  const parsedValues = parseDuration(duration);
  if (parsedValues.length === 0) {
    return 0;
  }

  return parsedValues.reduce(
    (total, [value, unit]) => total + convertToMilliseconds(value, unit),
    0
  );
};
