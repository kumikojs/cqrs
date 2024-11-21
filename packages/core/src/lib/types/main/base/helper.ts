import type { WithOptions } from './types';

type IsOptional<T> = Extract<T, undefined> extends never ? false : true;

type IsAllOptional<T> = T extends object
  ? { [K in keyof T]: IsOptional<T[K]> } extends { [K in keyof T]: true }
    ? true
    : false
  : IsOptional<T>;

type IsUnknown<T> = unknown extends T ? true : false;
type IsAny<T> = boolean extends (T extends never ? true : false) ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
type IsEmptyObject<T> = T extends object
  ? keyof T extends never
    ? true
    : false
  : false;

export type MakeOptional<T> = IsUnknown<T> extends true
  ? true
  : IsAny<T> extends true
  ? true
  : undefined extends T
  ? true
  : T extends object
  ? IsAllOptional<T> extends true
    ? true
    : false
  : false;

type AllPropertiesOptional<T> = T extends object
  ? {
      [K in keyof T]-?: undefined extends T[K] ? true : false;
    }[keyof T] extends true
    ? true
    : false
  : false;

export type PayloadRequirement<T> = IsNever<T> extends true
  ? 'never'
  : IsUnknown<T> extends true
  ? 'never'
  : IsEmptyObject<T> extends true
  ? 'never'
  : AllPropertiesOptional<T> extends true
  ? 'optional'
  : 'required';

type ExtractRawOptions<T> = T extends WithOptions<infer O>
  ? O
  : T extends { options: infer O }
  ? O
  : T extends { options?: infer O }
  ? O
  : T;

export type OptionsRequirement<T> = [ExtractRawOptions<T>] extends [never]
  ? 'optional'
  : IsEmptyObject<ExtractRawOptions<T>> extends true
  ? 'optional'
  : T extends WithOptions
  ? AllPropertiesOptional<ExtractRawOptions<T>> extends true
    ? 'optional'
    : 'required'
  : 'required';
