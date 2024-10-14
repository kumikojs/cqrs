import { ms } from './ms';

describe('ms', () => {
  it('should return the absolute value of a number', () => {
    expect(ms(1000)).toBe(1000);
    expect(ms(-1000)).toBe(1000);
  });

  it('should convert milliseconds string to milliseconds', () => {
    expect(ms('1000ms')).toBe(1000);
  });

  it('should convert seconds string to milliseconds', () => {
    expect(ms('1s')).toBe(1000);
    expect(ms('1.5s')).toBe(1500);
  });

  it('should convert minutes string to milliseconds', () => {
    expect(ms('1m')).toBe(60000);
    expect(ms('1.5m')).toBe(90000);
  });

  it('should convert hours string to milliseconds', () => {
    expect(ms('1h')).toBe(3600000);
    expect(ms('1.5h')).toBe(5400000);
  });

  it('should convert days string to milliseconds', () => {
    expect(ms('1d')).toBe(86400000);
    expect(ms('1.5d')).toBe(129600000);
  });

  it('should handle mixed duration strings', () => {
    expect(ms('1h 30m')).toBe(5400000);
    expect(ms('1d 1h')).toBe(90000000);
  });

  it('should return 0 for invalid duration strings', () => {
    expect(ms('invalid')).toBe(0);
    expect(ms('1x')).toBe(0);
  });
});
