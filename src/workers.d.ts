/**
 * Module declaration for TypeScript Web Worker files.
 *
 * This declaration allows importing files with the `.worker.ts` extension.
 * Imported workers will be treated as a class that extends the native Web Worker API.
 */
declare module '*.worker.ts' {
  /**
   * A custom Worker class that extends the native Web Worker.
   * This wrapper allows TypeScript to correctly infer types when importing worker files.
   */
  class WorkerWrapper extends Worker {
    constructor();
  }

  export default WorkerWrapper;
}
