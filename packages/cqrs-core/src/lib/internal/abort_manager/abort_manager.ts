export class AbortManager {
  #ongoingRequests: Map<string, AbortController> = new Map();

  addRequest(requestId: string, abortController: AbortController) {
    this.#ongoingRequests.set(requestId, abortController);
  }

  cancelRequest(requestId: string) {
    const abortController = this.#ongoingRequests.get(requestId);

    if (abortController) {
      abortController.abort();
      this.#ongoingRequests.delete(requestId);
    }
  }

  async execute<TResponse>(
    requestId: string,
    operation: (abortController: AbortController) => Promise<TResponse>
  ): Promise<TResponse> {
    const abortController = new AbortController();

    this.addRequest(requestId, abortController);

    return new Promise<TResponse>((resolve, reject) => {
      abortController.signal.addEventListener('abort', () => {
        reject(new Error(`Request '${requestId}' aborted`));
      });

      operation(abortController).then(resolve, reject);
    }).finally(() => {
      this.#ongoingRequests.delete(requestId);
    });
  }
}
