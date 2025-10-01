// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Creates a screen reader-accessible description of the canvas.The first parameter, `text`, is the description of the canvas.The second parameter, `display`, is optional. It determines how the
 * description is displayed. If `LABEL` is passed, as in
 * `describe('A description.', LABEL)`, the description will be visible in
 * a div element next to the canvas. If `FALLBACK` is passed, as in
 * `describe('A description.', FALLBACK)`, the description will only be
 * visible to screen readers. This is the default mode.Read
 * Writing accessible canvas descriptions
 * to learn more about making sketches accessible.
 *
 * @param description of the canvas.
 * @param either LABEL or FALLBACK.
 * @example <div>
 * <code>
 * function setup() {
 * background('pink');
 * 
 * // Draw a heart.
 * fill('red');
 * noStroke();
 * circle(67, 67, 20);
 * circle(83, 67, 20);
 * triangle(91, 73, 75, 95, 59, 73);
 * 
 * // Add a general description of the canvas.
 * describe('A pink square with a red heart in the bottom-right corner.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * background('pink');
 * 
 * // Draw a heart.
 * fill('red');
 * noStroke();
 * circle(67, 67, 20);
 * circle(83, 67, 20);
 * triangle(91, 73, 75, 95, 59, 73);
 * 
 * // Add a general description of the canvas
 * // and display it for debugging.
 * describe('A pink square with a red heart in the bottom-right corner.', LABEL);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * 
 * function setup(){
 * createCanvas(100, 100);
 * };
 * 
 * function draw() {
 * background(200);
 * 
 * // The expression
 * // frameCount % 100
 * // causes x to increase from 0
 * // to 99, then restart from 0.
 * let x = frameCount % 100;
 * 
 * // Draw the circle.
 * fill(0, 255, 0);
 * circle(x, 50, 40);
 * 
 * // Add a general description of the canvas.
 * describe(`A green circle at (${x}, 50) moves from left to right on a gray square.`);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * 
 * function setup(){
 * createCanvas(100, 100);
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // The expression
 * // frameCount % 100
 * // causes x to increase from 0
 * // to 99, then restart from 0.
 * let x = frameCount % 100;
 * 
 * // Draw the circle.
 * fill(0, 255, 0);
 * circle(x, 50, 40);
 * 
 * // Add a general description of the canvas
 * // and display it for debugging.
 * describe(`A green circle at (${x}, 50) moves from left to right on a gray square.`, LABEL);
 * }
 * </code>
 * </div>
 */
function describe(text: string, display?: FALLBACK | LABEL): void;

/**
 * Creates a screen reader-accessible description of elements in the canvas.Elements are shapes or groups of shapes that create meaning together. For
 * example, a few overlapping circles could make an "eye" element.The first parameter, `name`, is the name of the element.The second parameter, `text`, is the description of the element.The third parameter, `display`, is optional. It determines how the
 * description is displayed. If `LABEL` is passed, as in
 * `describe('A description.', LABEL)`, the description will be visible in
 * a div element next to the canvas. Using `LABEL` creates unhelpful
 * duplicates for screen readers. Only use `LABEL` during development. If
 * `FALLBACK` is passed, as in `describe('A description.', FALLBACK)`, the
 * description will only be visible to screen readers. This is the default
 * mode.Read
 * Writing accessible canvas descriptions
 * to learn more about making sketches accessible.
 *
 * @param name of the element.
 * @param description of the element.
 * @param either LABEL or FALLBACK.
 * @example <div>
 * <code>
 * function setup() {
 * background('pink');
 * 
 * // Describe the first element
 * // and draw it.
 * describeElement('Circle', 'A yellow circle in the top-left corner.');
 * noStroke();
 * fill('yellow');
 * circle(25, 25, 40);
 * 
 * // Describe the second element
 * // and draw it.
 * describeElement('Heart', 'A red heart in the bottom-right corner.');
 * fill('red');
 * circle(66.6, 66.6, 20);
 * circle(83.2, 66.6, 20);
 * triangle(91.2, 72.6, 75, 95, 58.6, 72.6);
 * 
 * // Add a general description of the canvas.
 * describe('A red heart and yellow circle over a pink background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * background('pink');
 * 
 * // Describe the first element
 * // and draw it. Display the
 * // description for debugging.
 * describeElement('Circle', 'A yellow circle in the top-left corner.', LABEL);
 * noStroke();
 * fill('yellow');
 * circle(25, 25, 40);
 * 
 * // Describe the second element
 * // and draw it. Display the
 * // description for debugging.
 * describeElement('Heart', 'A red heart in the bottom-right corner.', LABEL);
 * fill('red');
 * circle(66.6, 66.6, 20);
 * circle(83.2, 66.6, 20);
 * triangle(91.2, 72.6, 75, 95, 58.6, 72.6);
 * 
 * // Add a general description of the canvas.
 * describe('A red heart and yellow circle over a pink background.');
 * }
 * </code>
 * </div>
 */
function describeElement(name: string, text: string, display?: FALLBACK | LABEL): void;

}

export default function describe(p5: any, fn: any): void;
