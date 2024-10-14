import { AbortException } from './exceptions/abort_exception';

/**
 * Manages ongoing requests and provides functionality to add, cancel, and execute requests with abort capability.
 */
export class AbortManager {
  #ongoingRequests: Map<string, AbortController> = new Map();

  /**
   * Adds a request to the ongoing requests map.
   * @param requestId - The unique identifier for the request.
   * @param abortController - The `AbortController` associated with the request.
   */
  addRequest(requestId: string, abortController: AbortController) {
    this.#ongoingRequests.set(requestId, abortController);
  }

  /**
   * Cancels a request by aborting its associated `AbortController`.
   * @param requestId - The unique identifier of the request to be canceled.
   */
  cancelRequest(requestId: string) {
    const abortController = this.#ongoingRequests.get(requestId);

    if (abortController) {
      abortController.abort();
      this.#ongoingRequests.delete(requestId);
    }
  }

  /**
   * Executes an asynchronous operation with abort capability.
   * @param requestId - The unique identifier for the request.
   * @param operation - The asynchronous operation to be executed, which takes an `AbortController` as a parameter and returns a promise.
   * @returns A promise that resolves with the response of the operation.
   */
  async execute<TResponse>(
    requestId: string,
    operation: (abortController: AbortController) => Promise<TResponse>
  ): Promise<TResponse> {
    const abortController = new AbortController();

    this.addRequest(requestId, abortController);

    return new Promise<TResponse>((resolve, reject) => {
      abortController.signal.addEventListener('abort', () => {
        reject(new AbortException(`Request ${requestId} was aborted`));
      });

      operation(abortController).then(resolve, reject);
    }).finally(() => {
      this.#ongoingRequests.delete(requestId);
    });
  }

  /**
   * Cancels all ongoing requests.
   */
  disconnect() {
    for (const requestId of this.#ongoingRequests.keys()) {
      this.cancelRequest(requestId);
    }

    this.#ongoingRequests.clear();

    return this;
  }
}
