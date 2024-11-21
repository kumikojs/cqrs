import { OptionsRequirement } from './helper';

describe('Options Requirement', () => {
  it('should return required for a required option', () => {
    type Command = {
      options: { required: string };
    };
    expectTypeOf<OptionsRequirement<Command>>().toEqualTypeOf<'required'>();
  });

  it('should return required for a required option', () => {
    type Command = {
      options?: { required: string };
    };
    expectTypeOf<OptionsRequirement<Command>>().toEqualTypeOf<'required'>();
  });

  it('should return optional for an optional option', () => {
    type Command = {
      options?: { optional?: string };
    };
    expectTypeOf<OptionsRequirement<Command>>().toEqualTypeOf<'optional'>();
  });

  it('should return optional for an optional option', () => {
    type Command = {
      options: { optional?: string };
    };
    expectTypeOf<OptionsRequirement<Command>>().toEqualTypeOf<'optional'>();
  });

  it('should return optional for an empty object', () => {
    type Command = {
      // eslint-disable-next-line @typescript-eslint/ban-types
      options: {};
    };
    expectTypeOf<OptionsRequirement<Command>>().toEqualTypeOf<'optional'>();
  });
});
