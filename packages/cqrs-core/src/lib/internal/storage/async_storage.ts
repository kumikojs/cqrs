export interface AsyncStorage {
  getItem<TValue>(key: string): Promise<TValue | null>;
  setItem<TValue>(key: string, value: TValue): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  key(index: number): string | null;
  length: number;
}
