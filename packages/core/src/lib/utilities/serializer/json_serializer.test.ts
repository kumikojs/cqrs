import { JsonSerializer } from './json_serializer'; // Adjust the path as necessary
import { Success, Failure } from '../result/result';

describe('JsonSerializer', () => {
  let jsonSerializer: JsonSerializer;

  beforeEach(() => {
    jsonSerializer = new JsonSerializer();
  });

  describe('serialize', () => {
    it('should serialize an object correctly', () => {
      const data = { b: 2, a: 1 };
      const result = jsonSerializer.serialize(data);

      expect(result).toBeInstanceOf(Success);
      expect(result.isSuccess() && result.value).toEqual('{"a":1,"b":2}');
    });

    it('should serialize an array correctly', () => {
      const data = [3, 1, 2];
      const result = jsonSerializer.serialize(data);

      expect(result).toBeInstanceOf(Success);
      expect(result.isSuccess() && result.value).toEqual('[3,1,2]');
    });

    it('should return a Failure if serialization fails', () => {
      const circularData: { self?: unknown } = {};
      circularData.self = circularData; // Circular reference

      const result = jsonSerializer.serialize(circularData);

      expect(result).toBeInstanceOf(Failure);
      expect(result.isFailure() && result.error).toBeInstanceOf(Error);
      expect(result.isFailure() && result.error.message).toContain(
        'Failed to serialize data'
      );
    });
  });

  describe('deserialize', () => {
    it('should deserialize a valid JSON string correctly', () => {
      const serializedData = '{"a":1,"b":2}';
      const result = jsonSerializer.deserialize(serializedData);

      expect(result).toBeInstanceOf(Success);
      expect(result.isSuccess() && result.value).toEqual({ a: 1, b: 2 });
    });

    it('should return a Failure if deserialization fails', () => {
      const invalidJson = '{a:1,b:2}'; // Invalid JSON

      const result = jsonSerializer.deserialize(invalidJson);

      expect(result).toBeInstanceOf(Failure);
      expect(result.isFailure() && result.error).toBeInstanceOf(Error);
      expect(result.isFailure() && result.error.message).toContain(
        'Failed to deserialize data'
      );
    });
  });
});
