/* eslint-disable @typescript-eslint/no-explicit-any */
import { Success, Failure } from '../result/result';

import type { Result } from '../result/result';

export class JsonSerializer {
  serialize(data: any): Result<string, Error> {
    try {
      const serializedData = JSON.stringify(this.#sortObjectKeys(data));
      return new Success(serializedData);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to serialize data')
      );
    }
  }

  deserialize<TResult>(serializedData: string): Result<TResult, Error> {
    try {
      const data = JSON.parse(serializedData);
      return new Success(data);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to deserialize data')
      );
    }
  }

  #sortObjectKeys(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.#sortObjectKeys(item));
    } else if (data !== null && typeof data === 'object') {
      return Object.keys(data)
        .sort()
        .reduce((sortedObj, key) => {
          sortedObj[key] = this.#sortObjectKeys(data[key]);
          return sortedObj;
        }, {} as Record<string, any>);
    }
    return data;
  }
}
