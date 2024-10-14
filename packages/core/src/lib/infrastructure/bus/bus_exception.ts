export class BusException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusException';
  }
}

export class MaxHandlersPerChannelException<TChannel> extends BusException {
  constructor(channel: TChannel, maxHandlers: number) {
    super(
      `Limit of ${maxHandlers} handler(s) per channel reached. Channel: '${channel}' not registered.`
    );
    this.name = 'MaxHandlersPerChannelException';
  }
}

export class NoHandlerFoundException<TChannel> extends BusException {
  constructor(channel: TChannel) {
    super(`No handler found for this channel: '${channel}'`);
    this.name = 'NoHandlerFoundException';
  }
}

export class InvalidHandlerException<TChannel> extends BusException {
  constructor(channel: TChannel) {
    super(`Invalid handler found for this channel: '${channel}'`);
    this.name = 'InvalidHandlerException';
  }
}
