// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Returns a Float32Array window sized to the exact length of the data
 *
 */
function dataArray(): void;

/**
 * A "soft" clear, which keeps the underlying storage size the same, but
 * empties the contents of its dataArray()
 *
 */
function clear(): void;

/**
 * Can be used to scale a DataArray back down to fit its contents.
 *
 */
function rescale(): void;

/**
 * A full reset, which allocates a new underlying Float32Array at its initial
 * length
 *
 */
function reset(): void;

/**
 * Adds values to the DataArray, expanding its internal storage to
 * accommodate the new items.
 *
 */
function push(...values: any[]): void;

/**
 * Returns a copy of the data from the index `from`, inclusive, to the index
 * `to`, exclusive
 *
 */
function slice(from: any, to: any): void;

/**
 * Returns a mutable Float32Array window from the index `from`, inclusive, to
 * the index `to`, exclusive
 *
 */
function subArray(from: any, to: any): void;

/**
 * Expand capacity of the internal storage until it can fit a target size
 *
 */
function ensureLength(target: any): void;

}

export default function p5_DataArray(p5: any, fn: any): void;
