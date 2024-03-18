import { act, renderHook } from '@testing-library/react-hooks';
import * as React from 'react';

import { ClientProvider } from './ClientProvider';
import { useQuery } from './useQuery';

import type { QueryContract } from '@stoik/cqrs-core';

describe('useQuery', () => {
  it('should return initial status as idle', () => {
    const client = {
      query: {
        dispatch: vitest.fn(),
        register: vitest.fn(),
        interceptors: {
          use: vitest.fn(),
          tap: vitest.fn(),
        },
      },
      command: {
        register: vitest.fn(),
        dispatch: vitest.fn(),
        interceptors: {
          use: vitest.fn(),
          tap: vitest.fn(),
        },
      },
      eventBus: {
        on: vitest.fn(),
        emit: vitest.fn(),
      },
    };
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ClientProvider client={client}>{children}</ClientProvider>
    );
    const { result } = renderHook(
      () => useQuery({ queryName: 'getUser', payload: { id: 1 } }),
      { wrapper }
    );

    expect(result.current[0]).toStrictEqual({
      status: 'idle',
      isIdle: true,
      isPending: false,
      isFulfilled: false,
      isRejected: false,
    });
    expect(typeof result.current[1]).toBe('function');
  });

  it('should provide a function to execute the query', () => {
    const client = {
      query: {
        dispatch: vitest.fn(),
        register: vitest.fn(),
        interceptors: {
          use: vitest.fn(),
          tap: vitest.fn(),
        },
      },
      command: {
        register: vitest.fn(),
        dispatch: vitest.fn(),
        interceptors: {
          use: vitest.fn(),
          tap: vitest.fn(),
        },
      },
      eventBus: {
        on: vitest.fn(),
        emit: vitest.fn(),
      },
    };
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ClientProvider client={client}>{children}</ClientProvider>
    );
    const { result } = renderHook(
      () => useQuery({ queryName: 'getUser', payload: { id: 1 } }),
      { wrapper }
    );

    act(() => {
      result.current[1]();
    });

    expect(client.query.dispatch).toHaveBeenCalledWith(
      { queryName: 'getUser', payload: { id: 1 } },
      undefined
    );
  });

  it('should dispatch the query with provided payload', () => {
    const client = {
      query: {
        dispatch: vitest.fn(),
        register: vitest.fn(),
        interceptors: {
          use: vitest.fn(),
          tap: vitest.fn(),
        },
      },
      command: {
        register: vitest.fn(),
        dispatch: vitest.fn(),
        interceptors: {
          use: vitest.fn(),
          tap: vitest.fn(),
        },
      },
      eventBus: {
        on: vitest.fn(),
        emit: vitest.fn(),
      },
    };
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ClientProvider client={client}>{children}</ClientProvider>
    );

    type GetUserQuery = QueryContract<'getUser', { id: number }>;
    type GetUserResponse = { id: number; name: string };
    const { result } = renderHook(
      () => useQuery<GetUserQuery, GetUserResponse>({ queryName: 'getUser' }),
      { wrapper }
    );

    act(() => {
      result.current[1]({ id: 1 });
    });

    expect(client.query.dispatch).toHaveBeenCalledWith(
      { queryName: 'getUser', payload: { id: 1 } },
      undefined
    );
  });
});
