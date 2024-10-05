import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger, LoggerContract } from './logger';

const mockLogger: LoggerContract = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('Logger', () => {
  let logger: Logger<['topic1', 'topic2']>;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new Logger({
      enabled: true,
      level: 'trace',
      format: 'json',
      logger: mockLogger,
      topics: ['topic1', 'topic2'],
      enabledTopics: ['topic1', 'topic2'],
    });
  });

  it('should log at trace level', () => {
    logger.trace('This is a trace message');
    expect(mockLogger.trace).toHaveBeenCalledWith(
      expect.stringContaining('This is a trace message')
    );
  });

  it('should log at debug level', () => {
    logger.debug('This is a debug message');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('This is a debug message')
    );
  });

  it('should log at info level', () => {
    logger.info('This is an info message');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('This is an info message')
    );
  });

  it('should respect log level threshold', () => {
    const logger = new Logger({
      enabled: true,
      level: 'warn', // Only log levels 'warn' and 'error' should pass
      format: 'json',
      logger: mockLogger,
    });

    logger.info('This info message should not log');
    logger.warn('This is a warn message');
    logger.error('This is an error message');

    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('This is a warn message')
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('This is an error message')
    );
  });

  it('should filter topics correctly', () => {
    logger.debug('This message is for topic1');
    expect(mockLogger.debug).toHaveBeenCalled();

    const logger2 = new Logger({
      enabled: true,
      level: 'debug',
      format: 'json',
      logger: mockLogger,
      topics: ['topic1'],
      enabledTopics: ['topic2'], // topic1 is excluded
    });

    logger2.debug('This message is for topic2');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('should allow creating a child logger with merged topics', () => {
    const childLogger = logger.child({
      topics: ['topic3'],
    });

    expect(childLogger).toBeInstanceOf(Logger);
    expect(childLogger).not.toBe(logger);
    expect(childLogger.child).toBe(logger.child);

    childLogger.info('This message is for topic3');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('This message is for topic3')
    );
  });
});
