/**
 * Blog domain barrel.
 *
 * Both modules are re-exported because both are part of the contract a page, a
 * use case and an adapter all name: `article` is what a reader is served, and
 * `post-draft` is what an author writes. `post-repository` joins them as the
 * port the two are stored through.
 *
 * `export *` rather than a hand-written list, because a name that exists but is
 * missing from a barrel is a bug that only shows up at the import site, and a
 * barrel nobody has to remember to update cannot drift.
 */
export * from "./article";
export * from "./post-draft";
export * from "./post-repository";