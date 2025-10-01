// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Vector } from '../math/p5.Vector';

declare module 'p5' {
/**
 * This function does 3 things:
 *
 */
function _normalizeArcAngles(start: any, stop: any, width: any, height: any, correctForScaling: any): void;

/**
 * Draws an arc.An arc is a section of an ellipse defined by the `x`, `y`, `w`, and
 * `h` parameters. `x` and `y` set the location of the arc's center. `w` and
 * `h` set the arc's width and height. See
 * ellipse() and
 * ellipseMode() for more details.The fifth and sixth parameters, `start` and `stop`, set the angles
 * between which to draw the arc. Arcs are always drawn clockwise from
 * `start` to `stop`. Angles are always given in radians.The seventh parameter, `mode`, is optional. It determines the arc's fill
 * style. The fill modes are a semi-circle (`OPEN`), a closed semi-circle
 * (`CHORD`), or a closed pie segment (`PIE`).The eighth parameter, `detail`, is also optional. It determines how many
 * vertices are used to draw the arc in WebGL mode. The default value is 25.
 *
 * @param x-coordinate of the arc's ellipse.
 * @param y-coordinate of the arc's ellipse.
 * @param width of the arc's ellipse by default.
 * @param height of the arc's ellipse by default.
 * @param angle to start the arc, specified in radians.
 * @param angle to stop the arc, specified in radians.
 * @param optional parameter to determine the way of drawing
 * the arc. either CHORD, PIE, or OPEN.
 * @param optional parameter for WebGL mode only. This is to
 * specify the number of vertices that makes up the
 * perimeter of the arc. Default value is 25. Won't
 * draw a stroke for a detail of more than 50.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * arc(50, 50, 80, 80, 0, PI + HALF_PI);
 * 
 * describe('A white circle on a gray canvas. The top-right quarter of the circle is missing.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * arc(50, 50, 80, 40, 0, PI + HALF_PI);
 * 
 * describe('A white ellipse on a gray canvas. The top-right quarter of the ellipse is missing.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Bottom-right.
 * arc(50, 55, 50, 50, 0, HALF_PI);
 * 
 * noFill();
 * 
 * // Bottom-left.
 * arc(50, 55, 60, 60, HALF_PI, PI);
 * 
 * // Top-left.
 * arc(50, 55, 70, 70, PI, PI + QUARTER_PI);
 * 
 * // Top-right.
 * arc(50, 55, 80, 80, PI + QUARTER_PI, TWO_PI);
 * 
 * describe(
 * 'A shattered outline of an circle with a quarter of a white circle at the bottom-right.'
 * );
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
 * // Default fill mode.
 * arc(50, 50, 80, 80, 0, PI + QUARTER_PI);
 * 
 * describe('A white circle with the top-right third missing. The bottom is outlined in black.');
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
 * // OPEN fill mode.
 * arc(50, 50, 80, 80, 0, PI + QUARTER_PI, OPEN);
 * 
 * describe(
 * 'A white circle missing a section from the top-right. The bottom is outlined in black.'
 * );
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
 * // CHORD fill mode.
 * arc(50, 50, 80, 80, 0, PI + QUARTER_PI, CHORD);
 * 
 * describe('A white circle with a black outline missing a section from the top-right.');
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
 * // PIE fill mode.
 * arc(50, 50, 80, 80, 0, PI + QUARTER_PI, PIE);
 * 
 * describe('A white circle with a black outline. The top-right third is missing.');
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
 * // PIE fill mode.
 * arc(0, 0, 80, 80, 0, PI + QUARTER_PI, PIE);
 * 
 * describe('A white circle with a black outline. The top-right third is missing.');
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
 * // PIE fill mode with 5 vertices.
 * arc(0, 0, 80, 80, 0, PI + QUARTER_PI, PIE, 5);
 * 
 * describe('A white circle with a black outline. The top-right third is missing.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A yellow circle on a black background. The circle opens and closes its mouth.');
 * }
 * 
 * function draw() {
 * background(0);
 * 
 * // Style the arc.
 * noStroke();
 * fill(255, 255, 0);
 * 
 * // Update start and stop angles.
 * let biteSize = PI / 16;
 * let startAngle = biteSize * sin(frameCount * 0.1) + biteSize;
 * let endAngle = TWO_PI - startAngle;
 * 
 * // Draw the arc.
 * arc(50, 50, 80, 80, startAngle, endAngle, PIE);
 * }
 * </code>
 * </div>
 */
function arc(x: number, y: number, w: number, h: number, start: number, stop: number, mode?: CHORD | PIE | OPEN, detail?: number): void;

/**
 * Draws an ellipse (oval).An ellipse is a round shape defined by the `x`, `y`, `w`, and
 * `h` parameters. `x` and `y` set the location of its center. `w` and
 * `h` set its width and height. See
 * ellipseMode() for other ways to set
 * its position.If no height is set, the value of width is used for both the width and
 * height. If a negative height or width is specified, the absolute value is
 * taken.The fifth parameter, `detail`, is also optional. It determines how many
 * vertices are used to draw the ellipse in WebGL mode. The default value is
 * 25.
 *
 * @param x-coordinate of the center of the ellipse.
 * @param y-coordinate of the center of the ellipse.
 * @param width of the ellipse.
 * @param height of the ellipse.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * ellipse(50, 50, 80, 80);
 * 
 * describe('A white circle on a gray canvas.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * ellipse(50, 50, 80);
 * 
 * describe('A white circle on a gray canvas.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * ellipse(50, 50, 80, 40);
 * 
 * describe('A white ellipse on a gray canvas.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * ellipse(0, 0, 80, 40);
 * 
 * describe('A white ellipse on a gray canvas.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Use 6 vertices.
 * ellipse(0, 0, 80, 40, 6);
 * 
 * describe('A white hexagon on a gray canvas.');
 * }
 * </code>
 * </div>
 */
function ellipse(x: number, y: number, w: number, h?: number): void;

/**
 * @param optional parameter for WebGL mode only. This is to
 * specify the number of vertices that makes up the
 * perimeter of the ellipse. Default value is 25. Won't
 * draw a stroke for a detail of more than 50.
 */
function ellipse(x: number, y: number, w: number, h: number, detail?: number): void;

/**
 * Draws a circle.A circle is a round shape defined by the `x`, `y`, and `d` parameters.
 * `x` and `y` set the location of its center. `d` sets its width and height (diameter).
 * Every point on the circle's edge is the same distance, `0.5 * d`, from its center.
 * `0.5 * d` (half the diameter) is the circle's radius.
 * See ellipseMode() for other ways to set its position.
 *
 * @param x-coordinate of the center of the circle.
 * @param y-coordinate of the center of the circle.
 * @param diameter of the circle.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * circle(50, 50, 25);
 * 
 * describe('A white circle with black outline in the middle of a gray canvas.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * circle(0, 0, 25);
 * 
 * describe('A white circle with black outline in the middle of a gray canvas.');
 * }
 * </code>
 * </div>
 */
function circle(x: number, y: number, d: number): void;

/**
 * Draws a straight line between two points.A line's default width is one pixel. The version of `line()` with four
 * parameters draws the line in 2D. To color a line, use the
 * stroke() function. To change its width, use the
 * strokeWeight() function. A line
 * can't be filled, so the fill() function won't
 * affect the line's color.The version of `line()` with six parameters allows the line to be drawn in
 * 3D space. Doing so requires adding the `WEBGL` argument to
 * createCanvas().
 *
 * @param the x-coordinate of the first point.
 * @param the y-coordinate of the first point.
 * @param the x-coordinate of the second point.
 * @param the y-coordinate of the second point.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * line(30, 20, 85, 75);
 * 
 * describe(
 * 'A black line on a gray canvas running from top-center to bottom-right.'
 * );
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the line.
 * stroke('magenta');
 * strokeWeight(5);
 * 
 * line(30, 20, 85, 75);
 * 
 * describe(
 * 'A thick, magenta line on a gray canvas running from top-center to bottom-right.'
 * );
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
 * line(30, 20, 85, 20);
 * 
 * // Right.
 * stroke(126);
 * line(85, 20, 85, 75);
 * 
 * // Bottom.
 * stroke(255);
 * line(85, 75, 30, 75);
 * 
 * describe(
 * 'Three lines drawn in grayscale on a gray canvas. They form the top, right, and bottom sides of a square.'
 * );
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * line(-20, -30, 35, 25);
 * 
 * describe(
 * 'A black line on a gray canvas running from top-center to bottom-right.'
 * );
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A black line connecting two spheres. The scene spins slowly.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Draw a line.
 * line(0, 0, 0, 30, 20, -10);
 * 
 * // Draw the center sphere.
 * sphere(10);
 * 
 * // Translate to the second point.
 * translate(30, 20, -10);
 * 
 * // Draw the bottom-right sphere.
 * sphere(10);
 * }
 * </code>
 * </div>
 */
function line(x1: number, y1: number, x2: number, y2: number): void;

/**
 * @param the z-coordinate of the first point.
 * @param the z-coordinate of the second point.
 */
function line(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void;

/**
 * Draws a single point in space.A point's default width is one pixel. To color a point, use the
 * stroke() function. To change its width, use the
 * strokeWeight() function. A point
 * can't be filled, so the fill() function won't
 * affect the point's color.The version of `point()` with two parameters allows the point's location to
 * be set with its x- and y-coordinates, as in `point(10, 20)`.The version of `point()` with three parameters allows the point to be drawn
 * in 3D space with x-, y-, and z-coordinates, as in `point(10, 20, 30)`.
 * Doing so requires adding the `WEBGL` argument to
 * createCanvas().The version of `point()` with one parameter allows the point's location to
 * be set with a p5.Vector object.
 *
 * @param the x-coordinate.
 * @param the y-coordinate.
 * @param the z-coordinate (for WebGL mode).
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Top-left.
 * point(30, 20);
 * 
 * // Top-right.
 * point(85, 20);
 * 
 * // Bottom-right.
 * point(85, 75);
 * 
 * // Bottom-left.
 * point(30, 75);
 * 
 * describe(
 * 'Four small, black points drawn on a gray canvas. The points form the corners of a square.'
 * );
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
 * // Top-left.
 * point(30, 20);
 * 
 * // Top-right.
 * point(70, 20);
 * 
 * // Style the next points.
 * stroke('purple');
 * strokeWeight(10);
 * 
 * // Bottom-right.
 * point(70, 80);
 * 
 * // Bottom-left.
 * point(30, 80);
 * 
 * describe(
 * 'Four points drawn on a gray canvas. Two are black and two are purple. The points form the corners of a square.'
 * );
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
 * // Top-left.
 * let a = createVector(30, 20);
 * point(a);
 * 
 * // Top-right.
 * let b = createVector(70, 20);
 * point(b);
 * 
 * // Bottom-right.
 * let c = createVector(70, 80);
 * point(c);
 * 
 * // Bottom-left.
 * let d = createVector(30, 80);
 * point(d);
 * 
 * describe(
 * 'Four small, black points drawn on a gray canvas. The points form the corners of a square.'
 * );
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('Two purple points drawn on a gray canvas.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the points.
 * stroke('purple');
 * strokeWeight(10);
 * 
 * // Top-left.
 * point(-20, -30);
 * 
 * // Bottom-right.
 * point(20, 30);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('Two purple points drawn on a gray canvas. The scene spins slowly.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Style the points.
 * stroke('purple');
 * strokeWeight(10);
 * 
 * // Top-left.
 * point(-20, -30, 0);
 * 
 * // Bottom-right.
 * point(20, 30, -50);
 * }
 * </code>
 * </div>
 */
function point(x: number, y: number, z?: number): void;

/**
 * @param the coordinate vector.
 */
function point(coordinateVector: p5.Vector): void;

/**
 * Draws a quadrilateral (four-sided shape).Quadrilaterals include rectangles, squares, rhombuses, and trapezoids. The
 * first pair of parameters `(x1, y1)` sets the quad's first point. The next
 * three pairs of parameters set the coordinates for its next three points
 * `(x2, y2)`, `(x3, y3)`, and `(x4, y4)`. Points should be added in either
 * clockwise or counter-clockwise order.The version of `quad()` with twelve parameters allows the quad to be drawn
 * in 3D space. Doing so requires adding the `WEBGL` argument to
 * createCanvas().The thirteenth and fourteenth parameters are optional. In WebGL mode, they
 * set the number of segments used to draw the quadrilateral in the x- and
 * y-directions. They're both 2 by default.
 *
 * @param the x-coordinate of the first point.
 * @param the y-coordinate of the first point.
 * @param the x-coordinate of the second point.
 * @param the y-coordinate of the second point.
 * @param the x-coordinate of the third point.
 * @param the y-coordinate of the third point.
 * @param the x-coordinate of the fourth point.
 * @param the y-coordinate of the fourth point.
 * @param number of segments in the x-direction.
 * @param number of segments in the y-direction.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * quad(20, 20, 80, 20, 80, 80, 20, 80);
 * 
 * describe('A white square with a black outline drawn on a gray canvas.');
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
 * quad(20, 30, 80, 30, 80, 70, 20, 70);
 * 
 * describe('A white rectangle with a black outline drawn on a gray canvas.');
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
 * quad(50, 62, 86, 50, 50, 38, 14, 50);
 * 
 * describe('A white rhombus with a black outline drawn on a gray canvas.');
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
 * quad(20, 50, 80, 30, 80, 70, 20, 70);
 * 
 * describe('A white trapezoid with a black outline drawn on a gray canvas.');
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
 * quad(-30, -30, 30, -30, 30, 30, -30, 30);
 * 
 * describe('A white square with a black outline drawn on a gray canvas.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A wavy white surface spins around on gray canvas.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Draw the quad.
 * quad(-30, -30, 0, 30, -30, 0, 30, 30, 20, -30, 30, -20);
 * }
 * </code>
 * </div>
 */
function quad(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, detailX?: number, detailY?: number): void;

/**
 * @param the z-coordinate of the first point.
 * @param the z-coordinate of the second point.
 * @param the z-coordinate of the third point.
 * @param the z-coordinate of the fourth point.
 */
function quad(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number, x4: number, y4: number, z4: number, detailX?: number, detailY?: number): void;

/**
 * Draws a rectangle.A rectangle is a four-sided shape defined by the `x`, `y`, `w`, and `h`
 * parameters. `x` and `y` set the location of its top-left corner. `w` sets
 * its width and `h` sets its height. Every angle in the rectangle measures
 * 90˚. See rectMode() for other ways to define
 * rectangles.The version of `rect()` with five parameters creates a rounded rectangle. The
 * fifth parameter sets the radius for all four corners.The version of `rect()` with eight parameters also creates a rounded
 * rectangle. Each of the last four parameters set the radius of a corner. The
 * radii start with the top-left corner and move clockwise around the
 * rectangle. If any of these parameters are omitted, they are set to the
 * value of the last radius that was set.
 *
 * @param x-coordinate of the rectangle.
 * @param y-coordinate of the rectangle.
 * @param width of the rectangle.
 * @param height of the rectangle.
 * @param optional radius of top-left corner.
 * @param optional radius of top-right corner.
 * @param optional radius of bottom-right corner.
 * @param optional radius of bottom-left corner.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * rect(30, 20, 55, 55);
 * 
 * describe('A white square with a black outline on a gray canvas.');
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
 * rect(30, 20, 55, 40);
 * 
 * describe('A white rectangle with a black outline on a gray canvas.');
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
 * // Give all corners a radius of 20.
 * rect(30, 20, 55, 50, 20);
 * 
 * describe('A white rectangle with a black outline and round edges on a gray canvas.');
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
 * // Give each corner a unique radius.
 * rect(30, 20, 55, 50, 20, 15, 10, 5);
 * 
 * describe('A white rectangle with a black outline and round edges of different radii.');
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
 * rect(-20, -30, 55, 55);
 * 
 * describe('A white square with a black outline on a gray canvas.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white square spins around on gray canvas.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Draw the rectangle.
 * rect(-20, -30, 55, 55);
 * }
 * </code>
 * </div>
 */
function rect(x: number, y: number, w: number, h?: number, tl?: number, tr?: number, br?: number, bl?: number): void;

/**
 * @param number of segments in the x-direction (for WebGL mode).
 * @param number of segments in the y-direction (for WebGL mode).
 */
function rect(x: number, y: number, w: number, h: number, detailX?: number, detailY?: number): void;

/**
 * Draws a square.A square is a four-sided shape defined by the `x`, `y`, and `s`
 * parameters. `x` and `y` set the location of its top-left corner. `s` sets
 * its width and height. Every angle in the square measures 90˚ and all its
 * sides are the same length. See rectMode() for
 * other ways to define squares.The version of `square()` with four parameters creates a rounded square.
 * The fourth parameter sets the radius for all four corners.The version of `square()` with seven parameters also creates a rounded
 * square. Each of the last four parameters set the radius of a corner. The
 * radii start with the top-left corner and move clockwise around the
 * square. If any of these parameters are omitted, they are set to the
 * value of the last radius that was set.
 *
 * @param x-coordinate of the square.
 * @param y-coordinate of the square.
 * @param side size of the square.
 * @param optional radius of top-left corner.
 * @param optional radius of top-right corner.
 * @param optional radius of bottom-right corner.
 * @param optional radius of bottom-left corner.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * square(30, 20, 55);
 * 
 * describe('A white square with a black outline in on a gray canvas.');
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
 * // Give all corners a radius of 20.
 * square(30, 20, 55, 20);
 * 
 * describe(
 * 'A white square with a black outline and round edges on a gray canvas.'
 * );
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
 * // Give each corner a unique radius.
 * square(30, 20, 55, 20, 15, 10, 5);
 * 
 * describe('A white square with a black outline and round edges of different radii.');
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
 * square(-20, -30, 55);
 * 
 * describe('A white square with a black outline in on a gray canvas.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white square spins around on gray canvas.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Draw the square.
 * square(-20, -30, 55);
 * }
 * </code>
 * </div>
 */
function square(x: number, y: number, s: number, tl?: number, tr?: number, br?: number, bl?: number): void;

/**
 * Draws a triangle.A triangle is a three-sided shape defined by three points. The
 * first two parameters specify the triangle's first point `(x1, y1)`. The
 * middle two parameters specify its second point `(x2, y2)`. And the last two
 * parameters specify its third point `(x3, y3)`.
 *
 * @param x-coordinate of the first point.
 * @param y-coordinate of the first point.
 * @param x-coordinate of the second point.
 * @param y-coordinate of the second point.
 * @param x-coordinate of the third point.
 * @param y-coordinate of the third point.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * triangle(30, 75, 58, 20, 86, 75);
 * 
 * describe('A white triangle with a black outline on a gray canvas.');
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
 * triangle(-20, 25, 8, -30, 36, 25);
 * 
 * describe('A white triangle with a black outline on a gray canvas.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white triangle spins around on a gray canvas.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Draw the triangle.
 * triangle(-20, 25, 8, -30, 36, 25);
 * }
 * </code>
 * </div>
 */
function triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void;

}

export default function 2d_primitives(p5: any, fn: any): void;
