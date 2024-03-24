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
