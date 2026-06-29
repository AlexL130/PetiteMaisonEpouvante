import "@testing-library/jest-dom";

// Mock IntersectionObserver for framer-motion in jsdom
(globalThis as Record<string, unknown>).IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds = [0];
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof globalThis.IntersectionObserver;
