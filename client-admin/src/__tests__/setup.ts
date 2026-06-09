// =============================================================================
// setup.ts
// Global test environment configuration — runs once before every test file.
// =============================================================================

import '@testing-library/jest-dom';

// Vite replaces __APP_VERSION__ at build time via `define` in vite.config.ts.
// In the jsdom test environment the replacement never happens, so we provide
// a stub value here to prevent "ReferenceError: __APP_VERSION__ is not defined"
// in components that render it (e.g. LoginScreen).
(globalThis as Record<string, unknown>).__APP_VERSION__ = '0.0.0-test';
