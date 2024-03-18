/* eslint-disable @typescript-eslint/no-explicit-any */
import { QuerySubject } from './query-subject';

import type { QueryContract } from './query';

class QueryStoreTracker<T> {
  #count = 0;
  readonly subject: T;

  constructor(subject: T) {
    this.subject = subject;
  }

  increment() {
    this.#count += 1;
  }

  decrement() {
    this.#count -= 1;
  }

  isDisposed() {
    return this.#count === 0;
  }
}

export interface QueryStoreContract {
  getOrSet<TResult>(queryName: string): QuerySubject<TResult>;

  invalidate(queries: Array<QueryContract['queryName']>): void;

  dispose(queryName: string): void;
}

export class QueryStore {
  #querySubjects: Map<QueryContract['queryName'], QueryStoreTracker<any>>;

  constructor() {
    this.#querySubjects = new Map();
  }

  getOrSet<TResult>(queryName: string): QuerySubject<TResult> {
    let entry = this.#querySubjects.get(queryName);

    if (!entry) {
      entry = new QueryStoreTracker<QuerySubject<TResult>>(new QuerySubject());
      this.#querySubjects.set(queryName, entry);
    }

    entry.increment();
    return entry.subject;
  }

  invalidate(queries: Array<QueryContract['queryName']>) {
    queries.forEach((queryName) => {
      const entry = this.#querySubjects.get(queryName);

      if (entry) {
        entry.subject.invalidate();
      }
    });
  }

  dispose(queryName: string) {
    const entry = this.#querySubjects.get(queryName);

    if (entry) {
      entry.decrement();

      if (entry.isDisposed()) {
        this.#querySubjects.delete(queryName);
      }
    }
  }
}
