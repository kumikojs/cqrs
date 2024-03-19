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
