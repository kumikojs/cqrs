/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AsyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  open?(): Promise<any>;
  close?(): Promise<void>;
}
