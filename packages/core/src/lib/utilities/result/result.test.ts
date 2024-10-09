import { Failure, Success } from './result';

describe('Result Classes', () => {
  describe('Success', () => {
    it('should be a success instance', () => {
      const success = new Success(42);
      expect(success.isSuccess()).toBe(true);
      expect(success.isFailure()).toBe(false);
      expect(success.value).toBe(42);
    });
  });

  describe('Failure', () => {
    it('should be a failure instance', () => {
      const failure = new Failure('Error occurred');
      expect(failure.isFailure()).toBe(true);
      expect(failure.isSuccess()).toBe(false);
      expect(failure.error).toBe('Error occurred');
    });
  });
});
