import { ttlToMilliseconds } from './ttl';

describe('ttlToMilliseconds', () => {
  test('should convert milliseconds', () => {
    expect(ttlToMilliseconds('1ms')).toBe(1);
    expect(ttlToMilliseconds('100ms')).toBe(100);
  });

  test('should convert seconds', () => {
    expect(ttlToMilliseconds('1s')).toBe(1 * 1000);
    expect(ttlToMilliseconds('100s')).toBe(100 * 1000);
  });

  test('should convert minutes', () => {
    expect(ttlToMilliseconds('1m')).toBe(1 * 60 * 1000);
    expect(ttlToMilliseconds('100m')).toBe(100 * 60 * 1000);
  });

  test('should convert hours', () => {
    expect(ttlToMilliseconds('1h')).toBe(1 * 60 * 60 * 1000);
    expect(ttlToMilliseconds('100h')).toBe(100 * 60 * 60 * 1000);
  });

  test('should convert seconds and milliseconds', () => {
    expect(ttlToMilliseconds('1s1ms')).toBe(1 * 1000 + 1);
    expect(ttlToMilliseconds('1s100ms')).toBe(1 * 1000 + 100);
    expect(ttlToMilliseconds('100s1ms')).toBe(100 * 1000 + 1);
    expect(ttlToMilliseconds('100s100ms')).toBe(100 * 1000 + 100);
  });

  test('should convert minutes and seconds', () => {
    expect(ttlToMilliseconds('1m1s')).toBe(1 * 60 * 1000 + 1 * 1000);
    expect(ttlToMilliseconds('1m100s')).toBe(1 * 60 * 1000 + 100 * 1000);
    expect(ttlToMilliseconds('100m1s')).toBe(100 * 60 * 1000 + 1 * 1000);
    expect(ttlToMilliseconds('100m100s')).toBe(100 * 60 * 1000 + 100 * 1000);
  });

  test('should convert minutes, seconds and milliseconds', () => {
    expect(ttlToMilliseconds('1m1s1ms')).toBe(1 * 60 * 1000 + 1 * 1000 + 1);
    expect(ttlToMilliseconds('1m1s100ms')).toBe(1 * 60 * 1000 + 1 * 1000 + 100);
    expect(ttlToMilliseconds('1m100s1ms')).toBe(1 * 60 * 1000 + 100 * 1000 + 1);
    expect(ttlToMilliseconds('1m100s100ms')).toBe(
      1 * 60 * 1000 + 100 * 1000 + 100
    );
    expect(ttlToMilliseconds('100m1s1ms')).toBe(100 * 60 * 1000 + 1 * 1000 + 1);
    expect(ttlToMilliseconds('100m1s100ms')).toBe(
      100 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ttlToMilliseconds('100m100s1ms')).toBe(
      100 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ttlToMilliseconds('100m100s100ms')).toBe(
      100 * 60 * 1000 + 100 * 1000 + 100
    );
  });

  test('should convert hours and minutes', () => {
    expect(ttlToMilliseconds('1h1m')).toBe(1 * 60 * 60 * 1000 + 1 * 60 * 1000);
    expect(ttlToMilliseconds('1h100m')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000
    );
    expect(ttlToMilliseconds('100h1m')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000
    );
    expect(ttlToMilliseconds('100h100m')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000
    );
  });

  test('should convert hours, minutes and seconds', () => {
    expect(ttlToMilliseconds('1h1m1s')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000
    );
    expect(ttlToMilliseconds('1h1m100s')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000
    );
    expect(ttlToMilliseconds('1h100m1s')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000
    );
    expect(ttlToMilliseconds('1h100m100s')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000
    );
    expect(ttlToMilliseconds('100h1m1s')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000
    );
    expect(ttlToMilliseconds('100h1m100s')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000
    );
    expect(ttlToMilliseconds('100h100m1s')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000
    );
    expect(ttlToMilliseconds('100h100m100s')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000
    );
  });

  test('should convert hours, minutes, seconds and milliseconds', () => {
    expect(ttlToMilliseconds('1h1m1s1ms')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000 + 1
    );
    expect(ttlToMilliseconds('1h1m1s100ms')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ttlToMilliseconds('1h1m100s1ms')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ttlToMilliseconds('1h1m100s100ms')).toBe(
      1 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000 + 100
    );
    expect(ttlToMilliseconds('1h100m1s1ms')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000 + 1
    );
    expect(ttlToMilliseconds('1h100m1s100ms')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ttlToMilliseconds('1h100m100s1ms')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ttlToMilliseconds('1h100m100s100ms')).toBe(
      1 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000 + 100
    );
    expect(ttlToMilliseconds('100h1m1s1ms')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000 + 1
    );
    expect(ttlToMilliseconds('100h1m1s100ms')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ttlToMilliseconds('100h1m100s1ms')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ttlToMilliseconds('100h1m100s100ms')).toBe(
      100 * 60 * 60 * 1000 + 1 * 60 * 1000 + 100 * 1000 + 100
    );
    expect(ttlToMilliseconds('100h100m1s1ms')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000 + 1
    );
    expect(ttlToMilliseconds('100h100m1s100ms')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 1 * 1000 + 100
    );
    expect(ttlToMilliseconds('100h100m100s1ms')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000 + 1
    );
    expect(ttlToMilliseconds('100h100m100s100ms')).toBe(
      100 * 60 * 60 * 1000 + 100 * 60 * 1000 + 100 * 1000 + 100
    );
  });

  test('should check negative values', () => {
    expect(ttlToMilliseconds('-1ms')).toBe(0);
    expect(ttlToMilliseconds('-1s')).toBe(0);
    expect(ttlToMilliseconds('-1m')).toBe(0);
    expect(ttlToMilliseconds('-1h')).toBe(0);

    expect(ttlToMilliseconds('1s-1ms')).toBe(0);
    expect(ttlToMilliseconds(-100)).toBe(0);
  });
});
