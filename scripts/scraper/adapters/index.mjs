import example from './example-fixture.mjs';
// Register adapters here. One adapter per source; each must be tied to a registry source
// that passes the allowlist before it can run.
export const adapters = { [example.id]: example };
