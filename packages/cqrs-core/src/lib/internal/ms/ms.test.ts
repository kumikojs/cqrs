import { ms } from './ms';

describe('ms', () => {
  test('should convert milliseconds', () => {
    expect(ms('1ms')).toBe(1);
    expect(ms('100ms')).toBe(100);
  });

  test('should convert seconds', () => {
    expect(ms('1s')).toBe(1 * 1000);
    expect(ms('100s')).toBe(100 * 1000);
  });

  test('should convert minutes', () => {
    expect(ms('1m')).toBe(1 * 60 * 1000);
    expect(ms('100m')).toBe(100 * 60 * 1000);
  });

  test('should convert hours', () => {
    expect(ms('1h')).toBe(1 * 60 * 60 * 1000);
    expect(ms('100h')).toBe(100 * 60 * 60 * 1000);
    expect(ms('1.2h')).toBe(1.2 * 60 * 60 * 1000);
  });

  test('should convert seconds and milliseconds', () => {
    expect(ms('1s1ms')).toBe(1 * 1000 + 1);
    expect(ms('1s100ms')).toBe(1 * 1000 + 100);
    expect(ms('100s1ms')).toBe(100 * 1000 + 1);
    expect(ms('100s100ms')).toBe(100 * 1000 + 100);
  });

  test('should convert minutes and seconds', () => {
    expect(ms('1m1s')).toBe(1 * 60 * 1000 + 1 * 1000);
    expect(ms('1m100s')).toBe(1 * 60 * 1000 + 100 * 1000);
    expect(ms('100m1s')).toBe(100 * 60 * 1000 + 1 * 1000);
    expect(ms('100m100s')).toBe(100 * 60 * 1000 + 100 * 1000);
  });

  test('should convert minutes, seconds and milliseconds', () => {
    expect(ms('1m1s1ms')).toBe(1 * 60 * 1000 + 1 * 1000 + 1);
    expect(ms('1m1s100ms')).toBe(1 * 60 * 1000 + 1 * 1000 + 100);
    expect(ms('1m100s1ms')).toBe(1 * 60 * 1000 + 100 * 1000 + 1);
    expect(ms('1m100s100ms')).toBe(1 * 60 * 1000 + 100 * 1000 + 100);
    expect(ms('100m1s1ms')).toBe(100 * 60 * 1000 + 1 * 1000 + 1);
    expect(ms('100m1s100ms')).toBe(100 * 60 * 1000 + 1 * 1000 + 100);
    expect(ms('100m100s1ms')).toBe(100 * 60 * 1000 + 100 * 1000 + 1);
    expect(ms('100m100s100ms')).toBe(100 * 60 * 1000 + 100 * 1000 + 100);
  });

  test('should convert hours and minutes', () => {
    expect(ms('1h1m')).toBe(1 * 60 * 60 * 1000 + 1 * 60 * 1000);
    expect(ms('1h100m')).toBe(1 * 60 * 60 * 1000 + 100 * 60 * 1000);
    expect(ms('100h1m')).toBe(100 * 60 * 60 * 1000 + 1 * 60 * 1000);
    expect(ms('100h100m')).toBe(100 * 60 * 60 * 1000 + 100 * 60 * 1000);
  });

  test('should convert hours, minutes and seconds', () => {
    expect(ms('1h1m1s')).toBe(1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000);
    expect(ms('1h1m100s')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000
    );
    expect(ms('1h100m1s')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000
    );
    expect(ms('1h100m100s')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000
    );
    expect(ms('100h1m1s')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000
    );
    expect(ms('100h1m100s')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000
    );
    expect(ms('100h100m1s')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000
    );
    expect(ms('100h100m100s')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000
    );
  });

  test('should convert hours, minutes, seconds and milliseconds', () => {
    expect(ms('1h1m1s1ms')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000 + 1
    );
    expect(ms('1h1m1s100ms')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ms('1h1m100s1ms')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ms('1h1m100s100ms')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000 + 100
    );
    expect(ms('1h100m1s1ms')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000 + 1
    );
    expect(ms('1h100m1s100ms')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ms('1h100m100s1ms')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ms('1h100m100s100ms')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000 + 100
    );
    expect(ms('100h1m1s1ms')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000 + 1
    );
    expect(ms('100h1m1s100ms')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ms('100h1m100s1ms')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ms('100h1m100s100ms')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000 + 100
    );
    expect(ms('100h100m1s1ms')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000 + 1
    );
    expect(ms('100h100m1s100ms')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ms('100h100m100s1ms')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ms('100h100m100s100ms')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000 + 100
    );
  });

  test('negative numbers should be treated as positive', () => {
    expect(ms('-1ms')).toBe(1);
    expect(ms('-1s')).toBe(1000);
    expect(ms('-1m')).toBe(60 * 1000);
    expect(ms('-1h')).toBe(60 * 60 * 1000);

    expect(ms('1s-1ms')).toBe(1000 + 1);
    expect(ms(-100)).toBe(100);
  });
});
