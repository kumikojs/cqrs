import type { DispatchQueryInput, HandlerQueryInput } from './inference';
import type { Query } from './types';

type UserQuery = Query<{
  name: 'user';
  payload: { id: string };
  context: { token: string };
}>;

type OptionalUserQuery = Query<{
  name: 'optionalUser';
  payload?: { id?: string };
  context?: { token?: string };
}>;

type NoPayloadQuery = Query<{
  name: 'noPayload';
}>;

type OptionsQuery = Query<{
  name: 'options';
  options: { required: boolean };
}>;

type TestRegistry = {
  user: UserQuery;
  optionalUser: OptionalUserQuery;
  options: OptionsQuery;
  noPayload: NoPayloadQuery;
};

describe('Query Type Inference', () => {
  describe('DispatchQueryInput', () => {
    it('context should be optional', () => {
      type Result = DispatchQueryInput<UserQuery, TestRegistry>;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const valid: Result = {
        name: 'user',
        payload: { id: '1' },
      };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const missingContext: Result = {
        name: 'user',
        payload: { id: '1' },
        // @ts-expect-error - Missing required context
        context: {},
      };
    });

    it('payload should respect optionality', () => {
      // Required payload
      type Required = DispatchQueryInput<UserQuery, TestRegistry>;
      // @ts-expect-error - Missing required payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const missingPayload: Required = {
        name: 'user',
      };

      // Optional payload
      type Optional = DispatchQueryInput<OptionalUserQuery, TestRegistry>;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const withoutPayload: Optional = {
        name: 'optionalUser',
      };

      type Never = DispatchQueryInput<NoPayloadQuery, TestRegistry>;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const missingNever: Never = {
        name: 'noPayload',
      };
    });

    it('options should respect optionality', () => {
      // Required options
      type Required = DispatchQueryInput<OptionsQuery, TestRegistry>;
      // @ts-expect-error - Missing required options
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const missingOptions: Required = {
        name: 'options',
      };

      // Basic query without options
      type Optional = DispatchQueryInput<UserQuery, TestRegistry>;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const withoutOptions: Optional = {
        name: 'user',
        payload: { id: '1' },
      };
    });
  });

  describe('HandlerQueryInput', () => {
    it('context should be required', () => {
      type Result = HandlerQueryInput<UserQuery, TestRegistry>;

      // @ts-expect-error - Missing required context
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const missingContext: Result = {
        name: 'user',
        payload: { id: '1' },
      };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const valid: Result = {
        name: 'user',
        payload: { id: '1' },
        // @ts-expect-error - Missing required signal
        context: { token: 'token' },
      };
    });

    it('payload should respect optionality', () => {
      // Required payload
      type Required = HandlerQueryInput<UserQuery, TestRegistry>;
      // @ts-expect-error - Missing required payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const missingPayload: Required = {
        name: 'user',
        context: { token: 'token', signal: 'abort' as unknown as AbortSignal },
      };

      // Optional payload
      type Optional = HandlerQueryInput<OptionalUserQuery, TestRegistry>;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const withoutPayload: Optional = {
        name: 'optionalUser',
        // @ts-expect-error - Missing required signal
        context: { token: 'token' },
      };

      type Never = HandlerQueryInput<NoPayloadQuery, TestRegistry>;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const missingNever: Never = {
        name: 'noPayload',
        payload: undefined,
        context: { signal: 'abort' as unknown as AbortSignal },
      };
    });

    it('options should respect optionality', () => {
      // Required options
      type Required = HandlerQueryInput<OptionsQuery, TestRegistry>;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const missingOptions: Required = {
        name: 'options',
        // @ts-expect-error - Missing required options
        context: { token: 'token' },
      };

      // Basic query without options
      type Optional = HandlerQueryInput<UserQuery, TestRegistry>;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const withoutOptions: Optional = {
        name: 'user',
        payload: { id: '1' },
        // @ts-expect-error - Missing required signal
        context: { token: 'token' },
      };
    });
  });
});
