declare module "*.worker.ts" {
  class WorkerWrapper extends Worker {
    constructor();
  }
  export default WorkerWrapper;
}
