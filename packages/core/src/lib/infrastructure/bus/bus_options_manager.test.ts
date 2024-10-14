import {
  MaxHandlersPerChannelException,
  NoHandlerFoundException,
} from './bus_exception';
import { BusOptionsManager } from './bus_options_manager';

const CHANNEL_NAME = 'channel';

describe('BusOptionsManager', () => {
  describe('Handler Limit Verification', () => {
    it('should throw MaxHandlersPerChannelException when the maximum handler limit is reached', () => {
      const manager = new BusOptionsManager<string>({
        maxHandlersPerChannel: 1,
      });

      expect(() => manager.verifyHandlerLimit(CHANNEL_NAME, 1)).toThrowError(
        new MaxHandlersPerChannelException(CHANNEL_NAME, 1)
      );
    });

    it('should not throw an error when the handler limit is not exceeded', () => {
      const manager = new BusOptionsManager<string>({
        maxHandlersPerChannel: 2,
      });

      expect(() => manager.verifyHandlerLimit(CHANNEL_NAME, 1)).not.toThrow();
    });
  });

  describe('Handler Requirement Validation', () => {
    it('should throw NoHandlerFoundException when no handlers are found', () => {
      const manager = new BusOptionsManager<string>();

      expect(() =>
        manager.requireAtLeastOneHandler(CHANNEL_NAME, 0)
      ).toThrowError(new NoHandlerFoundException(CHANNEL_NAME));
    });

    it('should not throw an error when at least one handler is found', () => {
      const manager = new BusOptionsManager<string>();

      expect(() =>
        manager.requireAtLeastOneHandler(CHANNEL_NAME, 1)
      ).not.toThrow();
    });
  });

  describe('Error Throwing Behavior', () => {
    it('should throw the appropriate exception when in hard mode', () => {
      const manager = new BusOptionsManager<string>({
        mode: 'hard',
        maxHandlersPerChannel: 1,
      });

      expect(() =>
        manager.throwError('NO_HANDLER_FOUND', CHANNEL_NAME)
      ).toThrowError(new NoHandlerFoundException(CHANNEL_NAME));

      expect(() =>
        manager.throwError('MAX_HANDLERS_PER_CHANNEL', CHANNEL_NAME)
      ).toThrowError(new MaxHandlersPerChannelException(CHANNEL_NAME, 1));
    });

    it('should not throw an error when in soft mode', () => {
      const manager = new BusOptionsManager<string>({
        mode: 'soft',
      });

      expect(() =>
        manager.throwError('NO_HANDLER_FOUND', CHANNEL_NAME)
      ).not.toThrow();

      expect(() =>
        manager.throwError('MAX_HANDLERS_PER_CHANNEL', CHANNEL_NAME)
      ).not.toThrow();
    });
  });
});
