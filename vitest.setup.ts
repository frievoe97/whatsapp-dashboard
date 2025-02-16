/**
 * vitest.setup.ts
 *
 * This setup file for Vitest provides a simple polyfill for the ResizeObserver API.
 * If the global ResizeObserver is not available (e.g., in a test environment),
 * a mock implementation is assigned to ensure that tests do not fail due to its absence.
 */

if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
