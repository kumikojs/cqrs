import type {
  BusErrorDetails,
  BusErrorKeys,
} from '../../types/infrastructure/bus';

/**
 * The BusException class is a custom exception class that extends the Error class.
 * It holds error details including a key and message.
 *
 * @extends Error
 * @class
 */
export class BusException extends Error {
  constructor(
    public readonly key: BusErrorKeys,
    public readonly details: BusErrorDetails
  ) {
    super(details.message);
    this.name = 'BusException';
  }
}
