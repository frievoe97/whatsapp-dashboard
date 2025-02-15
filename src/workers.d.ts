/**
 * TypeScript module declaration for Web Workers.
 *
 * This declaration allows importing TypeScript worker files with the `*.worker.ts` extension.
 * It ensures that when a worker is instantiated, it behaves as expected within TypeScript.
 */
declare module '*.worker.ts' {
  /**
   * A wrapper class extending the Web Worker API.
   */
  class WorkerWrapper extends Worker {
    constructor();
  }

  export default WorkerWrapper;
}
