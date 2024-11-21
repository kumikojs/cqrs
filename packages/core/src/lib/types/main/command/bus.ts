import type { EventsRegistry } from '../event/types';
import type { QueriesRegistry } from '../query/types';
import type { CommandHandler } from './handler';
import type { DispatchCommand, HandlerCommand } from './inference';
import type { Command, CommandsRegistry } from './types';

export interface CommandBusContract<
  Registry extends CommandsRegistry = CommandsRegistry,
  QR extends QueriesRegistry = QueriesRegistry,
  ER extends EventsRegistry = EventsRegistry
> {
  execute<N extends keyof Registry & string>(
    command: DispatchCommand<Registry[N], Registry> & { name: N },
    handler: CommandHandler<HandlerCommand<Registry[N], Registry, QR, ER>>
  ): Promise<void>;

  execute<C extends Command = Registry[keyof Registry]>(
    command: DispatchCommand<C, Registry, QR>,
    handler: CommandHandler<HandlerCommand<C, Registry, QR, ER>>
  ): Promise<void>;

  dispatch<N extends keyof Registry & string>(
    command: DispatchCommand<Registry[N], Registry, QR> & { name: N }
  ): Promise<void>;

  dispatch<C extends Command = Registry[keyof Registry]>(
    command: DispatchCommand<C, Registry, QR>
  ): Promise<void>;

  register<Name extends keyof Registry & string>(
    commandName: Name,
    handler: CommandHandler<HandlerCommand<Registry[Name], Registry, QR, ER>>
  ): VoidFunction;

  register<C extends Command = Registry[keyof Registry]>(
    commandName: C['name'],
    handler: CommandHandler<HandlerCommand<C, Registry, QR, ER>>
  ): VoidFunction;

  unregister<Name extends keyof Registry & string>(
    commandName: Name,
    handler: CommandHandler<HandlerCommand<Registry[Name], Registry, QR, ER>>
  ): void;

  unregister<C extends Command = Registry[keyof Registry]>(
    commandName: C['name'],
    handler: CommandHandler<HandlerCommand<C, Registry, QR, ER>>
  ): void;

  disconnect(): void;
}
