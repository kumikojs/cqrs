export class AbortException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AbortException';
  }
}
