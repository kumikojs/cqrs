import { JsonSerializer } from '../internal/serializer/json_serializer';

export const LoggerLevels = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
] as const;

export type LoggerLevel = (typeof LoggerLevels)[number];

export interface LoggerContract {
  trace(message: string, obj?: LoggerObject): void;
  debug(message: string, obj?: LoggerObject): void;
  info(message: string, obj?: LoggerObject): void;
  warn(message: string, obj?: LoggerObject): void;
  error(message: string, obj?: LoggerObject): void;
}

export type LoggerConfig<TopicsType extends Readonly<string[]>> = {
  enabled: boolean;
  level: LoggerLevel;
  enabledTopics?: TopicsType;
  format: 'json' | 'pretty';
  logger?: LoggerContract;
  topics?: TopicsType | string[];
};

export type LoggerOptions<TopicsType extends Readonly<string[]>> = {
  enabled?: boolean;
  level?: LoggerLevel;
  format?: 'json' | 'pretty';
  topics?: TopicsType | string[];
  enabledTopics?: TopicsType;
  logger?: LoggerContract;
};

interface LoggerObject {
  [key: string]: unknown;
}

export class Logger<TopicsType extends Readonly<string[]>> {
  #config: LoggerConfig<TopicsType>;

  #serializer = new JsonSerializer();

  constructor(config?: LoggerOptions<TopicsType>) {
    this.#config = {
      enabled: config?.enabled ?? false,
      level: config?.level ?? 'trace',
      format: config?.format ?? 'pretty',
      enabledTopics: config?.enabledTopics,
      logger: config?.logger,
      topics: config?.topics ?? [],
    };
  }

  child(options: Partial<LoggerConfig<TopicsType>>): Logger<TopicsType> {
    const mergedTopics = new Set([
      ...(this.#config.topics ?? []),
      ...(options.topics ?? []),
    ]);
    return new Logger<TopicsType>({
      ...this.#config,
      ...options,
      topics: Array.from(mergedTopics),
    });
  }

  #log(level: LoggerLevel, message: string, obj?: LoggerObject): void {
    /**
     * Topics are optional, if they are not provided, the log will be enabled for all topics.
     */
    if (
      this.#config?.enabled &&
      this.#isLevelEnabled(level) &&
      (this.#config.topics === undefined ||
        this.#config.topics?.length === 0 ||
        this.#config.topics?.every((topic) => this.#isTopicEnabled(topic)))
    ) {
      const timestamp = this.#timestamp();

      if (this.#config.format === 'json' && this.#config.logger) {
        const logMessage = this.#serialize(
          timestamp,
          level,
          message,
          this.#config.topics,
          obj
        );

        if (logMessage) {
          this.#config.logger[level](logMessage);
        }
        return;
      }

      if (level !== 'trace') {
        console[level](
          `${timestamp} ${this.#prettyLevel(level)[0]} ${this.#prettyTopics()}`,
          this.#prettyLevel(level)[1],
          message,
          obj ? obj : ' '
        );

        return;
      }

      console.groupCollapsed(
        `${timestamp} ${this.#prettyLevel(level)[0]} ${this.#prettyTopics()}`,
        this.#prettyLevel(level)[1],
        message
      );
      obj && console.log(obj);
      console.trace();
      console.groupEnd();
    }
  }

  trace(message: string, obj?: LoggerObject): void {
    this.#log('trace', message, obj);
  }

  debug(message: string, obj?: LoggerObject): void {
    this.#log('debug', message, obj);
  }

  info(message: string, obj?: LoggerObject): void {
    this.#log('info', message, obj);
  }

  warn(message: string, obj?: LoggerObject): void {
    this.#log('warn', message, obj);
  }

  error(message: string, obj?: LoggerObject): void {
    this.#log('error', message, obj);
  }

  isTraceEnabled(): boolean {
    return this.#isLevelEnabled('trace');
  }

  isDebugEnabled(): boolean {
    return this.#isLevelEnabled('debug');
  }

  isInfoEnabled(): boolean {
    return this.#isLevelEnabled('info');
  }

  isWarnEnabled(): boolean {
    return this.#isLevelEnabled('warn');
  }

  isErrorEnabled(): boolean {
    return this.#isLevelEnabled('error');
  }

  #timestamp(): string {
    return new Date().toISOString().slice(0, 23);
  }

  #isTopicEnabled(topic: string): boolean {
    // If enabledTopics is not provided, all topics are enabled.
    return this.#config.enabledTopics?.includes(topic) ?? true;
  }

  #isLevelEnabled(level: LoggerLevel): boolean {
    return (
      LoggerLevels.indexOf(level) >= LoggerLevels.indexOf(this.#config.level)
    );
  }

  #serialize(
    timestamp: string,
    level: LoggerLevel,
    message: string,
    topics: string[] | undefined | TopicsType,
    obj?: LoggerObject
  ): string | void {
    const objMessage = obj ? this.#serializer.serialize(obj) : undefined;

    const data = objMessage?.isSuccess() ? objMessage.value : undefined;

    const logMessage = this.#serializer.serialize({
      timestamp,
      level,
      topics,
      message,
      data,
    });

    if (logMessage.isSuccess()) {
      return logMessage.value;
    }
  }

  #prettyTopics() {
    if (!this.#config.topics) {
      return '';
    }

    return `[${this.#config.topics?.join(', ')}]`;
  }

  #prettyLevel(level: LoggerLevel) {
    let color = '';
    switch (level) {
      case 'trace':
        color = 'color: #7E57C2;';
        break;
      case 'debug':
        color = 'color: #1E88E5;';
        break;
      case 'info':
        color = 'color: #4CAF50;';
        break;
      case 'warn':
        color = 'color: #FFF176;';
        break;
      case 'error':
        color = 'color: #EF5350;';
        break;
    }

    return [`%c${level.toUpperCase()}`, color] as const;
  }
}
