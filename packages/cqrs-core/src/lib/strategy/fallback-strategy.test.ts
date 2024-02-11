import { FallbackStrategy } from './fallback-strategy';

describe('FallbackStrategy', () => {
  it('should execute the task and return the result', async () => {
    const strategy = new FallbackStrategy({
      fallback: () => 'fallback',
    });

    const result = await strategy.execute(
      {},
      () => new Promise((resolve) => resolve('result'))
    );

    expect(result).toBe('result');
  });

  it('should execute the task and return the result', async () => {
    const strategy = new FallbackStrategy({
      fallback: () => 'fallback',
    });

    const result = await strategy.execute({}, () => {
      throw new Error('error');
    });

    expect(result).toBe('fallback');
  });
});
