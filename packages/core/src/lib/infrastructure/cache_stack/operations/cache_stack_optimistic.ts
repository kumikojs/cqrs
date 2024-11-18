import { CacheOperation } from './cache_operation';
import { CacheStackEmitter } from './cache_stack_emitter';
import { CacheStackInvalidator } from './cache_stack_invalidator';
import { CacheStackReader } from './cache_stack_reader';
import { CacheStackWriter } from './cache_stack_writer';
import type { Cache } from '../../cache/cache';
import type { DurationUnit } from '../../../utilities/ms/types';

export class CacheStackOptimistic extends CacheOperation {
  readonly #dependencies: {
    writer: CacheStackWriter;
    reader: CacheStackReader;
    emitter: CacheStackEmitter;
    invalidator: CacheStackInvalidator;
  };

  constructor(
    protected override layers: Map<string, Cache>,
    protected override orderedLayers: string[],
    dependencies: {
      writer: CacheStackWriter;
      reader: CacheStackReader;
      emitter: CacheStackEmitter;
      invalidator: CacheStackInvalidator;
    }
  ) {
    super(layers, orderedLayers);
    this.#dependencies = dependencies;
  }

  async update<TData, TError = unknown, TContext = unknown>(
    key: string,
    operation: () => Promise<TData>,
    options: {
      optimisticData?: TData | ((oldData?: TData) => TData);
      transform?: (result: TData) => TData;
      onSuccess?: (data: TData, context?: TContext) => void | Promise<unknown>;
      onError?: (error: TError, context?: TContext) => void | Promise<unknown>;
      onSettled?: (
        data?: TData,
        error?: TError,
        context?: TContext
      ) => void | Promise<unknown>;
      context?: TContext;
      validityPeriod?: DurationUnit;
      cacheTime?: DurationUnit;
    } = {}
  ): Promise<TData> {
    const {
      optimisticData,
      transform,
      onSuccess,
      onError,
      onSettled,
      context,
      validityPeriod,
      cacheTime,
    } = options;

    const [previousResult, previousEntry] = await Promise.all([
      this.#dependencies.reader.get<TData>(key),
      this.#dependencies.reader.getEntry<TData>(key),
    ]);

    const optimisticValue =
      typeof optimisticData === 'function'
        ? (optimisticData as (oldData?: TData) => TData)(previousResult?.data)
        : optimisticData;

    if (optimisticValue !== undefined) {
      if (previousEntry) {
        const optimisticEntry = previousEntry.withValue(optimisticValue);
        await this.#dependencies.writer.setEntry(key, optimisticEntry);
      } else {
        await this.#dependencies.writer.set(key, optimisticValue, {
          validityPeriod,
          cacheTime,
        });
      }
      this.#dependencies.emitter.emit('cache:optimistic:update', key);
    }

    try {
      const result = await operation();
      const cacheValue = transform ? transform(result) : result;

      if (previousEntry) {
        const updatedEntry = previousEntry.withValue(cacheValue);
        await this.#dependencies.writer.setEntry(key, updatedEntry);
      } else {
        await this.#dependencies.writer.set(key, cacheValue, {
          validityPeriod,
          cacheTime,
        });
      }

      await onSuccess?.(result, context);
      await onSettled?.(result, undefined, context);
      this.#dependencies.emitter.emit('cache:optimistic:update', key);

      return result;
    } catch (error) {
      if (previousResult?.data !== null && previousEntry) {
        await this.#dependencies.writer.setEntry(key, previousEntry);
        this.#dependencies.emitter.emit('cache:optimistic:rollback', key);
      }

      await onError?.(error as TError, context);
      await onSettled?.(undefined, error as TError, context);
      throw error;
    }
  }

  async delete<TError = unknown, TContext = unknown>(
    key: string,
    operation: () => Promise<void>,
    options: {
      onSuccess?: (context?: TContext) => void | Promise<unknown>;
      onError?: (error: TError, context?: TContext) => void | Promise<unknown>;
      onSettled?: (
        error?: TError,
        context?: TContext
      ) => void | Promise<unknown>;
      context?: TContext;
    } = {}
  ): Promise<void> {
    const { onSuccess, onError, onSettled, context } = options;
    const [previousResult, previousEntry] = await Promise.all([
      this.#dependencies.reader.get(key),
      this.#dependencies.reader.getEntry(key),
    ]);

    try {
      await this.#dependencies.invalidator.invalidate(key);
      await operation();
      await onSuccess?.(context);
      await onSettled?.(undefined, context);
      this.#dependencies.emitter.emit('cache:optimistic:delete', key);
    } catch (error) {
      if (previousResult?.data !== null && previousEntry) {
        await this.#dependencies.writer.setEntry(key, previousEntry);
        this.#dependencies.emitter.emit('cache:optimistic:rollback', key);
      }

      await onError?.(error as TError, context);
      await onSettled?.(error as TError, context);
      throw error;
    }
  }
}
