/* eslint-disable @typescript-eslint/no-explicit-any */
import { Success, Failure } from '../result/result';

import type { Result } from '../result/result';

export class JsonSerializer {
  serialize(data: any): Result<string, Error> {
    try {
      const serializedData = JSON.stringify(data);
      return new Success(serializedData);
    } catch (error) {
      return new Failure(new Error('Failed to serialize data'));
    }
  }

  deserialize<TResult>(serializedData: string): Result<TResult, Error> {
    try {
      const data = JSON.parse(serializedData);
      return new Success(data);
    } catch (error) {
      return new Failure(new Error('Failed to deserialize data'));
    }
  }
}
