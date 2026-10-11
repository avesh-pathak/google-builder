/**
 * The `server-only` package ships no type declarations (it is a runtime marker
 * that Next.js aliases during bundling). This ambient declaration keeps
 * `import "server-only";` type-safe in the route-facing server modules.
 */
declare module "server-only";
