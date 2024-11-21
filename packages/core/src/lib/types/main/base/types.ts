export interface BaseOptions {
  [key: string]: unknown;
}

export interface BaseContext {
  [key: string]: unknown;
}

export interface BaseMessage<Name extends string = string> {
  name: Name;
}

export interface WithPayload<Payload = unknown> {
  payload?: Payload;
}

export interface WithOptions<Options extends BaseOptions = BaseOptions> {
  options?: Options;
}

export interface WithContext<Context extends BaseContext = BaseContext> {
  context?: Context;
}

export interface BaseRegistry<T> {
  [key: string]: T;
}
