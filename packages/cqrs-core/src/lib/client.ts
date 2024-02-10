import { CommandBus, type CommandBusContract } from './command/command-bus';

export class Client {
  #commandBus: CommandBusContract;

  constructor({
    commandBus = new CommandBus(),
  }: { commandBus?: CommandBusContract } = {}) {
    this.#commandBus = commandBus;
  }

  get command() {
    return {
      bind: this.#commandBus.bind,
      dispatch: this.#commandBus.execute,
      interception: this.#commandBus.interceptors,
    };
  }
}
