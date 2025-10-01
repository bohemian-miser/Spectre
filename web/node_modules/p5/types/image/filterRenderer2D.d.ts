// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Creates a new FilterRenderer2D instance.
 *
 * @param The p5.js instance.
 */
function constructor(pInst: p5): void;

/**
 * Set the current filter operation and parameter. If a customShader is provided,
 * that overrides the operation-based shader.
 *
 * @param The filter operation type (e.g., constants.BLUR).
 * @param The strength of the filter.
 * @param Optional custom shader.
 */
function setOperation(operation: string, filterParameter: number, customShader: p5.Shader): void;

/**
 * Initializes or retrieves the shader program for the current operation.
 * If a customShader is provided, that is used.
 * Otherwise, returns a cached shader if available, or creates a new one, caches it, and sets it as current.
 *
 */
function _initializeShader(): void;

/**
 * Binds a buffer to the drawing context
 * when passed more than two arguments it also updates or initializes
 * the data associated with the buffer
 *
 */
function _bindBufferData(buffer: any, target: any, values: any): void;

/**
 * Prepares and runs the full-screen quad draw call.
 *
 */
function _renderPass(): void;

/**
 * Applies the current filter operation. If the filter requires multiple passes (e.g. blur),
 * it handles those internally. Make sure setOperation() has been called before applyFilter().
 *
 */
function applyFilter(): void;

}

export default function filterRenderer2D(p5: any, fn: any): void;
