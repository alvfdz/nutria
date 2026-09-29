/**
 * Stand-in for the `server-only` package, which throws on import unless the
 * bundler resolved it through the `react-server` condition. Tests alias the
 * real module here; the module only marks intent, so an empty file is enough.
 */
export {};
