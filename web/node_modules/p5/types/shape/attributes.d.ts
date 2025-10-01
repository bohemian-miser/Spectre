// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Changes where ellipses, circles, and arcs are drawn.By default, the first two parameters of
 * ellipse(), circle(),
 * and arc()
 * are the x- and y-coordinates of the shape's center. The next parameters set
 * the shape's width and height. This is the same as calling
 * `ellipseMode(CENTER)`.`ellipseMode(RADIUS)` also uses the first two parameters to set the x- and
 * y-coordinates of the shape's center. The next parameters are half of the
 * shapes's width and height. Calling `ellipse(0, 0, 10, 15)` draws a shape
 * with a width of 20 and height of 30.`ellipseMode(CORNER)` uses the first two parameters as the upper-left
 * corner of the shape. The next parameters are its width and height.`ellipseMode(CORNERS)` uses the first two parameters as the location of one
 * corner of the ellipse's bounding box. The next parameters are the location
 * of the opposite corner.The argument passed to `ellipseMode()` must be written in ALL CAPS because
 * the constants `CENTER`, `RADIUS`, `CORNER`, and `CORNERS` are defined this
 * way. JavaScript is a case-sensitive language.
 *
 * @param either CENTER, RADIUS, CORNER, or CORNERS
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // White ellipse.
 * ellipseMode(RADIUS);
 * fill(255);
 * ellipse(50, 50, 30, 30);
 * 
 * // Gray ellipse.
 * ellipseMode(CENTER);
 * fill(100);
 * ellipse(50, 50, 30, 30);
 * 
 * describe('A white circle with a gray circle at its center. Both circles have black outlines.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // White ellipse.
 * ellipseMode(CORNER);
 * fill(255);
 * ellipse(25, 25, 50, 50);
 * 
 * // Gray ellipse.
 * ellipseMode(CORNERS);
 * fill(100);
 * ellipse(25, 25, 50, 50);
 * 
 * describe('A white circle with a gray circle at its top-left corner. Both circles have black outlines.');
 * }
 * </code>
 * </div>
 */
function ellipseMode(mode: CENTER | RADIUS | CORNER | CORNERS): void;

/**
 * Draws certain features with jagged (aliased) edges.smooth() is active by default. In 2D mode,
 * `noSmooth()` is helpful for scaling up images without blurring. The
 * functions don't affect shapes or fonts.In WebGL mode, `noSmooth()` causes all shapes to be drawn with jagged
 * (aliased) edges. The functions don't affect images or fonts.
 *
 * @example <div>
 * <code>
 * let heart;
 * 
 * async function setup() {
 * // Load a pixelated heart image from an image data string.
 * heart = await loadImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAAXNSR0IArs4c6QAAAEZJREFUGFd9jcsNACAIQ9tB2MeR3YdBMBBq8CIXPi2vBICIiOwkOedatllqWO6Y8yOWoyuNf1GZwgmf+RRG2YXr+xVFmA8HZ9Mx/KGPMtcAAAAASUVORK5CYII=');
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Antialiased hearts.
 * image(heart, 10, 10);
 * image(heart, 20, 10, 16, 16);
 * image(heart, 40, 10, 32, 32);
 * 
 * // Aliased hearts.
 * noSmooth();
 * image(heart, 10, 60);
 * image(heart, 20, 60, 16, 16);
 * image(heart, 40, 60, 32, 32);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * circle(0, 0, 80);
 * 
 * describe('A white circle on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Disable smoothing.
 * noSmooth();
 * 
 * background(200);
 * 
 * circle(0, 0, 80);
 * 
 * describe('A pixelated white circle on a gray background.');
 * }
 * </code>
 * </div>
 */
function noSmooth(): void;

/**
 * Changes where rectangles and squares are drawn.By default, the first two parameters of
 * rect() and square(),
 * are the x- and y-coordinates of the shape's upper left corner. The next parameters set
 * the shape's width and height. This is the same as calling
 * `rectMode(CORNER)`.`rectMode(CORNERS)` also uses the first two parameters as the location of
 * one of the corners. The next parameters are the location of the opposite
 * corner. This mode only works for rect().`rectMode(CENTER)` uses the first two parameters as the x- and
 * y-coordinates of the shape's center. The next parameters are its width and
 * height.`rectMode(RADIUS)` also uses the first two parameters as the x- and
 * y-coordinates of the shape's center. The next parameters are
 * half of the shape's width and height.The argument passed to `rectMode()` must be written in ALL CAPS because the
 * constants `CENTER`, `RADIUS`, `CORNER`, and `CORNERS` are defined this way.
 * JavaScript is a case-sensitive language.
 *
 * @param either CORNER, CORNERS, CENTER, or RADIUS
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * rectMode(CORNER);
 * fill(255);
 * rect(25, 25, 50, 50);
 * 
 * rectMode(CORNERS);
 * fill(100);
 * rect(25, 25, 50, 50);
 * 
 * describe('A small gray square drawn at the top-left corner of a white square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * rectMode(RADIUS);
 * fill(255);
 * rect(50, 50, 30, 30);
 * 
 * rectMode(CENTER);
 * fill(100);
 * rect(50, 50, 30, 30);
 * 
 * describe('A small gray square drawn at the center of a white square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * rectMode(CORNER);
 * fill(255);
 * square(25, 25, 50);
 * 
 * describe('A white square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * rectMode(RADIUS);
 * fill(255);
 * square(50, 50, 30);
 * 
 * rectMode(CENTER);
 * fill(100);
 * square(50, 50, 30);
 * 
 * describe('A small gray square drawn at the center of a white square.');
 * }
 * </code>
 * </div>
 */
function rectMode(mode: CENTER | RADIUS | CORNER | CORNERS): void;

/**
 * Draws certain features with smooth (antialiased) edges.`smooth()` is active by default. In 2D mode,
 * noSmooth() is helpful for scaling up images
 * without blurring. The functions don't affect shapes or fonts.In WebGL mode, noSmooth() causes all shapes to
 * be drawn with jagged (aliased) edges. The functions don't affect images or
 * fonts.
 *
 * @example <div>
 * <code>
 * let heart;
 * 
 * async function setup() {
 * // Load a pixelated heart image from an image data string.
 * heart = await loadImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAAXNSR0IArs4c6QAAAEZJREFUGFd9jcsNACAIQ9tB2MeR3YdBMBBq8CIXPi2vBICIiOwkOedatllqWO6Y8yOWoyuNf1GZwgmf+RRG2YXr+xVFmA8HZ9Mx/KGPMtcAAAAASUVORK5CYII=');
 * 
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Antialiased hearts.
 * image(heart, 10, 10);
 * image(heart, 20, 10, 16, 16);
 * image(heart, 40, 10, 32, 32);
 * 
 * // Aliased hearts.
 * noSmooth();
 * image(heart, 10, 60);
 * image(heart, 20, 60, 16, 16);
 * image(heart, 40, 60, 32, 32);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * circle(0, 0, 80);
 * 
 * describe('A white circle on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Disable smoothing.
 * noSmooth();
 * 
 * background(200);
 * 
 * circle(0, 0, 80);
 * 
 * describe('A pixelated white circle on a gray background.');
 * }
 * </code>
 * </div>
 */
function smooth(): void;

/**
 * Sets the style for rendering the ends of lines.The caps for line endings are either rounded (`ROUND`), squared
 * (`SQUARE`), or extended (`PROJECT`). The default cap is `ROUND`.The argument passed to `strokeCap()` must be written in ALL CAPS because
 * the constants `ROUND`, `SQUARE`, and `PROJECT` are defined this way.
 * JavaScript is a case-sensitive language.
 *
 * @param either ROUND, SQUARE, or PROJECT
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * strokeWeight(12);
 * 
 * // Top.
 * strokeCap(ROUND);
 * line(20, 30, 80, 30);
 * 
 * // Middle.
 * strokeCap(SQUARE);
 * line(20, 50, 80, 50);
 * 
 * // Bottom.
 * strokeCap(PROJECT);
 * line(20, 70, 80, 70);
 * 
 * describe(
 * 'Three horizontal lines. The top line has rounded ends, the middle line has squared ends, and the bottom line has longer, squared ends.'
 * );
 * }
 * </code>
 * </div>
 */
function strokeCap(cap: ROUND | SQUARE | PROJECT): void;

/**
 * Sets the style of the joints that connect line segments.Joints are either mitered (`MITER`), beveled (`BEVEL`), or rounded
 * (`ROUND`). The default joint is `MITER` in 2D mode and `ROUND` in WebGL
 * mode.The argument passed to `strokeJoin()` must be written in ALL CAPS because
 * the constants `MITER`, `BEVEL`, and `ROUND` are defined this way.
 * JavaScript is a case-sensitive language.
 *
 * @param either MITER, BEVEL, or ROUND
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the line.
 * noFill();
 * strokeWeight(10);
 * strokeJoin(MITER);
 * 
 * // Draw the line.
 * beginShape();
 * vertex(35, 20);
 * vertex(65, 50);
 * vertex(35, 80);
 * endShape();
 * 
 * describe('A right-facing arrowhead shape with a pointed tip in center of canvas.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the line.
 * noFill();
 * strokeWeight(10);
 * strokeJoin(BEVEL);
 * 
 * // Draw the line.
 * beginShape();
 * vertex(35, 20);
 * vertex(65, 50);
 * vertex(35, 80);
 * endShape();
 * 
 * describe('A right-facing arrowhead shape with a flat tip in center of canvas.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the line.
 * noFill();
 * strokeWeight(10);
 * strokeJoin(ROUND);
 * 
 * // Draw the line.
 * beginShape();
 * vertex(35, 20);
 * vertex(65, 50);
 * vertex(35, 80);
 * endShape();
 * 
 * describe('A right-facing arrowhead shape with a rounded tip in center of canvas.');
 * }
 * </code>
 * </div>
 */
function strokeJoin(join: MITER | BEVEL | ROUND): void;

/**
 * Sets the width of the stroke used for points, lines, and the outlines of
 * shapes.Note: `strokeWeight()` is affected by transformations, especially calls to
 * scale().
 *
 * @param the weight of the stroke (in pixels).
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Top.
 * line(20, 20, 80, 20);
 * 
 * // Middle.
 * strokeWeight(4);
 * line(20, 40, 80, 40);
 * 
 * // Bottom.
 * strokeWeight(10);
 * line(20, 70, 80, 70);
 * 
 * describe('Three horizontal black lines. The top line is thin, the middle is medium, and the bottom is thick.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Top.
 * line(20, 20, 80, 20);
 * 
 * // Scale by a factor of 5.
 * scale(5);
 * 
 * // Bottom. Coordinates are adjusted for scaling.
 * line(4, 8, 16, 8);
 * 
 * describe('Two horizontal black lines. The top line is thin and the bottom is five times thicker than the top.');
 * }
 * </code>
 * </div>
 */
function strokeWeight(weight: number): void;

}

export default function attributes(p5: any, fn: any): void;
