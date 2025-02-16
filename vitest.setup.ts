// vitest.setup.ts
if (typeof window.ResizeObserver === 'undefined') {
  // Einfacher Mock/Polyfill für ResizeObserver
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
