// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Convert an HSBA array to HSLA.
 *
 */
function _hsbaToHSLA(hsba: any): void;

/**
 * Convert an HSBA array to RGBA.
 *
 */
function _hsbaToRGBA(hsba: any): void;

/**
 * Convert an HSLA array to HSBA.
 *
 */
function _hslaToHSBA(hsla: any): void;

/**
 * Convert an HSLA array to RGBA.We need to change basis from HSLA to something that can be more easily be
 * projected onto RGBA. We will choose hue and brightness as our first two
 * components, and pick a convenient third one ('zest') so that we don't need
 * to calculate formal HSBA saturation.
 *
 */
function _hslaToRGBA(hsla: any): void;

/**
 * Convert an RGBA array to HSBA.
 *
 */
function _rgbaToHSBA(rgba: any): void;

/**
 * Convert an RGBA array to HSLA.
 *
 */
function _rgbaToHSLA(rgba: any): void;

}

export default function color_conversion(p5: any, fn: any): void;
