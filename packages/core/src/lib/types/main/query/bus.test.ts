import type { Mock } from 'vitest';
import type { QueryBusContract } from './bus';
import type { Query } from './types';

describe('QueryBusContract Type Tests', () => {
  type GetUserQuery = Query<
    { name: 'getUser'; payload: { id: string } },
    { name: string; age: number }
  >;

  type GetUsersQuery = Query<
    { name: 'getUsers'; payload: { id: string } },
    { name: string; age: number }[]
  >;

  type GetPostsQuery = Query<
    { name: 'getPosts'; payload: { id: string } },
    { title: string; content: string }[]
  >;

  type GetCommentsQuery = Query<
    {
      name: 'getComments';
      payload: { id: string };
      options?: { required: boolean };
    },
    { content: string }[]
  >;

  type TestRegistry = {
    getUser: GetUserQuery;
    getUsers: GetUsersQuery;
    getPosts: GetPostsQuery;
  };

  const mockBus = {
    dispatch: vi.fn(),
    execute: vi.fn(),
    register: vi.fn(() => vi.fn()),
    unregister: vi.fn(),
    cancelQuery: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as QueryBusContract<TestRegistry>;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('dispatch method', () => {
    it('should correctly handle registry queries', async () => {
      (mockBus.dispatch as Mock).mockResolvedValue({ name: 'John', age: 30 });

      const result = await mockBus.dispatch({
        name: 'getUser',
        payload: { id: '123' },
      });

      expect(result).toEqual({ name: 'John', age: 30 });
      expectTypeOf(result).toEqualTypeOf<{ name: string; age: number }>();
      expect(mockBus.dispatch).toHaveBeenCalledWith({
        name: 'getUser',
        payload: { id: '123' },
      });
    });

    it('should correctly handle explicit queries', async () => {
      (mockBus.dispatch as Mock).mockResolvedValue([{ content: 'test' }]);

      const result = await mockBus.dispatch<GetCommentsQuery>({
        name: 'getComments',
        payload: { id: '123' },
      });

      expect(result).toEqual([{ content: 'test' }]);
      expectTypeOf(result).toEqualTypeOf<{ content: string }[]>();
    });

    it('should handle options with fallback', async () => {
      (mockBus.dispatch as Mock).mockResolvedValue([{ name: 'John', age: 30 }]);

      const result = await mockBus.dispatch({
        name: 'getUsers',
        payload: { id: '123' },
        options: {
          fallback: (req, error) => {
            expectTypeOf(req.payload).toEqualTypeOf<{ id: string }>();
            expectTypeOf(error).toEqualTypeOf<unknown>();
            return [{ name: 'Fallback', age: 25 }];
          },
          cache: { ttl: 1000 },
          retry: { maxAttempts: 3 },
        },
      });

      expectTypeOf(result).toEqualTypeOf<{ name: string; age: number }[]>();
    });
  });

  describe('execute method', () => {
    it('should correctly execute handler with proper types', async () => {
      (mockBus.execute as Mock).mockResolvedValue({ name: 'John', age: 30 });

      const handler = async (input: GetUserQuery['input']) => {
        expectTypeOf(input.payload).toEqualTypeOf<{ id: string }>();
        return { name: 'John', age: 30 };
      };

      const result = await mockBus.execute(
        { name: 'getUser', payload: { id: '123' } },
        handler
      );

      expect(result).toEqual({ name: 'John', age: 30 });
      expectTypeOf(result).toEqualTypeOf<{ name: string; age: number }>();
      expect(mockBus.execute).toHaveBeenCalledWith(
        { name: 'getUser', payload: { id: '123' } },
        handler
      );
    });
  });

  describe('register method', () => {
    it('should register handlers with correct types', () => {
      const handler = async (input: GetUserQuery['input']) => {
        expectTypeOf(input.payload).toEqualTypeOf<{ id: string }>();
        return { name: 'John', age: 30 };
      };

      const unregister = mockBus.register('getUser', handler);

      expect(mockBus.register).toHaveBeenCalledWith('getUser', handler);
      expectTypeOf(unregister).toEqualTypeOf<VoidFunction>();
    });

    it('should register handlers with explicit query type', () => {
      const handler = async (input: GetCommentsQuery['input']) => {
        expectTypeOf(input.payload).toEqualTypeOf<{ id: string }>();
        return [{ content: 'test' }];
      };

      mockBus.register<GetCommentsQuery>('getComments', handler);

      expect(mockBus.register).toHaveBeenCalledWith('getComments', handler);
    });
  });

  describe('unregister method', () => {
    it('should unregister handlers with correct types', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handler = async (input: GetUserQuery['input']) => {
        return { name: 'John', age: 30 };
      };

      mockBus.unregister('getUser', handler);

      expect(mockBus.unregister).toHaveBeenCalledWith('getUser', handler);
    });
  });

  describe('cancelQuery method', () => {
    it('should cancel queries by name', () => {
      mockBus.cancelQuery('getUser');
      expect(mockBus.cancelQuery).toHaveBeenCalledWith('getUser');
    });

    it('should cancel queries with explicit type', () => {
      mockBus.cancelQuery<GetPostsQuery>('getPosts');
      expect(mockBus.cancelQuery).toHaveBeenCalledWith('getPosts');
    });
  });

  describe('fallback type safety', () => {
    it('should enforce type safety for registry queries', async () => {
      await mockBus.dispatch({
        name: 'getUser',
        payload: { id: '123' },
        options: {
          fallback: (req, error) => {
            expectTypeOf(req.payload).toEqualTypeOf<{ id: string }>();
            expectTypeOf(error).toEqualTypeOf<unknown>();

            // Valid return
            return { name: 'Fallback', age: 25 };
          },
        },
      });

      await mockBus.dispatch({
        name: 'getUser',
        payload: { id: '123' },
        options: {
          // @ts-expect-error - Invalid return type (missing age)
          fallback: () => ({ name: 'Fallback' }),
        },
      });

      await mockBus.dispatch({
        name: 'getUsers',
        payload: { id: '123' },
        options: {
          fallback: () => {
            // Valid array return
            return [{ name: 'Fallback', age: 25 }];
          },
        },
      });

      // @ts-expect-error - Should not allow single object when array is expected
      await mockBus.dispatch({
        name: 'getUsers',
        payload: { id: '123' },
        options: {
          fallback: () => ({ name: 'Fallback', age: 25 }),
        },
      });
    });

    it('should enforce type safety for explicit queries', async () => {
      await mockBus.dispatch<GetCommentsQuery>({
        name: 'getComments',
        payload: { id: '123' },
        options: {
          required: true,
          fallback: (req) => {
            // @ts-expect-error - Cannot access non-existent property
            req.payload.nonexistent;

            return [{ content: 'Fallback comment' }];
          },
        },
      });

      await mockBus.dispatch<GetCommentsQuery>({
        name: 'getComments',
        payload: { id: '123' },
        options: {
          // @ts-expect-error - Wrong return type structure
          fallback: () => [{ content: 123 }],
        },
      });
    });
  });
});
