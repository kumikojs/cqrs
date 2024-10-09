import { BusException } from './bus_exception';
import { BusOptionsManager } from './bus_options_manager';

const CHANNEL_NAME = 'channel';

describe('BusOptionsManager', () => {
  describe('Handler Limit Verification', () => {
    it('should throw an error when the maximum handler limit is reached', () => {
      const manager = new BusOptionsManager<string>({
        maxHandlersPerChannel: 1,
      });

      expect(() => manager.verifyHandlerLimit(CHANNEL_NAME, 1)).toThrowError(
        new BusException('MAX_HANDLERS_PER_CHANNEL', {
          message: `Limit of 1 handler(s) per channel reached. Channel: '${CHANNEL_NAME}' not registered.`,
          channel: CHANNEL_NAME,
        })
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
    it('should throw an error when no handlers are found', () => {
      const manager = new BusOptionsManager<string>();

      expect(() =>
        manager.requireAtLeastOneHandler(CHANNEL_NAME, 0)
      ).toThrowError(
        new BusException('NO_HANDLER_FOUND', {
          message: `No handler found for this channel: '${CHANNEL_NAME}'`,
          channel: CHANNEL_NAME,
        })
      );
    });

    it('should not throw an error when at least one handler is found', () => {
      const manager = new BusOptionsManager<string>();

      expect(() =>
        manager.requireAtLeastOneHandler(CHANNEL_NAME, 1)
      ).not.toThrow();
    });
  });

  describe('Error Throwing Behavior', () => {
    it('should throw an error when in hard mode', () => {
      const manager = new BusOptionsManager<string>({
        mode: 'hard',
      });

      expect(() => manager.throwError('NO_HANDLER_FOUND')).toThrowError(
        new BusException('NO_HANDLER_FOUND', {
          message: `No handler found for this channel: ''`,
          channel: 'N/A',
        })
      );
    });

    it('should not throw an error when in soft mode', () => {
      const manager = new BusOptionsManager<string>({
        mode: 'soft',
      });

      expect(() => manager.throwError('NO_HANDLER_FOUND')).not.toThrow();
    });
  });
});
