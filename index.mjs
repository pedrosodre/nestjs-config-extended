// ESM entry point. Re-exports the CommonJS build so ESM and CJS consumers
// share a single copy of the library (avoids the dual-package hazard with
// NestJS dependency injection, which relies on class identity).
export * from './dist/index.js';
