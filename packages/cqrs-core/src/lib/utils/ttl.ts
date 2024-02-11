type Millisecond = `${number}ms`;
type Second = `${number}s`;
type SecondAndMillisecond = `${number}s${number}ms`;
type Minute = `${number}m`;
type MinuteAndSecond = `${number}m${number}s`;
type MinuteAndSecondAndMillisecond = `${number}m${number}s${number}ms`;
type Hour = `${number}h`;
type HourAndMinute = `${number}h${number}m`;
type HourAndMinuteAndSecond = `${number}h${number}m${number}s`;
type HourAndMinuteAndSecondAndMillisecond =
  `${number}h${number}m${number}s${number}ms`;

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
  | HourAndMinuteAndSecondAndMillisecond;

export const ttlToMilliseconds = (ttl: TTL): number => {
  const matches = ttl.match(/(\d+)(ms|s|m|h)/g);
  if (!matches) {
    throw new Error(`Invalid TTL: ${ttl}`);
  }

  let totalMilliseconds = 0;

  for (const match of matches) {
    const [, valueStr, unit] = match.match(/(\d+)(ms|s|m|h|d)/) || [];
    const value = parseInt(valueStr, 10);
    if (isNaN(value)) {
      throw new Error(`Invalid TTL: ${ttl}`);
    }

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
