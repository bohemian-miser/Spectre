// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * @param the x positions of points in the curve
 * @param the y positions of points in the curve
 * @param the curve information
 * 
 * adds a curve to the rows & columns that it intersects with
 */
function push(xs: number[], ys: number[], v: object): void;

/**
 * @param the value to scale
 * 
 * converts a floating-point number in the range 0-1 to a byte 0-255
 */
function byte(v: number): void;

/**
 * @param writes the next pixel into an indexed ImageData
 */
function setPixel(imageInfo: object, r: number, g: number, b: number, a: number): void;

/**
 * @param the list of values to compare
 * @param the initial minimum value
 * @param the initial maximum value
 * 
 * find the minimum & maximum value in a list of values
 */
function minMax(rg: number[], min: number, max: number): void;

/**
 * @param the value to clamp
 * @param the minimum value
 * @param the maxmimum value
 * 
 * clamps a value between a minimum & maximum value
 */
function clamp(v: number, min: number, max: number): void;

/**
 * @returns an array of cubics whose quadratic approximations
 * closely match the civen cubic.
 * 
 * converts a cubic curve to a list of quadratics.
 */
function cubicToQuadratics(x0: number, y0: number, cx0: number, cy0: number, cx1: number, cy1: number, x1: number, y1: number): Cubic[];

/**
 * @param add a straight line to the row/col grid of a glyph
 */
function pushLine(x0: number, y0: number, x1: number, y1: number): void;

/**
 * @return true if the two points are sufficiently close
 * 
 * tests if two points are close enough to be considered the same
 */
function samePoint(x0: number, y0: number, x1: number, y1: number): boolean;

/**
 * @return lays out the curves in a dimension (row or col) into two
 * images, one for the indices of the curves themselves, and
 * one containing the offset and length of those index spans.
 */
function layout(dimImageInfos: ImageInfo[], cellImageInfos: ImageInfo[]): object;

}

export default function text(p5: any, fn: any): void;
