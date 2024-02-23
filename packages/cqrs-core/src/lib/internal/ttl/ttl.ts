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
 * Time to live (TTL) for cache items.
 * @type {TTL} When a number, it represents the time in milliseconds.
 * @example
 * ttl: '1s'
 * ttl: 1000
 * ttl: '1m'
 * ttl: 60000
 * ttl: '1h'
 * ttl: 3600000
 */
export type TTL =
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

export const ttlToMilliseconds = (ttl: TTL): number => {
  if (typeof ttl === 'number') {
    if (ttl < 0) {
      console.warn(`TTL must be greater than or equal to 0, defaulting to 0`);
      return 0;
    }

    return ttl;
  }

  if (!/^(\d+(ms|s|m|h))*$/.test(ttl)) {
    console.warn(`Invalid TTL: ${ttl}, defaulting to 0`);
    return 0;
  }

  const matches = ttl.match(/(\d+)(ms|s|m|h)/g);
  if (!matches) {
    console.warn(`Invalid TTL: ${ttl}, defaulting to 0`);
    return 0;
  }

  let totalMilliseconds = 0;

  for (const match of matches) {
    const [, valueStr, unit] = match.match(/(\d+)(ms|s|m|h|d)/) || [];
    const value = parseInt(valueStr, 10);

    switch (unit) {
      case 'ms':
        totalMilliseconds += value;
        break;
      case 's':
        totalMilliseconds += value * 1000;
        break;
      case 'm':
        totalMilliseconds += value * 1000 * 60;
        break;
      case 'h':
        totalMilliseconds += value * 1000 * 60 * 60;
        break;
      case 'd':
        totalMilliseconds += value * 1000 * 60 * 60 * 24;
        break;
      default:
        throw new Error(`Invalid TTL: ${ttl}`);
    }
  }

  return totalMilliseconds;
};
