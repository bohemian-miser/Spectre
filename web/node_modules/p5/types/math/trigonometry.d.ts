// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Calculates the arc cosine of a number.`acos()` is the inverse of cos(). It expects
 * arguments in the range -1 to 1. By default, `acos()` returns values in the
 * range 0 to π (about 3.14). If the
 * angleMode() is `DEGREES`, then values are
 * returned in the range 0 to 180.
 *
 * @param value whose arc cosine is to be returned.
 * @return arc cosine of the given value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Calculate cos() and acos() values.
 * let a = PI;
 * let c = cos(a);
 * let ac = acos(c);
 * 
 * // Display the values.
 * text(`${round(a, 3)}`, 35, 25);
 * text(`${round(c, 3)}`, 35, 50);
 * text(`${round(ac, 3)}`, 35, 75);
 * 
 * describe('The numbers 3.142, -1, and 3.142 written on separate rows.');
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
 * // Calculate cos() and acos() values.
 * let a = PI + QUARTER_PI;
 * let c = cos(a);
 * let ac = acos(c);
 * 
 * // Display the values.
 * text(`${round(a, 3)}`, 35, 25);
 * text(`${round(c, 3)}`, 35, 50);
 * text(`${round(ac, 3)}`, 35, 75);
 * 
 * describe('The numbers 3.927, -0.707, and 2.356 written on separate rows.');
 * }
 * </code>
 * </div>
 */
function acos(value: number): number;

/**
 * Calculates the arc sine of a number.`asin()` is the inverse of sin(). It expects input
 * values in the range of -1 to 1. By default, `asin()` returns values in the
 * range -π ÷ 2 (about -1.57) to π ÷ 2 (about 1.57). If
 * the angleMode() is `DEGREES` then values are
 * returned in the range -90 to 90.
 *
 * @param value whose arc sine is to be returned.
 * @return arc sine of the given value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Calculate sin() and asin() values.
 * let a = PI / 3;
 * let s = sin(a);
 * let as = asin(s);
 * 
 * // Display the values.
 * text(`${round(a, 3)}`, 35, 25);
 * text(`${round(s, 3)}`, 35, 50);
 * text(`${round(as, 3)}`, 35, 75);
 * 
 * describe('The numbers 1.047, 0.866, and 1.047 written on separate rows.');
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
 * // Calculate sin() and asin() values.
 * let a = PI + PI / 3;
 * let s = sin(a);
 * let as = asin(s);
 * 
 * // Display the values.
 * text(`${round(a, 3)}`, 35, 25);
 * text(`${round(s, 3)}`, 35, 50);
 * text(`${round(as, 3)}`, 35, 75);
 * 
 * describe('The numbers 4.189, -0.866, and -1.047 written on separate rows.');
 * }
 * </code>
 * </div>
 */
function asin(value: number): number;

/**
 * Calculates the arc tangent of a number.`atan()` is the inverse of tan(). It expects input
 * values in the range of -Infinity to Infinity. By default, `atan()` returns
 * values in the range -π ÷ 2 (about -1.57) to π ÷ 2
 * (about 1.57). If the angleMode() is `DEGREES`
 * then values are returned in the range -90 to 90.
 *
 * @param value whose arc tangent is to be returned.
 * @return arc tangent of the given value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Calculate tan() and atan() values.
 * let a = PI / 3;
 * let t = tan(a);
 * let at = atan(t);
 * 
 * // Display the values.
 * text(`${round(a, 3)}`, 35, 25);
 * text(`${round(t, 3)}`, 35, 50);
 * text(`${round(at, 3)}`, 35, 75);
 * 
 * describe('The numbers 1.047, 1.732, and 1.047 written on separate rows.');
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
 * // Calculate tan() and atan() values.
 * let a = PI + PI / 3;
 * let t = tan(a);
 * let at = atan(t);
 * 
 * // Display the values.
 * text(`${round(a, 3)}`, 35, 25);
 * text(`${round(t, 3)}`, 35, 50);
 * text(`${round(at, 3)}`, 35, 75);
 * 
 * describe('The numbers 4.189, 1.732, and 1.047 written on separate rows.');
 * }
 * </code>
 * </div>
 */
function atan(value: number): number;

/**
 * Calculates the angle formed by a point, the origin, and the positive
 * x-axis.`atan2()` is most often used for orienting geometry to the mouse's
 * position, as in `atan2(mouseY, mouseX)`. The first parameter is the point's
 * y-coordinate and the second parameter is its x-coordinate.By default, `atan2()` returns values in the range
 * -π (about -3.14) to π (3.14). If the
 * angleMode() is `DEGREES`, then values are
 * returned in the range -180 to 180.
 *
 * @param y-coordinate of the point.
 * @param x-coordinate of the point.
 * @return arc tangent of the given point.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A rectangle at the top-left of the canvas rotates with mouse movements.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the angle between the mouse
 * // and the origin.
 * let a = atan2(mouseY, mouseX);
 * 
 * // Rotate.
 * rotate(a);
 * 
 * // Draw the shape.
 * rect(0, 0, 60, 10);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A rectangle at the center of the canvas rotates with mouse movements.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the origin to the center.
 * translate(50, 50);
 * 
 * // Get the mouse's coordinates relative to the origin.
 * let x = mouseX - 50;
 * let y = mouseY - 50;
 * 
 * // Calculate the angle between the mouse and the origin.
 * let a = atan2(y, x);
 * 
 * // Rotate.
 * rotate(a);
 * 
 * // Draw the shape.
 * rect(-30, -5, 60, 10);
 * }
 * </code>
 * </div>
 */
function atan2(y: number, x: number): number;

/**
 * Calculates the cosine of an angle.`cos()` is useful for many geometric tasks in creative coding. The values
 * returned oscillate between -1 and 1 as the input angle increases. `cos()`
 * calculates the cosine of an angle, using radians by default, or according
 * to if angleMode() setting (RADIANS or DEGREES).
 *
 * @param the angle, in radians by default, or according to if <a href="/reference/p5/angleMode/">angleMode()</a> setting (RADIANS or DEGREES).
 * @return cosine of the angle.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A white ball on a string oscillates left and right.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the coordinates.
 * let x = 30 * cos(frameCount * 0.05) + 50;
 * let y = 50;
 * 
 * // Draw the oscillator.
 * line(50, y, x, y);
 * circle(x, y, 20);
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
 * describe('A series of black dots form a wave pattern.');
 * }
 * 
 * function draw() {
 * // Calculate the coordinates.
 * let x = frameCount;
 * let y = 30 * cos(x * 0.1) + 50;
 * 
 * // Draw the point.
 * point(x, y);
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
 * describe('A series of black dots form an infinity symbol.');
 * }
 * 
 * function draw() {
 * // Calculate the coordinates.
 * let x = 30 * cos(frameCount * 0.1) + 50;
 * let y = 10 * sin(frameCount * 0.2) + 50;
 * 
 * // Draw the point.
 * point(x, y);
 * }
 * </code>
 * </div>
 */
function cos(angle: number): number;

/**
 * Calculates the sine of an angle.`sin()` is useful for many geometric tasks in creative coding. The values
 * returned oscillate between -1 and 1 as the input angle increases. `sin()`
 * calculates the sine of an angle, using radians by default, or according to
 * if angleMode() setting (RADIANS or DEGREES).
 *
 * @param the angle, in radians by default, or according to if <a href="/reference/p5/angleMode/">angleMode()</a> setting (RADIANS or DEGREES).
 * @return sine of the angle.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A white ball on a string oscillates up and down.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the coordinates.
 * let x = 50;
 * let y = 30 * sin(frameCount * 0.05) + 50;
 * 
 * // Draw the oscillator.
 * line(50, y, x, y);
 * circle(x, y, 20);
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
 * describe('A series of black dots form a wave pattern.');
 * }
 * 
 * function draw() {
 * // Calculate the coordinates.
 * let x = frameCount;
 * let y = 30 * sin(x * 0.1) + 50;
 * 
 * // Draw the point.
 * point(x, y);
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
 * describe('A series of black dots form an infinity symbol.');
 * }
 * 
 * function draw() {
 * // Calculate the coordinates.
 * let x = 30 * cos(frameCount * 0.1) + 50;
 * let y = 10 * sin(frameCount * 0.2) + 50;
 * 
 * // Draw the point.
 * point(x, y);
 * }
 * </code>
 * </div>
 */
function sin(angle: number): number;

/**
 * Calculates the tangent of an angle.`tan()` is useful for many geometric tasks in creative coding. The values
 * returned range from -Infinity to Infinity and repeat periodically as the
 * input angle increases. `tan()` calculates the tan of an angle, using radians
 * by default, or according to
 * if angleMode() setting (RADIANS or DEGREES).
 *
 * @param the angle, in radians by default, or according to if <a href="/reference/p5/angleMode/">angleMode()</a> setting (RADIANS or DEGREES).
 * @return tangent of the angle.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * describe('A series of identical curves drawn with black dots. Each curve starts from the top of the canvas, continues down at a slight angle, flattens out at the middle of the canvas, then continues to the bottom.');
 * }
 * 
 * function draw() {
 * // Calculate the coordinates.
 * let x = frameCount;
 * let y = 5 * tan(x * 0.1) + 50;
 * 
 * // Draw the point.
 * point(x, y);
 * }
 * </code>
 * </div>
 */
function tan(angle: number): number;

/**
 * Converts an angle measured in radians to its value in degrees.Degrees and radians are both units for measuring angles. There are 360˚ in
 * one full rotation. A full rotation is 2 × π (about 6.28) radians.The same angle can be expressed in with either unit. For example, 90° is a
 * quarter of a full rotation. The same angle is 2 × π ÷ 4
 * (about 1.57) radians.
 *
 * @param radians value to convert to degrees.
 * @return converted angle.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Calculate the angle conversion.
 * let rad = QUARTER_PI;
 * let deg = degrees(rad);
 * 
 * // Display the conversion.
 * text(`${round(rad, 2)} rad = ${deg}˚`, 10, 50);
 * 
 * describe('The text "0.79 rad = 45˚".');
 * }
 * </code>
 * </div>
 */
function degrees(radians: number): number;

/**
 * Converts an angle measured in degrees to its value in radians.Degrees and radians are both units for measuring angles. There are 360˚ in
 * one full rotation. A full rotation is 2 × π (about 6.28) radians.The same angle can be expressed in with either unit. For example, 90° is a
 * quarter of a full rotation. The same angle is 2 × π ÷ 4
 * (about 1.57) radians.
 *
 * @param degree value to convert to radians.
 * @return converted angle.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Caclulate the angle conversion.
 * let deg = 45;
 * let rad = radians(deg);
 * 
 * // Display the angle conversion.
 * text(`${deg}˚ = ${round(rad, 3)} rad`, 10, 50);
 * 
 * describe('The text "45˚ = 0.785 rad".');
 * }
 * </code>
 * </div>
 */
function radians(degrees: number): number;

/**
 * Changes the unit system used to measure angles.Degrees and radians are both units for measuring angles. There are 360˚ in
 * one full rotation. A full rotation is 2 × π (about 6.28) radians.Functions such as rotate() and
 * sin() expect angles measured radians by default.
 * Calling `angleMode(DEGREES)` switches to degrees. Calling
 * `angleMode(RADIANS)` switches back to radians.Calling `angleMode()` with no arguments returns current angle mode, which
 * is either `RADIANS` or `DEGREES`.
 *
 * @param either RADIANS or DEGREES.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Rotate 1/8 turn.
 * rotate(QUARTER_PI);
 * 
 * // Draw a line.
 * line(0, 0, 80, 0);
 * 
 * describe('A diagonal line radiating from the top-left corner of a square.');
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
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Rotate 1/8 turn.
 * rotate(45);
 * 
 * // Draw a line.
 * line(0, 0, 80, 0);
 * 
 * describe('A diagonal line radiating from the top-left corner of a square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Calculate the angle to rotate.
 * let angle = TWO_PI / 7;
 * 
 * // Move the origin to the center.
 * translate(50, 50);
 * 
 * // Style the flower.
 * noStroke();
 * fill(255, 50);
 * 
 * // Draw the flower.
 * for (let i = 0; i < 7; i += 1) {
 * ellipse(0, 0, 80, 20);
 * rotate(angle);
 * }
 * 
 * describe('A translucent white flower on a dark background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Calculate the angle to rotate.
 * let angle = 360 / 7;
 * 
 * // Move the origin to the center.
 * translate(50, 50);
 * 
 * // Style the flower.
 * noStroke();
 * fill(255, 50);
 * 
 * // Draw the flower.
 * for (let i = 0; i < 7; i += 1) {
 * ellipse(0, 0, 80, 20);
 * rotate(angle);
 * }
 * 
 * describe('A translucent white flower on a dark background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A white ball on a string oscillates left and right.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the coordinates.
 * let x = 30 * cos(frameCount * 0.05) + 50;
 * let y = 50;
 * 
 * // Draw the oscillator.
 * line(50, y, x, y);
 * circle(x, y, 20);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * describe('A white ball on a string oscillates left and right.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the coordinates.
 * let x = 30 * cos(frameCount * 2.86) + 50;
 * let y = 50;
 * 
 * // Draw the oscillator.
 * line(50, y, x, y);
 * circle(x, y, 20);
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
 * // Draw the upper line.
 * rotate(PI / 6);
 * line(0, 0, 80, 0);
 * 
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Draw the lower line.
 * rotate(30);
 * line(0, 0, 80, 0);
 * 
 * describe('Two diagonal lines radiating from the top-left corner of a square. The lines are oriented 30 degrees from the edges of the square and 30 degrees apart from each other.');
 * }
 * </code>
 * </div>
 */
function angleMode(mode: RADIANS | DEGREES): void;

/**
 * @return mode either RADIANS or DEGREES
 */
function angleMode(): RADIANS | DEGREES;

}

export default function trigonometry(p5: any, fn: any): void;
