// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';

declare module 'p5' {
  class Color {
    constructor(pInst?: p5, vals: number[] | string);

  /**
   * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
   * `print(myColor.toString())`. It's also helpful for using p5.js with other
   * libraries.The parameter, `format`, is optional. If a format string is passed, as in
   * `myColor.toString('#rrggbb')`, it will determine how the color string is
   * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
   * @param
   */
  toString(format: string): string;

  /**
   * Sets the red component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setRed(new_red: any, max: any, red: number): void;

  /**
   * Sets the green component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setGreen(new_green: any, max: any, green: number): void;

  /**
   * Sets the blue component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setBlue(new_blue: any, max: any, blue: number): void;

  /**
   * Sets the alpha (transparency) value of a color.The range depends on the
   * colorMode(). In the default RGB mode it's
   * between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setAlpha(new_alpha: any, max: any, alpha: number): void;

  /**
   * This function extracts the green value from a color object and
   * returns it in the range 0–255 by default. When `colorMode()` is given to an
   * RBG value, the green value within the givin range is returned
 *
   * @param
   */
  _getGreen(max: any): void;

  /**
   * Hue is the same in HSB and HSL, but the maximum value may be different.
   * This function will return the HSB-normalized saturation when supplied with
   * an HSB color object, but will default to the HSL-normalized saturation
   * otherwise.
 *
   * @param
   */
  _getHue(max: any): void;

  /**
   * Saturation is scaled differently in HSB and HSL. This function will return
   * the HSB saturation when supplied with an HSB color object, but will default
   * to the HSL saturation otherwise.
 *
   * @param
   */
  _getSaturation(max: any): void;

  /**
   * Brightness obtains the HSB brightness value from either a p5.Color object,
   * an array of color components, or a CSS color string.Depending on value,
   * when `colorMode()` is set to HSB, this function will return the
   * brightness value in the range. By default, this function will return
   * the HSB brightness within the range 0 - 100.
 *
   * @param
   */
  _getBrightness(max: any): void;

  /**
   * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
   * `print(myColor.toString())`. It's also helpful for using p5.js with other
   * libraries.The parameter, `format`, is optional. If a format string is passed, as in
   * `myColor.toString('#rrggbb')`, it will determine how the color string is
   * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
   * @param
   */
  toString(format: string): string;

  /**
   * Sets the red component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setRed(new_red: any, max: any, red: number): void;

  /**
   * Sets the green component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setGreen(new_green: any, max: any, green: number): void;

  /**
   * Sets the blue component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setBlue(new_blue: any, max: any, blue: number): void;

  /**
   * Sets the alpha (transparency) value of a color.The range depends on the
   * colorMode(). In the default RGB mode it's
   * between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setAlpha(new_alpha: any, max: any, alpha: number): void;

  /**
   * This function extracts the green value from a color object and
   * returns it in the range 0–255 by default. When `colorMode()` is given to an
   * RBG value, the green value within the givin range is returned
 *
   * @param
   */
  _getGreen(max: any): void;

  /**
   * Hue is the same in HSB and HSL, but the maximum value may be different.
   * This function will return the HSB-normalized saturation when supplied with
   * an HSB color object, but will default to the HSL-normalized saturation
   * otherwise.
 *
   * @param
   */
  _getHue(max: any): void;

  /**
   * Saturation is scaled differently in HSB and HSL. This function will return
   * the HSB saturation when supplied with an HSB color object, but will default
   * to the HSL saturation otherwise.
 *
   * @param
   */
  _getSaturation(max: any): void;

  /**
   * Brightness obtains the HSB brightness value from either a p5.Color object,
   * an array of color components, or a CSS color string.Depending on value,
   * when `colorMode()` is set to HSB, this function will return the
   * brightness value in the range. By default, this function will return
   * the HSB brightness within the range 0 - 100.
 *
   * @param
   */
  _getBrightness(max: any): void;

  /**
   * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
   * `print(myColor.toString())`. It's also helpful for using p5.js with other
   * libraries.The parameter, `format`, is optional. If a format string is passed, as in
   * `myColor.toString('#rrggbb')`, it will determine how the color string is
   * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
   * @param
   */
  toString(format: string): string;

  /**
   * Sets the red component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setRed(new_red: any, max: any, red: number): void;

  /**
   * Sets the green component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setGreen(new_green: any, max: any, green: number): void;

  /**
   * Sets the blue component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setBlue(new_blue: any, max: any, blue: number): void;

  /**
   * Sets the alpha (transparency) value of a color.The range depends on the
   * colorMode(). In the default RGB mode it's
   * between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setAlpha(new_alpha: any, max: any, alpha: number): void;

  /**
   * This function extracts the green value from a color object and
   * returns it in the range 0–255 by default. When `colorMode()` is given to an
   * RBG value, the green value within the givin range is returned
 *
   * @param
   */
  _getGreen(max: any): void;

  /**
   * Hue is the same in HSB and HSL, but the maximum value may be different.
   * This function will return the HSB-normalized saturation when supplied with
   * an HSB color object, but will default to the HSL-normalized saturation
   * otherwise.
 *
   * @param
   */
  _getHue(max: any): void;

  /**
   * Saturation is scaled differently in HSB and HSL. This function will return
   * the HSB saturation when supplied with an HSB color object, but will default
   * to the HSL saturation otherwise.
 *
   * @param
   */
  _getSaturation(max: any): void;

  /**
   * Brightness obtains the HSB brightness value from either a p5.Color object,
   * an array of color components, or a CSS color string.Depending on value,
   * when `colorMode()` is set to HSB, this function will return the
   * brightness value in the range. By default, this function will return
   * the HSB brightness within the range 0 - 100.
 *
   * @param
   */
  _getBrightness(max: any): void;

  /**
   * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
   * `print(myColor.toString())`. It's also helpful for using p5.js with other
   * libraries.The parameter, `format`, is optional. If a format string is passed, as in
   * `myColor.toString('#rrggbb')`, it will determine how the color string is
   * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
   * @param
   */
  toString(format: string): string;

  /**
   * Sets the red component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setRed(new_red: any, max: any, red: number): void;

  /**
   * Sets the green component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setGreen(new_green: any, max: any, green: number): void;

  /**
   * Sets the blue component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setBlue(new_blue: any, max: any, blue: number): void;

  /**
   * Sets the alpha (transparency) value of a color.The range depends on the
   * colorMode(). In the default RGB mode it's
   * between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setAlpha(new_alpha: any, max: any, alpha: number): void;

  /**
   * This function extracts the green value from a color object and
   * returns it in the range 0–255 by default. When `colorMode()` is given to an
   * RBG value, the green value within the givin range is returned
 *
   * @param
   */
  _getGreen(max: any): void;

  /**
   * Hue is the same in HSB and HSL, but the maximum value may be different.
   * This function will return the HSB-normalized saturation when supplied with
   * an HSB color object, but will default to the HSL-normalized saturation
   * otherwise.
 *
   * @param
   */
  _getHue(max: any): void;

  /**
   * Saturation is scaled differently in HSB and HSL. This function will return
   * the HSB saturation when supplied with an HSB color object, but will default
   * to the HSL saturation otherwise.
 *
   * @param
   */
  _getSaturation(max: any): void;

  /**
   * Brightness obtains the HSB brightness value from either a p5.Color object,
   * an array of color components, or a CSS color string.Depending on value,
   * when `colorMode()` is set to HSB, this function will return the
   * brightness value in the range. By default, this function will return
   * the HSB brightness within the range 0 - 100.
 *
   * @param
   */
  _getBrightness(max: any): void;

  /**
   * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
   * `print(myColor.toString())`. It's also helpful for using p5.js with other
   * libraries.The parameter, `format`, is optional. If a format string is passed, as in
   * `myColor.toString('#rrggbb')`, it will determine how the color string is
   * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
   * @param
   */
  toString(format: string): string;

  /**
   * Sets the red component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setRed(new_red: any, max: any, red: number): void;

  /**
   * Sets the green component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setGreen(new_green: any, max: any, green: number): void;

  /**
   * Sets the blue component of a color.The range depends on the colorMode(). In the
   * default RGB mode it's between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setBlue(new_blue: any, max: any, blue: number): void;

  /**
   * Sets the alpha (transparency) value of a color.The range depends on the
   * colorMode(). In the default RGB mode it's
   * between 0 and 255.
 *
   * @param
   * @param
   * @param
   */
  setAlpha(new_alpha: any, max: any, alpha: number): void;

  /**
   * This function extracts the green value from a color object and
   * returns it in the range 0–255 by default. When `colorMode()` is given to an
   * RBG value, the green value within the givin range is returned
 *
   * @param
   */
  _getGreen(max: any): void;

  /**
   * Hue is the same in HSB and HSL, but the maximum value may be different.
   * This function will return the HSB-normalized saturation when supplied with
   * an HSB color object, but will default to the HSL-normalized saturation
   * otherwise.
 *
   * @param
   */
  _getHue(max: any): void;

  /**
   * Saturation is scaled differently in HSB and HSL. This function will return
   * the HSB saturation when supplied with an HSB color object, but will default
   * to the HSL saturation otherwise.
 *
   * @param
   */
  _getSaturation(max: any): void;

  /**
   * Brightness obtains the HSB brightness value from either a p5.Color object,
   * an array of color components, or a CSS color string.Depending on value,
   * when `colorMode()` is set to HSB, this function will return the
   * brightness value in the range. By default, this function will return
   * the HSB brightness within the range 0 - 100.
 *
   * @param
   */
  _getBrightness(max: any): void;

  }

/**
 * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
 * `print(myColor.toString())`. It's also helpful for using p5.js with other
 * libraries.The parameter, `format`, is optional. If a format string is passed, as in
 * `myColor.toString('#rrggbb')`, it will determine how the color string is
 * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
 * @param how the color string will be formatted.
 * Leaving this empty formats the string as rgba(r, g, b, a).
 * '#rgb' '#rgba' '#rrggbb' and '#rrggbbaa' format as hexadecimal color codes.
 * 'rgb' 'hsb' and 'hsl' return the color formatted in the specified color mode.
 * 'rgba' 'hsba' and 'hsla' are the same as above but with alpha channels.
 * 'rgb%' 'hsb%' 'hsl%' 'rgba%' 'hsba%' and 'hsla%' format as percentages.
 * @return the formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let myColor = color('darkorchid');
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the text.
 * text(myColor.toString('#rrggbb'), 50, 50);
 * 
 * describe('The text "#9932cc" written in purple on a gray background.');
 * }
 * </code>
 * </div>
 */
function toString(format?: string): string;

/**
 * Sets the red component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new red value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the red value.
 * c.setRed(64);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is teal.');
 * }
 * </code>
 * </div>
 */
function setRed(new_red: any, max: any, red: number): void;

/**
 * Sets the green component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new green value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the green value.
 * c.setGreen(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is yellow.');
 * }
 * </code>
 * </div>
 */
function setGreen(new_green: any, max: any, green: number): void;

/**
 * Sets the blue component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new blue value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the blue value.
 * c.setBlue(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is pale fuchsia.');
 * }
 * </code>
 * </div>
 * *
 */
function setBlue(new_blue: any, max: any, blue: number): void;

/**
 * Sets the alpha (transparency) value of a color.The range depends on the
 * colorMode(). In the default RGB mode it's
 * between 0 and 255.
 *
 * @param the new alpha value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the alpha value.
 * c.setAlpha(128);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is faded pink.');
 * }
 * </code>
 * </div>
 */
function setAlpha(new_alpha: any, max: any, alpha: number): void;

/**
 * This function extracts the green value from a color object and
 * returns it in the range 0–255 by default. When `colorMode()` is given to an
 * RBG value, the green value within the givin range is returned
 *
 */
function _getGreen(max: any): void;

/**
 * Hue is the same in HSB and HSL, but the maximum value may be different.
 * This function will return the HSB-normalized saturation when supplied with
 * an HSB color object, but will default to the HSL-normalized saturation
 * otherwise.
 *
 */
function _getHue(max: any): void;

/**
 * Saturation is scaled differently in HSB and HSL. This function will return
 * the HSB saturation when supplied with an HSB color object, but will default
 * to the HSL saturation otherwise.
 *
 */
function _getSaturation(max: any): void;

/**
 * Brightness obtains the HSB brightness value from either a p5.Color object,
 * an array of color components, or a CSS color string.Depending on value,
 * when `colorMode()` is set to HSB, this function will return the
 * brightness value in the range. By default, this function will return
 * the HSB brightness within the range 0 - 100.
 *
 */
function _getBrightness(max: any): void;

/**
 * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
 * `print(myColor.toString())`. It's also helpful for using p5.js with other
 * libraries.The parameter, `format`, is optional. If a format string is passed, as in
 * `myColor.toString('#rrggbb')`, it will determine how the color string is
 * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
 * @param how the color string will be formatted.
 * Leaving this empty formats the string as rgba(r, g, b, a).
 * '#rgb' '#rgba' '#rrggbb' and '#rrggbbaa' format as hexadecimal color codes.
 * 'rgb' 'hsb' and 'hsl' return the color formatted in the specified color mode.
 * 'rgba' 'hsba' and 'hsla' are the same as above but with alpha channels.
 * 'rgb%' 'hsb%' 'hsl%' 'rgba%' 'hsba%' and 'hsla%' format as percentages.
 * @return the formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let myColor = color('darkorchid');
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the text.
 * text(myColor.toString('#rrggbb'), 50, 50);
 * 
 * describe('The text "#9932cc" written in purple on a gray background.');
 * }
 * </code>
 * </div>
 */
function toString(format?: string): string;

/**
 * Sets the red component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new red value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the red value.
 * c.setRed(64);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is teal.');
 * }
 * </code>
 * </div>
 */
function setRed(new_red: any, max: any, red: number): void;

/**
 * Sets the green component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new green value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the green value.
 * c.setGreen(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is yellow.');
 * }
 * </code>
 * </div>
 */
function setGreen(new_green: any, max: any, green: number): void;

/**
 * Sets the blue component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new blue value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the blue value.
 * c.setBlue(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is pale fuchsia.');
 * }
 * </code>
 * </div>
 * *
 */
function setBlue(new_blue: any, max: any, blue: number): void;

/**
 * Sets the alpha (transparency) value of a color.The range depends on the
 * colorMode(). In the default RGB mode it's
 * between 0 and 255.
 *
 * @param the new alpha value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the alpha value.
 * c.setAlpha(128);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is faded pink.');
 * }
 * </code>
 * </div>
 */
function setAlpha(new_alpha: any, max: any, alpha: number): void;

/**
 * This function extracts the green value from a color object and
 * returns it in the range 0–255 by default. When `colorMode()` is given to an
 * RBG value, the green value within the givin range is returned
 *
 */
function _getGreen(max: any): void;

/**
 * Hue is the same in HSB and HSL, but the maximum value may be different.
 * This function will return the HSB-normalized saturation when supplied with
 * an HSB color object, but will default to the HSL-normalized saturation
 * otherwise.
 *
 */
function _getHue(max: any): void;

/**
 * Saturation is scaled differently in HSB and HSL. This function will return
 * the HSB saturation when supplied with an HSB color object, but will default
 * to the HSL saturation otherwise.
 *
 */
function _getSaturation(max: any): void;

/**
 * Brightness obtains the HSB brightness value from either a p5.Color object,
 * an array of color components, or a CSS color string.Depending on value,
 * when `colorMode()` is set to HSB, this function will return the
 * brightness value in the range. By default, this function will return
 * the HSB brightness within the range 0 - 100.
 *
 */
function _getBrightness(max: any): void;

/**
 * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
 * `print(myColor.toString())`. It's also helpful for using p5.js with other
 * libraries.The parameter, `format`, is optional. If a format string is passed, as in
 * `myColor.toString('#rrggbb')`, it will determine how the color string is
 * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
 * @param how the color string will be formatted.
 * Leaving this empty formats the string as rgba(r, g, b, a).
 * '#rgb' '#rgba' '#rrggbb' and '#rrggbbaa' format as hexadecimal color codes.
 * 'rgb' 'hsb' and 'hsl' return the color formatted in the specified color mode.
 * 'rgba' 'hsba' and 'hsla' are the same as above but with alpha channels.
 * 'rgb%' 'hsb%' 'hsl%' 'rgba%' 'hsba%' and 'hsla%' format as percentages.
 * @return the formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let myColor = color('darkorchid');
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the text.
 * text(myColor.toString('#rrggbb'), 50, 50);
 * 
 * describe('The text "#9932cc" written in purple on a gray background.');
 * }
 * </code>
 * </div>
 */
function toString(format?: string): string;

/**
 * Sets the red component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new red value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the red value.
 * c.setRed(64);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is teal.');
 * }
 * </code>
 * </div>
 */
function setRed(new_red: any, max: any, red: number): void;

/**
 * Sets the green component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new green value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the green value.
 * c.setGreen(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is yellow.');
 * }
 * </code>
 * </div>
 */
function setGreen(new_green: any, max: any, green: number): void;

/**
 * Sets the blue component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new blue value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the blue value.
 * c.setBlue(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is pale fuchsia.');
 * }
 * </code>
 * </div>
 * *
 */
function setBlue(new_blue: any, max: any, blue: number): void;

/**
 * Sets the alpha (transparency) value of a color.The range depends on the
 * colorMode(). In the default RGB mode it's
 * between 0 and 255.
 *
 * @param the new alpha value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the alpha value.
 * c.setAlpha(128);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is faded pink.');
 * }
 * </code>
 * </div>
 */
function setAlpha(new_alpha: any, max: any, alpha: number): void;

/**
 * This function extracts the green value from a color object and
 * returns it in the range 0–255 by default. When `colorMode()` is given to an
 * RBG value, the green value within the givin range is returned
 *
 */
function _getGreen(max: any): void;

/**
 * Hue is the same in HSB and HSL, but the maximum value may be different.
 * This function will return the HSB-normalized saturation when supplied with
 * an HSB color object, but will default to the HSL-normalized saturation
 * otherwise.
 *
 */
function _getHue(max: any): void;

/**
 * Saturation is scaled differently in HSB and HSL. This function will return
 * the HSB saturation when supplied with an HSB color object, but will default
 * to the HSL saturation otherwise.
 *
 */
function _getSaturation(max: any): void;

/**
 * Brightness obtains the HSB brightness value from either a p5.Color object,
 * an array of color components, or a CSS color string.Depending on value,
 * when `colorMode()` is set to HSB, this function will return the
 * brightness value in the range. By default, this function will return
 * the HSB brightness within the range 0 - 100.
 *
 */
function _getBrightness(max: any): void;

/**
 * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
 * `print(myColor.toString())`. It's also helpful for using p5.js with other
 * libraries.The parameter, `format`, is optional. If a format string is passed, as in
 * `myColor.toString('#rrggbb')`, it will determine how the color string is
 * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
 * @param how the color string will be formatted.
 * Leaving this empty formats the string as rgba(r, g, b, a).
 * '#rgb' '#rgba' '#rrggbb' and '#rrggbbaa' format as hexadecimal color codes.
 * 'rgb' 'hsb' and 'hsl' return the color formatted in the specified color mode.
 * 'rgba' 'hsba' and 'hsla' are the same as above but with alpha channels.
 * 'rgb%' 'hsb%' 'hsl%' 'rgba%' 'hsba%' and 'hsla%' format as percentages.
 * @return the formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let myColor = color('darkorchid');
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the text.
 * text(myColor.toString('#rrggbb'), 50, 50);
 * 
 * describe('The text "#9932cc" written in purple on a gray background.');
 * }
 * </code>
 * </div>
 */
function toString(format?: string): string;

/**
 * Sets the red component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new red value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the red value.
 * c.setRed(64);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is teal.');
 * }
 * </code>
 * </div>
 */
function setRed(new_red: any, max: any, red: number): void;

/**
 * Sets the green component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new green value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the green value.
 * c.setGreen(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is yellow.');
 * }
 * </code>
 * </div>
 */
function setGreen(new_green: any, max: any, green: number): void;

/**
 * Sets the blue component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new blue value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the blue value.
 * c.setBlue(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is pale fuchsia.');
 * }
 * </code>
 * </div>
 * *
 */
function setBlue(new_blue: any, max: any, blue: number): void;

/**
 * Sets the alpha (transparency) value of a color.The range depends on the
 * colorMode(). In the default RGB mode it's
 * between 0 and 255.
 *
 * @param the new alpha value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the alpha value.
 * c.setAlpha(128);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is faded pink.');
 * }
 * </code>
 * </div>
 */
function setAlpha(new_alpha: any, max: any, alpha: number): void;

/**
 * This function extracts the green value from a color object and
 * returns it in the range 0–255 by default. When `colorMode()` is given to an
 * RBG value, the green value within the givin range is returned
 *
 */
function _getGreen(max: any): void;

/**
 * Hue is the same in HSB and HSL, but the maximum value may be different.
 * This function will return the HSB-normalized saturation when supplied with
 * an HSB color object, but will default to the HSL-normalized saturation
 * otherwise.
 *
 */
function _getHue(max: any): void;

/**
 * Saturation is scaled differently in HSB and HSL. This function will return
 * the HSB saturation when supplied with an HSB color object, but will default
 * to the HSL saturation otherwise.
 *
 */
function _getSaturation(max: any): void;

/**
 * Brightness obtains the HSB brightness value from either a p5.Color object,
 * an array of color components, or a CSS color string.Depending on value,
 * when `colorMode()` is set to HSB, this function will return the
 * brightness value in the range. By default, this function will return
 * the HSB brightness within the range 0 - 100.
 *
 */
function _getBrightness(max: any): void;

/**
 * Returns the color formatted as a `String`.Calling `myColor.toString()` can be useful for debugging, as in
 * `print(myColor.toString())`. It's also helpful for using p5.js with other
 * libraries.The parameter, `format`, is optional. If a format string is passed, as in
 * `myColor.toString('#rrggbb')`, it will determine how the color string is
 * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
 *
 * @param how the color string will be formatted.
 * Leaving this empty formats the string as rgba(r, g, b, a).
 * '#rgb' '#rgba' '#rrggbb' and '#rrggbbaa' format as hexadecimal color codes.
 * 'rgb' 'hsb' and 'hsl' return the color formatted in the specified color mode.
 * 'rgba' 'hsba' and 'hsla' are the same as above but with alpha channels.
 * 'rgb%' 'hsb%' 'hsl%' 'rgba%' 'hsba%' and 'hsla%' format as percentages.
 * @return the formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let myColor = color('darkorchid');
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the text.
 * text(myColor.toString('#rrggbb'), 50, 50);
 * 
 * describe('The text "#9932cc" written in purple on a gray background.');
 * }
 * </code>
 * </div>
 */
function toString(format?: string): string;

/**
 * Sets the red component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new red value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the red value.
 * c.setRed(64);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is teal.');
 * }
 * </code>
 * </div>
 */
function setRed(new_red: any, max: any, red: number): void;

/**
 * Sets the green component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new green value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the green value.
 * c.setGreen(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is yellow.');
 * }
 * </code>
 * </div>
 */
function setGreen(new_green: any, max: any, green: number): void;

/**
 * Sets the blue component of a color.The range depends on the colorMode(). In the
 * default RGB mode it's between 0 and 255.
 *
 * @param the new blue value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the blue value.
 * c.setBlue(255);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is pale fuchsia.');
 * }
 * </code>
 * </div>
 * *
 */
function setBlue(new_blue: any, max: any, blue: number): void;

/**
 * Sets the alpha (transparency) value of a color.The range depends on the
 * colorMode(). In the default RGB mode it's
 * between 0 and 255.
 *
 * @param the new alpha value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object.
 * let c = color(255, 128, 128);
 * 
 * // Draw the left rectangle.
 * noStroke();
 * fill(c);
 * rect(15, 20, 35, 60);
 * 
 * // Change the alpha value.
 * c.setAlpha(128);
 * 
 * // Draw the right rectangle.
 * fill(c);
 * rect(50, 20, 35, 60);
 * 
 * describe('Two rectangles. The left one is salmon pink and the right one is faded pink.');
 * }
 * </code>
 * </div>
 */
function setAlpha(new_alpha: any, max: any, alpha: number): void;

/**
 * This function extracts the green value from a color object and
 * returns it in the range 0–255 by default. When `colorMode()` is given to an
 * RBG value, the green value within the givin range is returned
 *
 */
function _getGreen(max: any): void;

/**
 * Hue is the same in HSB and HSL, but the maximum value may be different.
 * This function will return the HSB-normalized saturation when supplied with
 * an HSB color object, but will default to the HSL-normalized saturation
 * otherwise.
 *
 */
function _getHue(max: any): void;

/**
 * Saturation is scaled differently in HSB and HSL. This function will return
 * the HSB saturation when supplied with an HSB color object, but will default
 * to the HSL saturation otherwise.
 *
 */
function _getSaturation(max: any): void;

/**
 * Brightness obtains the HSB brightness value from either a p5.Color object,
 * an array of color components, or a CSS color string.Depending on value,
 * when `colorMode()` is set to HSB, this function will return the
 * brightness value in the range. By default, this function will return
 * the HSB brightness within the range 0 - 100.
 *
 */
function _getBrightness(max: any): void;

}

export default function p5_Color(p5: any, fn: any): void;
