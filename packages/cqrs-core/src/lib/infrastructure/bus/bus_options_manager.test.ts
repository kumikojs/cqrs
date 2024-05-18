import { BusException } from './bus_exception';
import { BusOptionsManager } from './bus_options_manager';

describe('BusOptionsManager', () => {
  describe('verifyHandlerLimit', () => {
    it('should throw an error if the handler limit is reached', () => {
      const manager = new BusOptionsManager<string>({
        maxHandlersPerChannel: 1,
      });

      expect(() => manager.verifyHandlerLimit('channel', 1)).toThrowError(
        new BusException('MAX_HANDLERS_PER_CHANNEL', {
          message: 'Limit of 1 handler(s) per channel reached.',
          channel: 'channel',
        })
      );
    });

    it('should not throw an error if the handler limit is not reached', () => {
      const manager = new BusOptionsManager<string>({
        maxHandlersPerChannel: 2,
      });

      expect(() => manager.verifyHandlerLimit('channel', 1)).not.toThrow();
    });
  });

  describe('requireAtLeastOneHandler', () => {
    it('should throw an error if no handler is found', () => {
      const manager = new BusOptionsManager<string>();

      expect(() => manager.requireAtLeastOneHandler('channel', 0)).toThrowError(
        new BusException('NO_HANDLER_FOUND', {
          message: 'No handler found for this channel.',
          channel: 'channel',
        })
      );
    });

    it('should not throw an error if a handler is found', () => {
      const manager = new BusOptionsManager<string>();

      expect(() =>
        manager.requireAtLeastOneHandler('channel', 1)
      ).not.toThrow();
    });
  });

  describe('throwError', () => {
    it('should throw an error if the mode is hard', () => {
      const manager = new BusOptionsManager<string>({
        mode: 'hard',
      });

      expect(() => manager.throwError('NO_HANDLER_FOUND')).toThrowError(
        new BusException('NO_HANDLER_FOUND', {
          message: 'No handler found for this channel.',
          channel: 'N/A',
        })
      );
    });

    it('should not throw an error if the mode is soft', () => {
      const manager = new BusOptionsManager<string>({
        mode: 'soft',
      });

      expect(() => manager.throwError('NO_HANDLER_FOUND')).not.toThrow();
    });
  });
});
