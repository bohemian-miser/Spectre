// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';

declare module 'p5' {
  type RGB = 'rgb';

  type RGBHDR = 'rgbhdr';

  /**
   * HSB (hue, saturation, brightness) is a type of color model.
You can learn more about it at
HSB.
   */
  type HSB = 'hsb';

  type HSL = 'hsl';

  type HWB = 'hwb';

  type LAB = 'lab';

  type LCH = 'lch';

  type OKLAB = 'oklab';

  type OKLCH = 'oklch';

  type RGBA = 'rgba';

/**
 * Creates a p5.Color object.By default, the parameters are interpreted as RGB values. Calling
 * `color(255, 204, 0)` will return a bright yellow color. The way these
 * parameters are interpreted may be changed with the
 * colorMode() function.The version of `color()` with one parameter interprets the value one of two
 * ways. If the parameter is a number, it's interpreted as a grayscale value.
 * If the parameter is a string, it's interpreted as a CSS color string.The version of `color()` with two parameters interprets the first one as a
 * grayscale value. The second parameter sets the alpha (transparency) value.The version of `color()` with three parameters interprets them as RGB, HSB,
 * or HSL colors, depending on the current `colorMode()`.The version of `color()` with four parameters interprets them as RGBA, HSBA,
 * or HSLA colors, depending on the current `colorMode()`. The last parameter
 * sets the alpha (transparency) value.
 *
 * @param number specifying value between white and black.
 * @param alpha value relative to current color range
 * (default is 0-255).
 * @return resulting color.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object using RGB values.
 * let c = color(255, 204, 0);
 * 
 * // Draw the square.
 * fill(c);
 * noStroke();
 * square(30, 20, 55);
 * 
 * describe('A yellow square on a gray canvas.');
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
 * // Create a p5.Color object using RGB values.
 * let c1 = color(255, 204, 0);
 * 
 * // Draw the left circle.
 * fill(c1);
 * noStroke();
 * circle(25, 25, 80);
 * 
 * // Create a p5.Color object using a grayscale value.
 * let c2 = color(65);
 * 
 * // Draw the right circle.
 * fill(c2);
 * circle(75, 75, 80);
 * 
 * describe(
 * 'Two circles on a gray canvas. The circle in the top-left corner is yellow and the one at the bottom-right is gray.'
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
 * // Create a p5.Color object using a named color.
 * let c = color('magenta');
 * 
 * // Draw the square.
 * fill(c);
 * noStroke();
 * square(20, 20, 60);
 * 
 * describe('A magenta square on a gray canvas.');
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
 * // Create a p5.Color object using a hex color code.
 * let c1 = color('#0f0');
 * 
 * // Draw the left rectangle.
 * fill(c1);
 * noStroke();
 * rect(0, 10, 45, 80);
 * 
 * // Create a p5.Color object using a hex color code.
 * let c2 = color('#00ff00');
 * 
 * // Draw the right rectangle.
 * fill(c2);
 * rect(55, 10, 45, 80);
 * 
 * describe('Two bright green rectangles on a gray canvas.');
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
 * // Create a p5.Color object using a RGB color string.
 * let c1 = color('rgb(0, 0, 255)');
 * 
 * // Draw the top-left square.
 * fill(c1);
 * square(10, 10, 35);
 * 
 * // Create a p5.Color object using a RGB color string.
 * let c2 = color('rgb(0%, 0%, 100%)');
 * 
 * // Draw the top-right square.
 * fill(c2);
 * square(55, 10, 35);
 * 
 * // Create a p5.Color object using a RGBA color string.
 * let c3 = color('rgba(0, 0, 255, 1)');
 * 
 * // Draw the bottom-left square.
 * fill(c3);
 * square(10, 55, 35);
 * 
 * // Create a p5.Color object using a RGBA color string.
 * let c4 = color('rgba(0%, 0%, 100%, 1)');
 * 
 * // Draw the bottom-right square.
 * fill(c4);
 * square(55, 55, 35);
 * 
 * describe('Four blue squares in the corners of a gray canvas.');
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
 * // Create a p5.Color object using a HSL color string.
 * let c1 = color('hsl(160, 100%, 50%)');
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c1);
 * rect(0, 10, 45, 80);
 * 
 * // Create a p5.Color object using a HSLA color string.
 * let c2 = color('hsla(160, 100%, 50%, 0.5)');
 * 
 * // Draw the right rectangle.
 * fill(c2);
 * rect(55, 10, 45, 80);
 * 
 * describe('Two sea green rectangles. A darker rectangle on the left and a brighter one on the right.');
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
 * // Create a p5.Color object using a HSB color string.
 * let c1 = color('hsb(160, 100%, 50%)');
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c1);
 * rect(0, 10, 45, 80);
 * 
 * // Create a p5.Color object using a HSBA color string.
 * let c2 = color('hsba(160, 100%, 50%, 0.5)');
 * 
 * // Draw the right rectangle.
 * fill(c2);
 * rect(55, 10, 45, 80);
 * 
 * describe('Two green rectangles. A darker rectangle on the left and a brighter one on the right.');
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
 * // Create a p5.Color object using RGB values.
 * let c1 = color(50, 55, 100);
 * 
 * // Draw the left rectangle.
 * fill(c1);
 * rect(0, 10, 45, 80);
 * 
 * // Switch the color mode to HSB.
 * colorMode(HSB, 100);
 * 
 * // Create a p5.Color object using HSB values.
 * let c2 = color(50, 55, 100);
 * 
 * // Draw the right rectangle.
 * fill(c2);
 * rect(55, 10, 45, 80);
 * 
 * describe('Two blue rectangles. A darker rectangle on the left and a brighter one on the right.');
 * }
 * </code>
 * </div>
 */
function color(gray: number, alpha?: number): p5.Color;

/**
 * @param red or hue value relative to
 * the current color range.
 * @param green or saturation value
 * relative to the current color range.
 * @param blue or brightness value
 * relative to the current color range.
 */
function color(v1: number, v2: number, v3: number, alpha?: number): p5.Color;

/**
 * @param a color string.
 */
function color(value: string): p5.Color;

/**
 * @param an array containing the red, green, blue,
 * and alpha components of the color.
 */
function color(values: number[]): p5.Color;

/**
 */
function color(color: p5.Color): p5.Color;

/**
 * Gets the red value of a color.`red()` extracts the red value from a
 * p5.Color object, an array of color components, or
 * a CSS color string.By default, `red()` returns a color's red value in the range 0
 * to 255. If the colorMode() is set to RGB, it
 * returns the red value in the given range.
 *
 * @param <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
 * color components, or CSS color string.
 * @return the red value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(175, 100, 220);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'redValue' to 175.
 * let redValue = red(c);
 * 
 * // Draw the right rectangle.
 * fill(redValue, 0, 0);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is red.');
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
 * // Create a color array.
 * let c = [175, 100, 220];
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'redValue' to 175.
 * let redValue = red(c);
 * 
 * // Draw the right rectangle.
 * fill(redValue, 0, 0);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is red.');
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
 * // Create a CSS color string.
 * let c = 'rgb(175, 100, 220)';
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'redValue' to 175.
 * let redValue = red(c);
 * 
 * // Draw the right rectangle.
 * fill(redValue, 0, 0);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is red.');
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
 * // Use RGB color with values in the range 0-100.
 * colorMode(RGB, 100);
 * 
 * // Create a p5.Color object.
 * let c = color(69, 39, 86);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'redValue' to 69.
 * let redValue = red(c);
 * 
 * // Draw the right rectangle.
 * fill(redValue, 0, 0);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is red.');
 * }
 * </code>
 * </div>
 */
function red(color: p5.Color | number[] | string): number;

/**
 * Gets the green value of a color.`green()` extracts the green value from a
 * p5.Color object, an array of color components, or
 * a CSS color string.By default, `green()` returns a color's green value in the range 0
 * to 255. If the colorMode() is set to RGB, it
 * returns the green value in the given range.
 *
 * @param <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
 * color components, or CSS color string.
 * @return the green value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(175, 100, 220);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'greenValue' to 100.
 * let greenValue = green(c);
 * 
 * // Draw the right rectangle.
 * fill(0, greenValue, 0);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is dark green.');
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
 * // Create a color array.
 * let c = [175, 100, 220];
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'greenValue' to 100.
 * let greenValue = green(c);
 * 
 * // Draw the right rectangle.
 * fill(0, greenValue, 0);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is dark green.');
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
 * // Create a CSS color string.
 * let c = 'rgb(175, 100, 220)';
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'greenValue' to 100.
 * let greenValue = green(c);
 * 
 * // Draw the right rectangle.
 * fill(0, greenValue, 0);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is dark green.');
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
 * // Use RGB color with values in the range 0-100.
 * colorMode(RGB, 100);
 * 
 * // Create a p5.Color object using RGB values.
 * let c = color(69, 39, 86);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'greenValue' to 39.
 * let greenValue = green(c);
 * 
 * // Draw the right rectangle.
 * fill(0, greenValue, 0);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is dark green.');
 * }
 * </code>
 * </div>
 */
function green(color: p5.Color | number[] | string): number;

/**
 * Gets the blue value of a color.`blue()` extracts the blue value from a
 * p5.Color object, an array of color components, or
 * a CSS color string.By default, `blue()` returns a color's blue value in the range 0
 * to 255. If the colorMode() is set to RGB, it
 * returns the blue value in the given range.
 *
 * @param <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
 * color components, or CSS color string.
 * @return the blue value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object using RGB values.
 * let c = color(175, 100, 220);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'blueValue' to 220.
 * let blueValue = blue(c);
 * 
 * // Draw the right rectangle.
 * fill(0, 0, blueValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is royal blue.');
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
 * // Create a color array.
 * let c = [175, 100, 220];
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'blueValue' to 220.
 * let blueValue = blue(c);
 * 
 * // Draw the right rectangle.
 * fill(0, 0, blueValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is royal blue.');
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
 * // Create a CSS color string.
 * let c = 'rgb(175, 100, 220)';
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'blueValue' to 220.
 * let blueValue = blue(c);
 * 
 * // Draw the right rectangle.
 * fill(0, 0, blueValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is royal blue.');
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
 * // Use RGB color with values in the range 0-100.
 * colorMode(RGB, 100);
 * 
 * // Create a p5.Color object using RGB values.
 * let c = color(69, 39, 86);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'blueValue' to 86.
 * let blueValue = blue(c);
 * 
 * // Draw the right rectangle.
 * fill(0, 0, blueValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light purple and the right one is royal blue.');
 * }
 * </code>
 * </div>
 */
function blue(color: p5.Color | number[] | string): number;

/**
 * Gets the alpha (transparency) value of a color.`alpha()` extracts the alpha value from a
 * p5.Color object, an array of color components, or
 * a CSS color string.
 *
 * @param <a href="#/p5.Color">p5.Color</a> object, array of
 * color components, or CSS color string.
 * @return the alpha value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(0, 126, 255, 102);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'alphaValue' to 102.
 * let alphaValue = alpha(c);
 * 
 * // Draw the right rectangle.
 * fill(alphaValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light blue and the right one is charcoal gray.');
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
 * // Create a color array.
 * let c = [0, 126, 255, 102];
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'alphaValue' to 102.
 * let alphaValue = alpha(c);
 * 
 * // Draw the left rectangle.
 * fill(alphaValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light blue and the right one is charcoal gray.');
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
 * // Create a CSS color string.
 * let c = 'rgba(0, 126, 255, 0.4)';
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'alphaValue' to 102.
 * let alphaValue = alpha(c);
 * 
 * // Draw the right rectangle.
 * fill(alphaValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is light blue and the right one is charcoal gray.');
 * }
 * </code>
 * </div>
 */
function alpha(color: p5.Color | number[] | string): number;

/**
 * Gets the hue value of a color.`hue()` extracts the hue value from a
 * p5.Color object, an array of color components, or
 * a CSS color string.Hue describes a color's position on the color wheel. By default, `hue()`
 * returns a color's HSL hue in the range 0 to 360. If the
 * colorMode() is set to HSB or HSL, it returns the hue
 * value in the given mode.
 *
 * @param <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
 * color components, or CSS color string.
 * @return the hue value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Use HSL color.
 * colorMode(HSL);
 * 
 * // Create a p5.Color object.
 * let c = color(0, 50, 100);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Set 'hueValue' to 0.
 * let hueValue = hue(c);
 * 
 * // Draw the right rectangle.
 * fill(hueValue);
 * rect(50, 20, 35, 60);
 * 
 * describe(
 * 'Two rectangles. The rectangle on the left is salmon pink and the one on the right is black.'
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
 * // Use HSL color.
 * colorMode(HSL);
 * 
 * // Create a color array.
 * let c = [0, 50, 100];
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Set 'hueValue' to 0.
 * let hueValue = hue(c);
 * 
 * // Draw the right rectangle.
 * fill(hueValue);
 * rect(50, 20, 35, 60);
 * 
 * describe(
 * 'Two rectangles. The rectangle on the left is salmon pink and the one on the right is black.'
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
 * // Use HSL color.
 * colorMode(HSL);
 * 
 * // Create a CSS color string.
 * let c = 'rgb(255, 128, 128)';
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Set 'hueValue' to 0.
 * let hueValue = hue(c);
 * 
 * // Draw the right rectangle.
 * fill(hueValue);
 * rect(50, 20, 35, 60);
 * 
 * describe(
 * 'Two rectangles. The rectangle on the left is salmon pink and the one on the right is black.'
 * );
 * }
 * </code>
 * </div>
 */
function hue(color: p5.Color | number[] | string): number;

/**
 * Gets the saturation value of a color.`saturation()` extracts the saturation value from a
 * p5.Color object, an array of color components, or
 * a CSS color string.Saturation is scaled differently in HSB and HSL. By default, `saturation()`
 * returns a color's HSL saturation in the range 0 to 100. If the
 * colorMode() is set to HSB or HSL, it returns the
 * saturation value in the given mode.
 *
 * @param <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
 * color components, or CSS color string.
 * @return the saturation value
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSB color.
 * colorMode(HSB);
 * 
 * // Create a p5.Color object.
 * let c = color(0, 50, 100);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'satValue' to 50.
 * let satValue = saturation(c);
 * 
 * // Draw the right rectangle.
 * fill(satValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is dark gray.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSB color.
 * colorMode(HSB);
 * 
 * // Create a color array.
 * let c = [0, 50, 100];
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'satValue' to 100.
 * let satValue = saturation(c);
 * 
 * // Draw the right rectangle.
 * fill(satValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is gray.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSB color.
 * colorMode(HSB);
 * 
 * // Create a CSS color string.
 * let c = 'rgb(255, 128, 128)';
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'satValue' to 100.
 * let satValue = saturation(c);
 * 
 * // Draw the right rectangle.
 * fill(satValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is gray.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSL color.
 * colorMode(HSL);
 * 
 * // Create a p5.Color object.
 * let c = color(0, 100, 75);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'satValue' to 100.
 * let satValue = saturation(c);
 * 
 * // Draw the right rectangle.
 * fill(satValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is white.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSL color with values in the range 0-255.
 * colorMode(HSL, 255);
 * 
 * // Create a p5.Color object.
 * let c = color(0, 255, 191.5);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'satValue' to 255.
 * let satValue = saturation(c);
 * 
 * // Draw the right rectangle.
 * fill(satValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is white.');
 * }
 * </code>
 * </div>
 */
function saturation(color: p5.Color | number[] | string): number;

/**
 * Gets the brightness value of a color.`brightness()` extracts the HSB brightness value from a
 * p5.Color object, an array of color components, or
 * a CSS color string.By default, `brightness()` returns a color's HSB brightness in the range 0
 * to 100. If the colorMode() is set to HSB, it
 * returns the brightness value in the given range.
 *
 * @param <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
 * color components, or CSS color string.
 * @return the brightness value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Use HSB color.
 * colorMode(HSB);
 * 
 * // Create a p5.Color object.
 * let c = color(0, 50, 100);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'brightValue' to 100.
 * let brightValue = brightness(c);
 * 
 * // Draw the right rectangle.
 * fill(brightValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is white.');
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
 * // Use HSB color.
 * colorMode(HSB);
 * 
 * // Create a color array.
 * let c = [0, 50, 100];
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'brightValue' to 100.
 * let brightValue = brightness(c);
 * 
 * // Draw the right rectangle.
 * fill(brightValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is white.');
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
 * // Use HSB color.
 * colorMode(HSB);
 * 
 * // Create a CSS color string.
 * let c = 'rgb(255, 128, 128)';
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'brightValue' to 100.
 * let brightValue = brightness(c);
 * 
 * // Draw the right rectangle.
 * fill(brightValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is white.');
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
 * // Use HSB color with values in the range 0-255.
 * colorMode(HSB, 255);
 * 
 * // Create a p5.Color object.
 * let c = color(0, 127, 255);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'brightValue' to 255.
 * let brightValue = brightness(c);
 * 
 * // Draw the right rectangle.
 * fill(brightValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is white.');
 * }
 * </code>
 * </div>
 */
function brightness(color: p5.Color | number[] | string): number;

/**
 * Gets the lightness value of a color.`lightness()` extracts the HSL lightness value from a
 * p5.Color object, an array of color components, or
 * a CSS color string.By default, `lightness()` returns a color's HSL lightness in the range 0
 * to 100. If the colorMode() is set to HSL, it
 * returns the lightness value in the given range.
 *
 * @param <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
 * color components, or CSS color string.
 * @return the lightness value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSL color.
 * colorMode(HSL);
 * 
 * // Create a p5.Color object using HSL values.
 * let c = color(0, 100, 75);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'lightValue' to 75.
 * let lightValue = lightness(c);
 * 
 * // Draw the right rectangle.
 * fill(lightValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is gray.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSL color.
 * colorMode(HSL);
 * 
 * // Create a color array.
 * let c = [0, 100, 75];
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'lightValue' to 75.
 * let lightValue = lightness(c);
 * 
 * // Draw the right rectangle.
 * fill(lightValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is gray.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSL color.
 * colorMode(HSL);
 * 
 * // Create a CSS color string.
 * let c = 'rgb(255, 128, 128)';
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'lightValue' to 75.
 * let lightValue = lightness(c);
 * 
 * // Draw the right rectangle.
 * fill(lightValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is gray.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Use HSL color with values in the range 0-255.
 * colorMode(HSL, 255);
 * 
 * // Create a p5.Color object using HSL values.
 * let c = color(0, 255, 191.5);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 15, 35, 70);
 * 
 * // Set 'lightValue' to 191.5.
 * let lightValue = lightness(c);
 * 
 * // Draw the right rectangle.
 * fill(lightValue);
 * rect(50, 15, 35, 70);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is gray.');
 * }
 * </code>
 * </div>
 */
function lightness(color: p5.Color | number[] | string): number;

/**
 * Blends two colors to find a third color between them.The `amt` parameter specifies the amount to interpolate between the two
 * values. 0 is equal to the first color, 0.1 is very near the first color,
 * 0.5 is halfway between the two colors, and so on. Negative numbers are set
 * to 0. Numbers greater than 1 are set to 1. This differs from the behavior of
 * lerp. It's necessary because numbers outside of the
 * interval [0, 1] will produce strange and unexpected colors.The way that colors are interpolated depends on the current
 * colorMode().
 *
 * @param interpolate from this color.
 * @param interpolate to this color.
 * @param number between 0 and 1.
 * @return interpolated color.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create p5.Color objects to interpolate between.
 * let from = color(218, 165, 32);
 * let to = color(72, 61, 139);
 * 
 * // Create intermediate colors.
 * let interA = lerpColor(from, to, 0.33);
 * let interB = lerpColor(from, to, 0.66);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(from);
 * rect(10, 20, 20, 60);
 * 
 * // Draw the left-center rectangle.
 * fill(interA);
 * rect(30, 20, 20, 60);
 * 
 * // Draw the right-center rectangle.
 * fill(interB);
 * rect(50, 20, 20, 60);
 * 
 * // Draw the right rectangle.
 * fill(to);
 * rect(70, 20, 20, 60);
 * 
 * describe(
 * 'Four rectangles. From left to right, the rectangles are tan, brown, brownish purple, and purple.'
 * );
 * }
 * </code>
 * </div>
 */
function lerpColor(c1: p5.Color, c2: p5.Color, amt: number): p5.Color;

/**
 * Blends multiple colors to find a color between them.The `amt` parameter specifies the amount to interpolate between the color
 * stops which are colors at each `amt` value "location" with `amt` values
 * that are between 2 color stops interpolating between them based on its relative
 * distance to both.The way that colors are interpolated depends on the current
 * colorMode().
 *
 * @param color stops to interpolate from
 * @param number to use to interpolate relative to color stops
 * @return interpolated color.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(400, 400);
 * }
 * 
 * function draw() {
 * // The background goes from white to red to green to blue fill
 * background(paletteLerp([
 * ['white', 0],
 * ['red', 0.05],
 * ['green', 0.25],
 * ['blue', 1]
 * ], millis() / 10000 % 1));
 * }
 * </code>
 * </div>
 */
function paletteLerp(colors_stops: [p5.Color | string | number | number[], number][], amt: number): p5.Color;

}

export default function creating_reading(p5: any, fn: any): void;
