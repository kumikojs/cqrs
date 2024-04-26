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
  ): Promise<TResponse | null> {
    const abortController = new AbortController();

    this.addRequest(requestId, abortController);

    return new Promise<TResponse>((resolve, reject) => {
      abortController.signal.addEventListener('abort', () => {
        reject(
          new DOMException(`Request ${requestId} was aborted`, 'AbortError')
        );
      });

      operation(abortController).then(resolve, reject);
    })
      .catch((e) => {
        if (e.name === 'AbortError') {
          console.warn(e.message);
          return null;
        }

        throw e;
      })
      .finally(() => {
        this.#ongoingRequests.delete(requestId);
      });
  }
}
