// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * ensures that p5 is using a 3d renderer. throws an error if not.
 *
 */
function _assert3d(name: any): void;

/**
 * Creates a new p5.Geometry that contains all
 * the shapes drawn in a provided callback function. The returned combined shape
 * can then be drawn all at once using model().If you need to draw complex shapes every frame which don't change over time,
 * combining them with `buildGeometry()` once and then drawing that will run
 * faster than repeatedly drawing the individual pieces.One can also draw shapes directly between
 * beginGeometry() and
 * endGeometry() instead of using a callback
 * function.
 *
 * @param A function that draws shapes.
 * @returns The model that was built from the callback function.
 */
function buildGeometry(callback: Function): p5.Geometry;

/**
 * [background description]
 *
 */
function background(...args: any[]): void;

/**
 * Get a matrix from world-space to screen-space
 *
 */
function getWorldToScreenMatrix(): void;

/**
 * Basic fill material for geometry with a given color
 *
 * @param gray value,
 * red or hue value (depending on the current color mode),
 * or color Array, or CSS color string
 * @param green or saturation value
 * @param blue or brightness value
 * @param opacity
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * }
 * 
 * function draw() {
 * background(0);
 * noStroke();
 * fill(100, 100, 240);
 * rotateX(frameCount * 0.01);
 * rotateY(frameCount * 0.01);
 * box(75, 75, 75);
 * }
 * </code>
 * </div>
 * @alt black canvas with purple cube spinning
 */
function fill(...args: any[], v1: number | number[] | string | p5.Color, v2?: number, v3?: number, a?: number): void;

/**
 * Basic stroke material for geometry with a given color
 *
 * @param gray value,
 * red or hue value (depending on the current color mode),
 * or color Array, or CSS color string
 * @param green or saturation value
 * @param blue or brightness value
 * @param opacity
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * }
 * 
 * function draw() {
 * background(0);
 * stroke(240, 150, 150);
 * fill(100, 100, 240);
 * rotateX(frameCount * 0.01);
 * rotateY(frameCount * 0.01);
 * box(75, 75, 75);
 * }
 * </code>
 * </div>
 * @alt black canvas with purple cube with pink outline spinning
 */
function stroke(...args: any[], v1: number | number[] | string | p5.Color, v2?: number, v3?: number, a?: number): void;

/**
 * Resets all depth information so that nothing previously drawn will
 * occlude anything subsequently drawn.
 *
 */
function clearDepth(depth: any): void;

/**
 * Set attributes for the WebGL Drawing context.
 * This is a way of adjusting how the WebGL
 * renderer works to fine-tune the display and performance.Note that this will reinitialize the drawing context
 * if called after the WebGL canvas is made.If an object is passed as the parameter, all attributes
 * not declared in the object will be set to defaults.The available attributes are:
 * 
 * alpha - indicates if the canvas contains an alpha buffer
 * default is truedepth - indicates whether the drawing buffer has a depth buffer
 * of at least 16 bits - default is truestencil - indicates whether the drawing buffer has a stencil buffer
 * of at least 8 bitsantialias - indicates whether or not to perform anti-aliasing
 * default is false (true in Safari)premultipliedAlpha - indicates that the page compositor will assume
 * the drawing buffer contains colors with pre-multiplied alpha
 * default is truepreserveDrawingBuffer - if true the buffers will not be cleared and
 * and will preserve their values until cleared or overwritten by author
 * (note that p5 clears automatically on draw loop)
 * default is trueperPixelLighting - if true, per-pixel lighting will be used in the
 * lighting shader otherwise per-vertex lighting is used.
 * default is true.version - either 1 or 2, to specify which WebGL version to ask for. By
 * default, WebGL 2 will be requested. If WebGL2 is not available, it will
 * fall back to WebGL 1. You can check what version is used with by looking at
 * the global `webglVersion` property.
 *
 * @for p5
 * @param Name of attribute
 * @param New value of named attribute
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * }
 * 
 * function draw() {
 * background(255);
 * push();
 * rotateZ(frameCount * 0.02);
 * rotateX(frameCount * 0.02);
 * rotateY(frameCount * 0.02);
 * fill(0, 0, 0);
 * box(50);
 * pop();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Now with the antialias attribute set to true.
 * function setup() {
 * setAttributes('antialias', true);
 * createCanvas(100, 100, WEBGL);
 * }
 * 
 * function draw() {
 * background(255);
 * push();
 * rotateZ(frameCount * 0.02);
 * rotateX(frameCount * 0.02);
 * rotateY(frameCount * 0.02);
 * fill(0, 0, 0);
 * box(50);
 * pop();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // press the mouse button to disable perPixelLighting
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * noStroke();
 * fill(255);
 * }
 * 
 * let lights = [
 * { c: '#f00', t: 1.12, p: 1.91, r: 0.2 },
 * { c: '#0f0', t: 1.21, p: 1.31, r: 0.2 },
 * { c: '#00f', t: 1.37, p: 1.57, r: 0.2 },
 * { c: '#ff0', t: 1.12, p: 1.91, r: 0.7 },
 * { c: '#0ff', t: 1.21, p: 1.31, r: 0.7 },
 * { c: '#f0f', t: 1.37, p: 1.57, r: 0.7 }
 * ];
 * 
 * function draw() {
 * let t = millis() / 1000 + 1000;
 * background(0);
 * directionalLight(color('#222'), 1, 1, 1);
 * 
 * for (let i = 0; i < lights.length; i++) {
 * let light = lights[i];
 * pointLight(
 * color(light.c),
 * p5.Vector.fromAngles(t * light.t, t * light.p, width * light.r)
 * );
 * }
 * 
 * specularMaterial(255);
 * sphere(width * 0.1);
 * 
 * rotateX(t * 0.77);
 * rotateY(t * 0.83);
 * rotateZ(t * 0.91);
 * torus(width * 0.3, width * 0.07, 24, 10);
 * }
 * 
 * function mousePressed() {
 * setAttributes('perPixelLighting', false);
 * noStroke();
 * fill(255);
 * }
 * function mouseReleased() {
 * setAttributes('perPixelLighting', true);
 * noStroke();
 * fill(255);
 * }
 * </code>
 * </div>
 * @alt a rotating cube with smoother edges
 */
function setAttributes(key: string, value: boolean): void;

/**
 * @for p5
 * @param object with key-value pairs
 */
function setAttributes(obj: object): void;

}

export default function p5_RendererGL(p5: any, fn: any): void;
