import { JsonSerializer } from './json_serializer';

describe('JsonSerializer', () => {
  let serializer: JsonSerializer;

  beforeEach(() => {
    serializer = new JsonSerializer();
  });

  describe('serialize', () => {
    it('should serialize data', () => {
      const data = { key: 'value' };
      const result = serializer.serialize(data);

      expect(result.isSuccess()).toBeTruthy();
      if (!result.isSuccess()) {
        assert.fail('Expected success');
      }
      expect(result.value).toBe('{"key":"value"}');
    });

    it('should return a failure if serialization fails', () => {
      const data = { key: 'value' };
      const result = serializer.serialize(data);

      expect(result.isFailure()).toBeFalsy();

      vitest.spyOn(JSON, 'stringify').mockImplementation(() => {
        throw new Error('Failed to serialize data');
      });

      const failure = serializer.serialize(undefined);

      expect(failure.isFailure()).toBeTruthy();

      if (!failure.isFailure()) {
        assert.fail('Expected failure');
      }

      expect(failure.error.message).toBe('Failed to serialize data');
    });
  });

  describe('deserialize', () => {
    it('should deserialize data', () => {
      const serializedData = '{"key":"value"}';
      const result = serializer.deserialize(serializedData);

      expect(result.isSuccess()).toBeTruthy();

      if (!result.isSuccess()) {
        assert.fail('Expected success');
      }

      expect(result.value).toEqual({ key: 'value' });
    });

    it('should return a failure if deserialization fails', () => {
      const serializedData = '{"key":"value"}';
      const result = serializer.deserialize(serializedData);

      expect(result.isFailure()).toBeFalsy();

      const failure = serializer.deserialize('invalid');

      expect(failure.isFailure()).toBeTruthy();

      if (!failure.isFailure()) {
        assert.fail('Expected failure');
      }

      expect(failure.error.message).toBe('Failed to deserialize data');
    });
  });
});
