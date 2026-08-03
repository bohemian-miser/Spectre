/**
 * Public barrel for the pure-TypeScript core library.
 *
 * Layering rule (DESIGN.md §1.2): everything under `core/` is framework-free —
 * no React, no p5, no DOM/window access — so it runs unchanged in a Web Worker
 * and is directly unit-testable.
 */

export * from './geom';
export * from './families';
export * from './edges';
export * from './tiles';
export * from './outline';
export * from './matchings';
export * from './circuits';
export * from './subsets';
export * from './colors';
export * from './serialize';
export * from './stats';
