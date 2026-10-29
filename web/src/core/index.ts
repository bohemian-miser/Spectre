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
export * from './dual';
export * from './analysis-request';
export * from './subsets';
export * from './colors';
export * from './serialize';
export * from './stats';
export * from './exact';
export * from './automaton';
export * from './unrooted';
export * from './strandGraph';
export * from './decompose';
export * from './isomorphism';
export * from './hexRule';
export * from './morph';
export * from './flowLattice';
export * from './flowOverlay';
export * from './strandCurves';
export * from './scaling';
export * from './decomposition';
export * from './faultLines';
export * from './centreMap';
export * from './pairingSearch';
export * from './transducer';
export * from './seam';
export * from './circuitSides';
export * from './circuitWord';
export * from './topDown';
