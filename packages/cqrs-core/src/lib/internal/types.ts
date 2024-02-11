/* eslint-disable @typescript-eslint/no-explicit-any */
export type Nullable<T> = T | null | undefined;
export type VoidFunction = () => void;
export type AnyFunction = (...args: any[]) => any;
export type PromiseAnyFunction = (...args: any[]) => Promise<any>;
