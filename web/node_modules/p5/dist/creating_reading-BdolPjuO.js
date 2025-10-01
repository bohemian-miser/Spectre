import { sRGB, P3, HSL as HSL$1, HWB as HWB$1, Lab, LCH as LCH$1, OKLab, OKLCH as OKLCH$1, ColorSpace, to, parse, range, serialize } from 'colorjs.io/fn';
import HSBSpace from './color/color_spaces/hsb.js';

/**
 * @module Color
 * @submodule Creating & Reading
 * @for p5
 * @requires core
 * @requires color_conversion
 */


const map = (n, start1, stop1, start2, stop2, clamp) => {
  let result = ((n - start1) / (stop1 - start1) * (stop2 - start2) + start2);
  if (clamp) {
    result = Math.max(result, Math.min(start2, stop2));
    result = Math.min(result, Math.max(start2, stop2));
  }
  return result;
};

const serializationMap = {};

class Color {
  // Reference to underlying color object depending on implementation
  // Not meant to be used publicly unless the implementation is known for sure
  _color;
  // Color mode of the Color object, uses p5 color modes
  mode;

  static colorMap = {};
  static #colorjsMaxes = {};
  static #grayscaleMap = {};

  // Used to add additional color modes to p5.js
  // Uses underlying library's definition
  static addColorMode(mode, definition){
    ColorSpace.register(definition);
    Color.colorMap[mode] = definition.id;

    // Get colorjs maxes
    Color.#colorjsMaxes[mode] = Object.values(definition.coords).reduce((acc, v) => {
        acc.push(v.refRange || v.range);
        return acc;
      }, []);
    Color.#colorjsMaxes[mode].push([0, 1]);

    // Get grayscale mapping
    Color.#grayscaleMap[mode] = definition.fromGray;
  }

  constructor(vals, colorMode, colorMaxes, { clamp = false } = {}) {
    // This changes with the color object
    this.mode = colorMode || RGB;

    if(vals instanceof Color){
      // Received Color object to be used for color mode conversion
      const mode = colorMode ?
        Color.colorMap[colorMode] :
        Color.colorMap[vals.mode];
      this._color = to(vals._color, mode);
      this.mode = mode;

    }else if (typeof vals === 'object' && !Array.isArray(vals) && vals !== null){
      // Received color.js object to be used internally
      const mode = colorMode ?
        Color.colorMap[colorMode] :
        vals.spaceId;
      this._color = to(vals, mode);
      this.mode = colorMode || Object.entries(Color.colorMap).find(([key, val]) => {
          return val === this._color.spaceId;
        });

    } else if(typeof vals[0] === 'string') {
      // Received string
      try{
        this._color = parse(vals[0]);
        const [mode] = Object.entries(Color.colorMap).find(([key, val]) => {
          return val === this._color.spaceId;
        });
        this.mode = mode;
        this._color = to(this._color, this._color.spaceId);
      }catch(err){
        // TODO: Invalid color string
        throw new Error('Invalid color string');
      }

    }else {
      // Received individual channel values
      let mappedVals;

      if(colorMaxes){
        // NOTE: need to consider different number of arguments (eg. CMYK)
        if(vals.length === 4){
          mappedVals = Color.mapColorRange(vals, this.mode, colorMaxes, clamp);
        }else if(vals.length === 3){
          mappedVals = Color.mapColorRange([vals[0], vals[1], vals[2]], this.mode, colorMaxes, clamp);
          mappedVals.push(1);
        }else if(vals.length === 2){
          // Grayscale with alpha
          if(Color.#grayscaleMap[this.mode]){
            mappedVals = Color.#grayscaleMap[this.mode](vals[0], colorMaxes, clamp);
          }else {
            mappedVals = Color.mapColorRange([vals[0], vals[0], vals[0]], this.mode, colorMaxes, clamp);
          }
          const alphaMaxes = Array.isArray(colorMaxes[colorMaxes.length-1]) ?
            colorMaxes[colorMaxes.length-1] :
            [0, colorMaxes[colorMaxes.length-1]];
          mappedVals.push(
            map(
              vals[1],
              alphaMaxes[0],
              alphaMaxes[1],
              0,
              1,
              clamp
            )
          );
        }else if(vals.length === 1){
          // Grayscale only
          if(Color.#grayscaleMap[this.mode]){
            mappedVals = Color.#grayscaleMap[this.mode](vals[0], colorMaxes, clamp);
          }else {
            mappedVals = Color.mapColorRange([vals[0], vals[0], vals[0]], this.mode, colorMaxes, clamp);
          }
          mappedVals.push(1);
        }else {
          throw new Error('Invalid color');
        }
      }else {
        mappedVals = vals;
      }

      const space = Color.colorMap[this.mode] || console.error('Invalid color mode');
      const coords = mappedVals.slice(0, 3);

      const color = {
        space,
        coords,
        alpha: mappedVals[3]
      };
      this._color = to(color, space);
    }
  }

  // Convert from p5 color range to color.js color range
  static mapColorRange(origin, mode, maxes, clamp){
    const p5Maxes = maxes.map((max) => {
      if(!Array.isArray(max)){
        return [0, max];
      }else {
        return max;
      }
    });
    const colorjsMaxes = Color.#colorjsMaxes[mode];

    return origin.map((channel, i) => {
      const newval = map(channel, p5Maxes[i][0], p5Maxes[i][1], colorjsMaxes[i][0], colorjsMaxes[i][1], clamp);
      return newval;
    });
  }

  // Convert from color.js color range to p5 color range
  static unmapColorRange(origin, mode, maxes){
    const p5Maxes = maxes.map((max) => {
      if(!Array.isArray(max)){
        return [0, max];
      }else {
        return max;
      }
    });
    const colorjsMaxes = Color.#colorjsMaxes[mode];

    return origin.map((channel, i) => {
      const newval = map(channel, colorjsMaxes[i][0], colorjsMaxes[i][1], p5Maxes[i][0], p5Maxes[i][1]);
      return newval;
    });
  }

  // Will do conversion in-Gamut as out of Gamut conversion is only really useful for futher conversions
  #toColorMode(mode){
    return new Color(this._color, mode);
  }

  // Get raw coordinates of underlying library, can differ between libraries
  get _array() {
    return this._getRGBA();
  }

  array(){
    return this._array;
  }

  lerp(color, amt, mode){
    // Find the closest common ancestor color space
    let spaceIndex = -1;
    while(
      (
        spaceIndex+1 < this._color.space.path.length ||
        spaceIndex+1 < color._color.space.path.length
      ) &&
      this._color.space.path[spaceIndex+1] === color._color.space.path[spaceIndex+1]
    ){
      spaceIndex += 1;
    }

    if (spaceIndex === -1) {
      // This probably will not occur in practice
      throw new Error('Cannot lerp colors. No common color space found');
    }

    const obj = range(this._color, color._color, {
      space: this._color.space.path[spaceIndex].id
    })(amt);

    return new Color(obj, mode || this.mode);
  }

  /**
   * Returns the color formatted as a `String`.
   *
   * Calling `myColor.toString()` can be useful for debugging, as in
   * `print(myColor.toString())`. It's also helpful for using p5.js with other
   * libraries.
   *
   * The parameter, `format`, is optional. If a format string is passed, as in
   * `myColor.toString('#rrggbb')`, it will determine how the color string is
   * formatted. By default, color strings are formatted as `'rgba(r, g, b, a)'`.
   *
   * @param {String} [format] how the color string will be formatted.
   * Leaving this empty formats the string as rgba(r, g, b, a).
   * '#rgb' '#rgba' '#rrggbb' and '#rrggbbaa' format as hexadecimal color codes.
   * 'rgb' 'hsb' and 'hsl' return the color formatted in the specified color mode.
   * 'rgba' 'hsba' and 'hsla' are the same as above but with alpha channels.
   * 'rgb%' 'hsb%' 'hsl%' 'rgba%' 'hsba%' and 'hsla%' format as percentages.
   * @return {String} the formatted string.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object.
   *   let myColor = color('darkorchid');
   *
   *   // Style the text.
   *   textAlign(CENTER);
   *   textSize(16);
   *
   *   // Display the text.
   *   text(myColor.toString('#rrggbb'), 50, 50);
   *
   *   describe('The text "#9932cc" written in purple on a gray background.');
   * }
   * </code>
   * </div>
   */
  toString(format) {
    const key = `${this._color.space.id}-${this._color.coords.join(",")}-${this._color.alpha}-${format}`;
    let colorString = serializationMap[key];

    if(!colorString){
      colorString = serialize(this._color, {
        format
      });
      serializationMap[key] = colorString;
    }
    return colorString;
  }

  /**
   * Sets the red component of a color.
   *
   * The range depends on the <a href="#/p5/colorMode">colorMode()</a>. In the
   * default RGB mode it's between 0 and 255.
   *
   * @param {Number} red the new red value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object.
   *   let c = color(255, 128, 128);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 20, 35, 60);
   *
   *   // Change the red value.
   *   c.setRed(64);
   *
   *   // Draw the right rectangle.
   *   fill(c);
   *   rect(50, 20, 35, 60);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is teal.');
   * }
   * </code>
   * </div>
   */
  setRed(new_red, max=[0, 1]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    const colorjsMax = Color.#colorjsMaxes[RGB][0];
    const newval = map(new_red, max[0], max[1], colorjsMax[0], colorjsMax[1]);

    if(this.mode === RGB || this.mode === RGBHDR){
      this._color.coords[0] = newval;
    }else {
      // Will do an imprecise conversion to 'srgb', not recommended
      const space = this._color.space.id;
      const representation = to(this._color, 'srgb');
      representation.coords[0] = newval;
      this._color = to(representation, space);
    }
  }

  /**
   * Sets the green component of a color.
   *
   * The range depends on the <a href="#/p5/colorMode">colorMode()</a>. In the
   * default RGB mode it's between 0 and 255.
   *
   * @param {Number} green the new green value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object.
   *   let c = color(255, 128, 128);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 20, 35, 60);
   *
   *   // Change the green value.
   *   c.setGreen(255);
   *
   *   // Draw the right rectangle.
   *   fill(c);
   *   rect(50, 20, 35, 60);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is yellow.');
   * }
   * </code>
   * </div>
   */
  setGreen(new_green, max=[0, 1]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    const colorjsMax = Color.#colorjsMaxes[RGB][1];
    const newval = map(new_green, max[0], max[1], colorjsMax[0], colorjsMax[1]);

    if(this.mode === RGB || this.mode === RGBHDR){
      this._color.coords[1] = newval;
    }else {
      // Will do an imprecise conversion to 'srgb', not recommended
      const space = this._color.space.id;
      const representation = to(this._color, 'srgb');
      representation.coords[1] = newval;
      this._color = to(representation, space);
    }
  }

  /**
   * Sets the blue component of a color.
   *
   * The range depends on the <a href="#/p5/colorMode">colorMode()</a>. In the
   * default RGB mode it's between 0 and 255.
   *
   * @param {Number} blue the new blue value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object.
   *   let c = color(255, 128, 128);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 20, 35, 60);
   *
   *   // Change the blue value.
   *   c.setBlue(255);
   *
   *   // Draw the right rectangle.
   *   fill(c);
   *   rect(50, 20, 35, 60);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is pale fuchsia.');
   * }
   * </code>
   * </div>
   **/
  setBlue(new_blue, max=[0, 1]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    const colorjsMax = Color.#colorjsMaxes[RGB][2];
    const newval = map(new_blue, max[0], max[1], colorjsMax[0], colorjsMax[1]);

    if(this.mode === RGB || this.mode === RGBHDR){
      this._color.coords[2] = newval;
    }else {
      // Will do an imprecise conversion to 'srgb', not recommended
      const space = this._color.space.id;
      const representation = to(this._color, 'srgb');
      representation.coords[2] = newval;
      this._color = to(representation, space);
    }
  }

  /**
   * Sets the alpha (transparency) value of a color.
   *
   * The range depends on the
   * <a href="#/p5/colorMode">colorMode()</a>. In the default RGB mode it's
   * between 0 and 255.
   *
   * @param {Number} alpha the new alpha value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object.
   *   let c = color(255, 128, 128);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 20, 35, 60);
   *
   *   // Change the alpha value.
   *   c.setAlpha(128);
   *
   *   // Draw the right rectangle.
   *   fill(c);
   *   rect(50, 20, 35, 60);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is faded pink.');
   * }
   * </code>
   * </div>
   */
  setAlpha(new_alpha, max=[0, 1]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    const colorjsMax = Color.#colorjsMaxes[this.mode][3];
    const newval = map(new_alpha, max[0], max[1], colorjsMax[0], colorjsMax[1]);

    this._color.alpha = newval;
  }

  _getRGBA(maxes=[1, 1, 1, 1]) {
    // Get colorjs maxes
    const colorjsMaxes = Color.#colorjsMaxes[RGB];

    // Normalize everything to 0,1 or the provided range (map)
    let coords = structuredClone(to(this._color, 'srgb').coords);
    coords.push(this._color.alpha);

    const rangeMaxes = maxes.map((v) => {
      if(!Array.isArray(v)){
        return [0, v];
      }else {
        return v
      }
    });

    coords = coords.map((coord, i) => {
      return map(coord, colorjsMaxes[i][0], colorjsMaxes[i][1], rangeMaxes[i][0], rangeMaxes[i][1]);
    });

    return coords;
  }

  _getMode() {
    return this.mode;
  }

  _getRed(max=[0, 1]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    if(this.mode === RGB || this.mode === RGBHDR){
      const colorjsMax = Color.#colorjsMaxes[this.mode][0];
      return map(this._color.coords[0], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }else {
      // Will do an imprecise conversion to 'srgb', not recommended
      const colorjsMax = Color.#colorjsMaxes[RGB][0];
      return map(to(this._color, 'srgb').coords[0], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }
  }

  /**
   * This function extracts the green value from a color object and
   * returns it in the range 0–255 by default. When `colorMode()` is given to an
   * RBG value, the green value within the givin range is returned
   */
  _getGreen(max=[0, 1]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    if(this.mode === RGB || this.mode === RGBHDR){
      const colorjsMax = Color.#colorjsMaxes[this.mode][1];
      return map(this._color.coords[1], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }else {
      // Will do an imprecise conversion to 'srgb', not recommended
      const colorjsMax = Color.#colorjsMaxes[RGB][1];
      return map(to(this._color, 'srgb').coords[1], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }
  }

  _getBlue(max=[0, 1]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    if(this.mode === RGB || this.mode === RGBHDR){
      const colorjsMax = Color.#colorjsMaxes[this.mode][2];
      return map(this._color.coords[2], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }else {
      // Will do an imprecise conversion to 'srgb', not recommended
      const colorjsMax = Color.#colorjsMaxes[RGB][2];
      return map(to(this._color, 'srgb').coords[2], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }
  }

  _getAlpha(max=[0, 1]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    const colorjsMax = Color.#colorjsMaxes[this.mode][3];
    return map(this._color.alpha, colorjsMax[0], colorjsMax[1], max[0], max[1]);
  }

  /**
   * Hue is the same in HSB and HSL, but the maximum value may be different.
   * This function will return the HSB-normalized saturation when supplied with
   * an HSB color object, but will default to the HSL-normalized saturation
   * otherwise.
   */
  _getHue(max=[0, 360]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    if(this.mode === HSB || this.mode === HSL){
      const colorjsMax = Color.#colorjsMaxes[this.mode][0];
      return map(this._color.coords[0], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }else {
      // Will do an imprecise conversion to 'HSL', not recommended
      const colorjsMax = Color.#colorjsMaxes[HSL][0];
      return map(to(this._color, 'hsl').coords[0], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }
  }

  /**
   * Saturation is scaled differently in HSB and HSL. This function will return
   * the HSB saturation when supplied with an HSB color object, but will default
   * to the HSL saturation otherwise.
   */
  _getSaturation(max=[0, 100]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    if(this.mode === HSB || this.mode === HSL){
      const colorjsMax = Color.#colorjsMaxes[this.mode][1];
      return map(this._color.coords[1], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }else {
      // Will do an imprecise conversion to 'HSL', not recommended
      const colorjsMax = Color.#colorjsMaxes[HSL][1];
      return map(to(this._color, 'hsl').coords[1], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }
  }
  /**
   * Brightness obtains the HSB brightness value from either a p5.Color object,
   * an array of color components, or a CSS color string.Depending on value,
   * when `colorMode()` is set to HSB, this function will return the
   * brightness value in the range. By default, this function will return
   * the HSB brightness within the range 0 - 100.
   */

  _getBrightness(max=[0, 100]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    if(this.mode === HSB){
      const colorjsMax = Color.#colorjsMaxes[this.mode][2];
      return map(this._color.coords[2], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }else {
      // Will do an imprecise conversion to 'HSB', not recommended
      const colorjsMax = Color.#colorjsMaxes[HSB][2];
      return map(to(this._color, 'hsb').coords[2], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }
  }

  _getLightness(max=[0, 100]) {
    if(!Array.isArray(max)){
      max = [0, max];
    }

    if(this.mode === HSL){
      const colorjsMax = Color.#colorjsMaxes[this.mode][2];
      return map(this._color.coords[2], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }else {
      // Will do an imprecise conversion to 'HSL', not recommended
      const colorjsMax = Color.#colorjsMaxes[HSL][2];
      return map(to(this._color, 'hsl').coords[2], colorjsMax[0], colorjsMax[1], max[0], max[1]);
    }
  }
}

function color(p5, fn, lifecycles){
  /**
   * A class to describe a color.
   *
   * Each `p5.Color` object stores the color mode
   * and level maxes that were active during its construction. These values are
   * used to interpret the arguments passed to the object's constructor. They
   * also determine output formatting such as when
   * <a href="#/p5/saturation">saturation()</a> is called.
   *
   * Color is stored internally as an array of ideal RGBA values in floating
   * point form, normalized from 0 to 1. These values are used to calculate the
   * closest screen colors, which are RGBA levels from 0 to 255. Screen colors
   * are sent to the renderer.
   *
   * When different color representations are calculated, the results are cached
   * for performance. These values are normalized, floating-point numbers.
   *
   * Note: <a href="#/p5/color">color()</a> is the recommended way to create an
   * instance of this class.
   *
   * @class p5.Color
   * @param {p5} [pInst]                      pointer to p5 instance.
   *
   * @param {Number[]|String} vals            an array containing the color values
   *                                          for red, green, blue and alpha channel
   *                                          or CSS color.
   */
  p5.Color = Color;

  sRGB.fromGray = P3.fromGray = function(val, maxes, clamp){
    // Use blue max
    const p5Maxes = maxes.map((max) => {
      if(!Array.isArray(max)){
        return [0, max];
      }else {
        return max;
      }
    });

    const v = map(val, p5Maxes[2][0], p5Maxes[2][1], 0, 1, clamp);
    return [v, v, v];
  };

  HSBSpace.fromGray = HSL$1.fromGray = function(val, maxes, clamp){
    // Use brightness max
    const p5Maxes = maxes.map((max) => {
      if(!Array.isArray(max)){
        return [0, max];
      }else {
        return max;
      }
    });

    const v = map(val, p5Maxes[2][0], p5Maxes[2][1], 0, 100, clamp);
    return [0, 0, v];
  };

  HWB$1.fromGray = function(val, maxes, clamp){
    // Use Whiteness and Blackness to create number line
    const p5Maxes = maxes.map((max) => {
      if(!Array.isArray(max)){
        return [0, max];
      }else {
        return max;
      }
    });

    const wbMax =
      (Math.abs(p5Maxes[1][0] - p5Maxes[1][1])) / 2 +
      (Math.abs(p5Maxes[2][0] - p5Maxes[2][1])) / 2;

    const nVal = map(val, 0, wbMax, 0, 100);
    let white, black;
    if(nVal < 50){
      black = nVal;
      white = 100 - nVal;
    }else if(nVal >= 50){
      white = nVal;
      black = 100 - nVal;
    }
    return [0, white, black];
  };

  Lab.fromGray =
  LCH$1.fromGray =
  OKLab.fromGray =
  OKLCH$1.fromGray =
  function(val, maxes, clamp){
    // Use lightness max
    const p5Maxes = maxes.map((max) => {
      if(!Array.isArray(max)){
        return [0, max];
      }else {
        return max;
      }
    });

    const v = map(val, p5Maxes[0][0], p5Maxes[0][1], 0, 100, clamp);
    return [v, 0, 0];
  };

  // Register color modes and initialize Color maxes to what p5 has set for itself
  p5.Color.addColorMode(RGB, sRGB);
  p5.Color.addColorMode(RGBHDR, P3);
  p5.Color.addColorMode(HSB, HSBSpace);
  p5.Color.addColorMode(HSL, HSL$1);
  p5.Color.addColorMode(HWB, HWB$1);
  p5.Color.addColorMode(LAB, Lab);
  p5.Color.addColorMode(LCH, LCH$1);
  p5.Color.addColorMode(OKLAB, OKLab);
  p5.Color.addColorMode(OKLCH, OKLCH$1);

  lifecycles.presetup = function(){
    const pInst = this;

    // Decorate set methods
    const setMethods = ['Red', 'Green', 'Blue', 'Alpha'];
    for(let i in setMethods){
      const method = setMethods[i];
      const setCopy = p5.Color.prototype['set' + method];
      p5.Color.prototype['set' + method] = function(newval, max){
        max = max || pInst?._renderer?.states?.colorMaxes?.[RGB][i];
        return setCopy.call(this, newval, max);
      };
    }

    // Decorate get methods
    function decorateGet(channel, modes){
      const getCopy = p5.Color.prototype['_get' + channel];
      p5.Color.prototype['_get' + channel] = function(max){
        if(Object.keys(modes).includes(this.mode)){
          max = max || pInst?._renderer?.states?.colorMaxes?.[this.mode][modes[this.mode]];
        }else {
          const defaultMode = Object.keys(modes)[0];
          max = max || pInst?._renderer?.states?.colorMaxes?.[defaultMode][modes[defaultMode]];
        }

        return getCopy.call(this, max);
      };
    }

    decorateGet('Red', {
      [RGB]: 0,
      [RGBHDR]: 0
    });
    decorateGet('Green', {
      [RGB]: 1,
      [RGBHDR]: 1
    });
    decorateGet('Blue', {
      [RGB]: 2,
      [RGBHDR]: 2
    });
    decorateGet('Alpha', {
      [RGB]: 3,
      [RGBHDR]: 3,
      [HSB]: 3,
      [HSL]: 3,
      [HWB]: 3,
      [LAB]: 3,
      [LCH]: 3,
      [OKLAB]: 3,
      [OKLCH]: 3
    });

    decorateGet('Hue', {
      [HSL]: 0,
      [HSB]: 0,
      [HWB]: 0,
      [LCH]: 2,
      [OKLCH]: 2
    });
    decorateGet('Saturation', {
      [HSL]: 1,
      [HSB]: 1
    });
    decorateGet('Brightness', {
      [HSB]: 2
    });
    decorateGet('Lightness', {
      [HSL]: 2
    });
  };
}

if(typeof p5 !== 'undefined'){
  color(p5, p5.prototype);
}

/**
 * @module Color
 * @submodule Creating & Reading
 * @for p5
 * @requires core
 * @requires constants
 */


/**
 * @typedef {'rgb'} RGB
 * @property {RGB} RGB
 * @final
 */
const RGB = 'rgb';
/**
 * @typedef {'rgbhdr'} RGBHDR
 * @property {RGBHDR} RGBHDR
 * @final
 */
const RGBHDR = 'rgbhdr';
/**
 * HSB (hue, saturation, brightness) is a type of color model.
 * You can learn more about it at
 * <a href="https://learnui.design/blog/the-hsb-color-system-practicioners-primer.html">HSB</a>.
 *
 * @typedef {'hsb'} HSB
 * @property {HSB} HSB
 * @final
 */
const HSB = 'hsb';
/**
 * @typedef {'hsl'} HSL
 * @property {HSL} HSL
 * @final
 */
const HSL = 'hsl';
/**
 * @typedef {'hwb'} HWB
 * @property {HWB} HWB
 * @final
 */
const HWB = 'hwb';
/**
 * @typedef {'lab'} LAB
 * @property {LAB} LAB
 * @final
 */
const LAB = 'lab';
/**
 * @typedef {'lch'} LCH
 * @property {LCH} LCH
 * @final
 */
const LCH = 'lch';
/**
 * @typedef {'oklab'} OKLAB
 * @property {OKLAB} OKLAB
 * @final
 */
const OKLAB = 'oklab';
/**
 * @typedef {'oklch'} OKLCH
 * @property {OKLCH} OKLCH
 * @final
 */
const OKLCH = 'oklch';
/**
 * @typedef {'rgba'} RGBA
 * @property {RGBA} RGBA
 * @final
 */
const RGBA = 'rgba';

function creatingReading(p5, fn){
  fn.RGB = RGB;
  fn.RGBHDR = RGBHDR;
  fn.HSB = HSB;
  fn.HSL = HSL;
  fn.HWB = HWB;

  fn.LAB = LAB;
  fn.LCH = LCH;

  fn.OKLAB = OKLAB;
  fn.OKLCH = OKLCH;

  fn.RGBA = RGBA;

  // Add color states to renderer state machine
  p5.Renderer.states.colorMode = RGB;
  p5.Renderer.states.colorMaxes = {
    [RGB]: [255, 255, 255, 255],
    [RGBHDR]: [255, 255, 255, 255],
    [HSB]: [360, 100, 100, 1],
    [HSL]: [360, 100, 100, 1],
    [HWB]: [360, 100, 100, 1],

    [LAB]: [100, [-125, 125], [-125, 125], 1],
    [LCH]: [100, 150, 360, 1],

    [OKLAB]: [100, [-125, 125], [-125, 125], 1],
    [OKLCH]: [100, 150, 360, 1],
    clone: function(){
      const cloned = { ...this };
      for (const key in cloned) {
        if (cloned[key] instanceof Array) {
          cloned[key] = [...cloned[key]];
        }
      }
      return cloned;
    }
  };

  /**
   * Creates a <a href="#/p5/p5.Color">p5.Color</a> object.
   *
   * By default, the parameters are interpreted as RGB values. Calling
   * `color(255, 204, 0)` will return a bright yellow color. The way these
   * parameters are interpreted may be changed with the
   * <a href="#/p5/colorMode">colorMode()</a> function.
   *
   * The version of `color()` with one parameter interprets the value one of two
   * ways. If the parameter is a number, it's interpreted as a grayscale value.
   * If the parameter is a string, it's interpreted as a CSS color string.
   *
   * The version of `color()` with two parameters interprets the first one as a
   * grayscale value. The second parameter sets the alpha (transparency) value.
   *
   * The version of `color()` with three parameters interprets them as RGB, HSB,
   * or HSL colors, depending on the current `colorMode()`.
   *
   * The version of `color()` with four parameters interprets them as RGBA, HSBA,
   * or HSLA colors, depending on the current `colorMode()`. The last parameter
   * sets the alpha (transparency) value.
   *
   * @method color
   * @param  {Number} gray number specifying value between white and black.
   * @param  {Number} [alpha] alpha value relative to current color range
   *                                 (default is 0-255).
   * @return {p5.Color} resulting color.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using RGB values.
   *   let c = color(255, 204, 0);
   *
   *   // Draw the square.
   *   fill(c);
   *   noStroke();
   *   square(30, 20, 55);
   *
   *   describe('A yellow square on a gray canvas.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using RGB values.
   *   let c1 = color(255, 204, 0);
   *
   *   // Draw the left circle.
   *   fill(c1);
   *   noStroke();
   *   circle(25, 25, 80);
   *
   *   // Create a p5.Color object using a grayscale value.
   *   let c2 = color(65);
   *
   *   // Draw the right circle.
   *   fill(c2);
   *   circle(75, 75, 80);
   *
   *   describe(
   *     'Two circles on a gray canvas. The circle in the top-left corner is yellow and the one at the bottom-right is gray.'
   *   );
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using a named color.
   *   let c = color('magenta');
   *
   *   // Draw the square.
   *   fill(c);
   *   noStroke();
   *   square(20, 20, 60);
   *
   *   describe('A magenta square on a gray canvas.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using a hex color code.
   *   let c1 = color('#0f0');
   *
   *   // Draw the left rectangle.
   *   fill(c1);
   *   noStroke();
   *   rect(0, 10, 45, 80);
   *
   *   // Create a p5.Color object using a hex color code.
   *   let c2 = color('#00ff00');
   *
   *   // Draw the right rectangle.
   *   fill(c2);
   *   rect(55, 10, 45, 80);
   *
   *   describe('Two bright green rectangles on a gray canvas.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using a RGB color string.
   *   let c1 = color('rgb(0, 0, 255)');
   *
   *   // Draw the top-left square.
   *   fill(c1);
   *   square(10, 10, 35);
   *
   *   // Create a p5.Color object using a RGB color string.
   *   let c2 = color('rgb(0%, 0%, 100%)');
   *
   *   // Draw the top-right square.
   *   fill(c2);
   *   square(55, 10, 35);
   *
   *   // Create a p5.Color object using a RGBA color string.
   *   let c3 = color('rgba(0, 0, 255, 1)');
   *
   *   // Draw the bottom-left square.
   *   fill(c3);
   *   square(10, 55, 35);
   *
   *   // Create a p5.Color object using a RGBA color string.
   *   let c4 = color('rgba(0%, 0%, 100%, 1)');
   *
   *   // Draw the bottom-right square.
   *   fill(c4);
   *   square(55, 55, 35);
   *
   *   describe('Four blue squares in the corners of a gray canvas.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using a HSL color string.
   *   let c1 = color('hsl(160, 100%, 50%)');
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c1);
   *   rect(0, 10, 45, 80);
   *
   *   // Create a p5.Color object using a HSLA color string.
   *   let c2 = color('hsla(160, 100%, 50%, 0.5)');
   *
   *   // Draw the right rectangle.
   *   fill(c2);
   *   rect(55, 10, 45, 80);
   *
   *   describe('Two sea green rectangles. A darker rectangle on the left and a brighter one on the right.');
   * }
   * </code>
   * </div>
   *
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using a HSB color string.
   *   let c1 = color('hsb(160, 100%, 50%)');
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c1);
   *   rect(0, 10, 45, 80);
   *
   *   // Create a p5.Color object using a HSBA color string.
   *   let c2 = color('hsba(160, 100%, 50%, 0.5)');
   *
   *   // Draw the right rectangle.
   *   fill(c2);
   *   rect(55, 10, 45, 80);
   *
   *   describe('Two green rectangles. A darker rectangle on the left and a brighter one on the right.');
   * }
   * </code>
   * </div>
   *
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using RGB values.
   *   let c1 = color(50, 55, 100);
   *
   *   // Draw the left rectangle.
   *   fill(c1);
   *   rect(0, 10, 45, 80);
   *
   *   // Switch the color mode to HSB.
   *   colorMode(HSB, 100);
   *
   *   // Create a p5.Color object using HSB values.
   *   let c2 = color(50, 55, 100);
   *
   *   // Draw the right rectangle.
   *   fill(c2);
   *   rect(55, 10, 45, 80);
   *
   *   describe('Two blue rectangles. A darker rectangle on the left and a brighter one on the right.');
   * }
   * </code>
   * </div>
   */

  /**
   * @method color
   * @param  {Number}        v1      red or hue value relative to
   *                                 the current color range.
   * @param  {Number}        v2      green or saturation value
   *                                 relative to the current color range.
   * @param  {Number}        v3      blue or brightness value
   *                                 relative to the current color range.
   * @param  {Number}        [alpha]
   * @return {p5.Color}
   */

  /**
   * @method color
   * @param  {String}        value   a color string.
   * @return {p5.Color}
   */

  /**
   * @method color
   * @param  {Number[]}      values  an array containing the red, green, blue,
   *                                 and alpha components of the color.
   * @return {p5.Color}
   */

  /**
   * @method color
   * @param  {p5.Color}     color
   * @return {p5.Color}
   */
  fn.color = function(...args) {
    // p5._validateParameters('color', args);
    if (args[0] instanceof Color) {
      // TODO: perhaps change color mode to match instance mode?
      return args[0]; // Do nothing if argument is already a color object.
    }

    const arg = Array.isArray(args[0]) ? args[0] : args;
    return new Color(
      arg,
      this._renderer.states.colorMode,
      this._renderer.states.colorMaxes[this._renderer.states.colorMode],
      { clamp: true }
    );
  };

  /**
   * Gets the red value of a color.
   *
   * `red()` extracts the red value from a
   * <a href="/reference/p5/p5.Color/">p5.Color</a> object, an array of color components, or
   * a CSS color string.
   *
   * By default, `red()` returns a color's red value in the range 0
   * to 255. If the <a href="/reference/p5/colorMode/">colorMode()</a> is set to RGB, it
   * returns the red value in the given range.
   *
   * @method red
   * @param {p5.Color|Number[]|String} color <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
   *                                         color components, or CSS color string.
   * @return {Number} the red value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object.
   *   let c = color(175, 100, 220);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'redValue' to 175.
   *   let redValue = red(c);
   *
   *   // Draw the right rectangle.
   *   fill(redValue, 0, 0);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is red.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a color array.
   *   let c = [175, 100, 220];
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'redValue' to 175.
   *   let redValue = red(c);
   *
   *   // Draw the right rectangle.
   *   fill(redValue, 0, 0);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is red.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a CSS color string.
   *   let c = 'rgb(175, 100, 220)';
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'redValue' to 175.
   *   let redValue = red(c);
   *
   *   // Draw the right rectangle.
   *   fill(redValue, 0, 0);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is red.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use RGB color with values in the range 0-100.
   *   colorMode(RGB, 100);
   *
   *   // Create a p5.Color object.
   *   let c = color(69, 39, 86);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'redValue' to 69.
   *   let redValue = red(c);
   *
   *   // Draw the right rectangle.
   *   fill(redValue, 0, 0);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is red.');
   * }
   * </code>
   * </div>
   */
  fn.red = function(c) {
    // p5._validateParameters('red', arguments);
    // Get current red max
    return this.color(c)._getRed();
  };

  /**
   * Gets the green value of a color.
   *
   * `green()` extracts the green value from a
   * <a href="/reference/p5/p5.Color/">p5.Color</a> object, an array of color components, or
   * a CSS color string.
   *
   * By default, `green()` returns a color's green value in the range 0
   * to 255. If the <a href="/reference/p5/colorMode/">colorMode()</a> is set to RGB, it
   * returns the green value in the given range.
   *
   * @method green
   * @param {p5.Color|Number[]|String} color <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
   *                                         color components, or CSS color string.
   * @return {Number} the green value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object.
   *   let c = color(175, 100, 220);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'greenValue' to 100.
   *   let greenValue = green(c);
   *
   *   // Draw the right rectangle.
   *   fill(0, greenValue, 0);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is dark green.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a color array.
   *   let c = [175, 100, 220];
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'greenValue' to 100.
   *   let greenValue = green(c);
   *
   *   // Draw the right rectangle.
   *   fill(0, greenValue, 0);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is dark green.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a CSS color string.
   *   let c = 'rgb(175, 100, 220)';
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'greenValue' to 100.
   *   let greenValue = green(c);
   *
   *   // Draw the right rectangle.
   *   fill(0, greenValue, 0);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is dark green.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use RGB color with values in the range 0-100.
   *   colorMode(RGB, 100);
   *
   *   // Create a p5.Color object using RGB values.
   *   let c = color(69, 39, 86);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'greenValue' to 39.
   *   let greenValue = green(c);
   *
   *   // Draw the right rectangle.
   *   fill(0, greenValue, 0);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is dark green.');
   * }
   * </code>
   * </div>
   */
  fn.green = function(c) {
    // p5._validateParameters('green', arguments);
    // Get current green max
    return this.color(c)._getGreen();
  };

  /**
   * Gets the blue value of a color.
   *
   * `blue()` extracts the blue value from a
   * <a href="/reference/p5/p5.Color/">p5.Color</a> object, an array of color components, or
   * a CSS color string.
   *
   * By default, `blue()` returns a color's blue value in the range 0
   * to 255. If the <a href="/reference/p5/colorMode/">colorMode()</a> is set to RGB, it
   * returns the blue value in the given range.
   *
   * @method blue
   * @param {p5.Color|Number[]|String} color <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
   *                                         color components, or CSS color string.
   * @return {Number} the blue value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object using RGB values.
   *   let c = color(175, 100, 220);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'blueValue' to 220.
   *   let blueValue = blue(c);
   *
   *   // Draw the right rectangle.
   *   fill(0, 0, blueValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is royal blue.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a color array.
   *   let c = [175, 100, 220];
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'blueValue' to 220.
   *   let blueValue = blue(c);
   *
   *   // Draw the right rectangle.
   *   fill(0, 0, blueValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is royal blue.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a CSS color string.
   *   let c = 'rgb(175, 100, 220)';
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'blueValue' to 220.
   *   let blueValue = blue(c);
   *
   *   // Draw the right rectangle.
   *   fill(0, 0, blueValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is royal blue.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use RGB color with values in the range 0-100.
   *   colorMode(RGB, 100);
   *
   *   // Create a p5.Color object using RGB values.
   *   let c = color(69, 39, 86);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'blueValue' to 86.
   *   let blueValue = blue(c);
   *
   *   // Draw the right rectangle.
   *   fill(0, 0, blueValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light purple and the right one is royal blue.');
   * }
   * </code>
   * </div>
   */
  fn.blue = function(c) {
    // p5._validateParameters('blue', arguments);
    // Get current blue max
    return this.color(c)._getBlue();
  };

  /**
   * Gets the alpha (transparency) value of a color.
   *
   * `alpha()` extracts the alpha value from a
   * <a href="#/p5.Color">p5.Color</a> object, an array of color components, or
   * a CSS color string.
   *
   * @method alpha
   * @param {p5.Color|Number[]|String} color <a href="#/p5.Color">p5.Color</a> object, array of
   *                                         color components, or CSS color string.
   * @return {Number} the alpha value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a p5.Color object.
   *   let c = color(0, 126, 255, 102);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'alphaValue' to 102.
   *   let alphaValue = alpha(c);
   *
   *   // Draw the right rectangle.
   *   fill(alphaValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light blue and the right one is charcoal gray.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a color array.
   *   let c = [0, 126, 255, 102];
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'alphaValue' to 102.
   *   let alphaValue = alpha(c);
   *
   *   // Draw the left rectangle.
   *   fill(alphaValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light blue and the right one is charcoal gray.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create a CSS color string.
   *   let c = 'rgba(0, 126, 255, 0.4)';
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'alphaValue' to 102.
   *   let alphaValue = alpha(c);
   *
   *   // Draw the right rectangle.
   *   fill(alphaValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is light blue and the right one is charcoal gray.');
   * }
   * </code>
   * </div>
   */
  fn.alpha = function(c) {
    // p5._validateParameters('alpha', arguments);
    // Get current alpha max
    return this.color(c)._getAlpha();
  };

  /**
   * Gets the hue value of a color.
   *
   * `hue()` extracts the hue value from a
   * <a href="/reference/p5/p5.Color/">p5.Color</a> object, an array of color components, or
   * a CSS color string.
   *
   * Hue describes a color's position on the color wheel. By default, `hue()`
   * returns a color's HSL hue in the range 0 to 360. If the
   * <a href="/reference/p5/colorMode/">colorMode()</a> is set to HSB or HSL, it returns the hue
   * value in the given mode.
   *
   * @method hue
   * @param {p5.Color|Number[]|String} color <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
   *                                         color components, or CSS color string.
   * @return {Number} the hue value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use HSL color.
   *   colorMode(HSL);
   *
   *   // Create a p5.Color object.
   *   let c = color(0, 50, 100);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 20, 35, 60);
   *
   *   // Set 'hueValue' to 0.
   *   let hueValue = hue(c);
   *
   *   // Draw the right rectangle.
   *   fill(hueValue);
   *   rect(50, 20, 35, 60);
   *
   *   describe(
   *     'Two rectangles. The rectangle on the left is salmon pink and the one on the right is black.'
   *   );
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use HSL color.
   *   colorMode(HSL);
   *
   *   // Create a color array.
   *   let c = [0, 50, 100];
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 20, 35, 60);
   *
   *   // Set 'hueValue' to 0.
   *   let hueValue = hue(c);
   *
   *   // Draw the right rectangle.
   *   fill(hueValue);
   *   rect(50, 20, 35, 60);
   *
   *   describe(
   *     'Two rectangles. The rectangle on the left is salmon pink and the one on the right is black.'
   *   );
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use HSL color.
   *   colorMode(HSL);
   *
   *   // Create a CSS color string.
   *   let c = 'rgb(255, 128, 128)';
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 20, 35, 60);
   *
   *   // Set 'hueValue' to 0.
   *   let hueValue = hue(c);
   *
   *   // Draw the right rectangle.
   *   fill(hueValue);
   *   rect(50, 20, 35, 60);
   *
   *   describe(
   *     'Two rectangles. The rectangle on the left is salmon pink and the one on the right is black.'
   *   );
   * }
   * </code>
   * </div>
   */
  fn.hue = function(c) {
    // p5._validateParameters('hue', arguments);
    return this.color(c)._getHue();
  };

  /**
   * Gets the saturation value of a color.
   *
   * `saturation()` extracts the saturation value from a
   * <a href="/reference/p5/p5.Color/">p5.Color</a> object, an array of color components, or
   * a CSS color string.
   *
   * Saturation is scaled differently in HSB and HSL. By default, `saturation()`
   * returns a color's HSL saturation in the range 0 to 100. If the
   * <a href="/reference/p5/colorMode/">colorMode()</a> is set to HSB or HSL, it returns the
   * saturation value in the given mode.
   *
   * @method saturation
   * @param {p5.Color|Number[]|String} color <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
   *                                         color components, or CSS color string.
   * @return {Number} the saturation value
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSB color.
   *   colorMode(HSB);
   *
   *   // Create a p5.Color object.
   *   let c = color(0, 50, 100);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'satValue' to 50.
   *   let satValue = saturation(c);
   *
   *   // Draw the right rectangle.
   *   fill(satValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is dark gray.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSB color.
   *   colorMode(HSB);
   *
   *   // Create a color array.
   *   let c = [0, 50, 100];
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'satValue' to 100.
   *   let satValue = saturation(c);
   *
   *   // Draw the right rectangle.
   *   fill(satValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is gray.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSB color.
   *   colorMode(HSB);
   *
   *   // Create a CSS color string.
   *   let c = 'rgb(255, 128, 128)';
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'satValue' to 100.
   *   let satValue = saturation(c);
   *
   *   // Draw the right rectangle.
   *   fill(satValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is gray.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSL color.
   *   colorMode(HSL);
   *
   *   // Create a p5.Color object.
   *   let c = color(0, 100, 75);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'satValue' to 100.
   *   let satValue = saturation(c);
   *
   *   // Draw the right rectangle.
   *   fill(satValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is white.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSL color with values in the range 0-255.
   *   colorMode(HSL, 255);
   *
   *   // Create a p5.Color object.
   *   let c = color(0, 255, 191.5);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'satValue' to 255.
   *   let satValue = saturation(c);
   *
   *   // Draw the right rectangle.
   *   fill(satValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is white.');
   * }
   * </code>
   * </div>
   */
  fn.saturation = function(c) {
    // p5._validateParameters('saturation', arguments);
    return this.color(c)._getSaturation();
  };

  /**
   * Gets the brightness value of a color.
   *
   * `brightness()` extracts the HSB brightness value from a
   * <a href="/reference/p5/p5.Color/">p5.Color</a> object, an array of color components, or
   * a CSS color string.
   *
   * By default, `brightness()` returns a color's HSB brightness in the range 0
   * to 100. If the <a href="/reference/p5/colorMode/">colorMode()</a> is set to HSB, it
   * returns the brightness value in the given range.
   *
   * @method brightness
   * @param {p5.Color|Number[]|String} color <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
   *                                         color components, or CSS color string.
   * @return {Number} the brightness value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use HSB color.
   *   colorMode(HSB);
   *
   *   // Create a p5.Color object.
   *   let c = color(0, 50, 100);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'brightValue' to 100.
   *   let brightValue = brightness(c);
   *
   *   // Draw the right rectangle.
   *   fill(brightValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is white.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use HSB color.
   *   colorMode(HSB);
   *
   *   // Create a color array.
   *   let c = [0, 50, 100];
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'brightValue' to 100.
   *   let brightValue = brightness(c);
   *
   *   // Draw the right rectangle.
   *   fill(brightValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is white.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use HSB color.
   *   colorMode(HSB);
   *
   *   // Create a CSS color string.
   *   let c = 'rgb(255, 128, 128)';
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'brightValue' to 100.
   *   let brightValue = brightness(c);
   *
   *   // Draw the right rectangle.
   *   fill(brightValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is white.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Use HSB color with values in the range 0-255.
   *   colorMode(HSB, 255);
   *
   *   // Create a p5.Color object.
   *   let c = color(0, 127, 255);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'brightValue' to 255.
   *   let brightValue = brightness(c);
   *
   *   // Draw the right rectangle.
   *   fill(brightValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is white.');
   * }
   * </code>
   * </div>
   */
  fn.brightness = function(c) {
    // p5._validateParameters('brightness', arguments);
    return this.color(c)._getBrightness();
  };

  /**
   * Gets the lightness value of a color.
   *
   * `lightness()` extracts the HSL lightness value from a
   * <a href="/reference/p5/p5.Color/">p5.Color</a> object, an array of color components, or
   * a CSS color string.
   *
   * By default, `lightness()` returns a color's HSL lightness in the range 0
   * to 100. If the <a href="/reference/p5/colorMode/">colorMode()</a> is set to HSL, it
   * returns the lightness value in the given range.
   *
   * @method lightness
   * @param {p5.Color|Number[]|String} color <a href="/reference/p5/p5.Color/">p5.Color</a> object, array of
   *                                         color components, or CSS color string.
   * @return {Number} the lightness value.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSL color.
   *   colorMode(HSL);
   *
   *   // Create a p5.Color object using HSL values.
   *   let c = color(0, 100, 75);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'lightValue' to 75.
   *   let lightValue = lightness(c);
   *
   *   // Draw the right rectangle.
   *   fill(lightValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is gray.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSL color.
   *   colorMode(HSL);
   *
   *   // Create a color array.
   *   let c = [0, 100, 75];
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'lightValue' to 75.
   *   let lightValue = lightness(c);
   *
   *   // Draw the right rectangle.
   *   fill(lightValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is gray.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSL color.
   *   colorMode(HSL);
   *
   *   // Create a CSS color string.
   *   let c = 'rgb(255, 128, 128)';
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'lightValue' to 75.
   *   let lightValue = lightness(c);
   *
   *   // Draw the right rectangle.
   *   fill(lightValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is gray.');
   * }
   * </code>
   * </div>
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(50);
   *
   *   // Use HSL color with values in the range 0-255.
   *   colorMode(HSL, 255);
   *
   *   // Create a p5.Color object using HSL values.
   *   let c = color(0, 255, 191.5);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(c);
   *   rect(15, 15, 35, 70);
   *
   *   // Set 'lightValue' to 191.5.
   *   let lightValue = lightness(c);
   *
   *   // Draw the right rectangle.
   *   fill(lightValue);
   *   rect(50, 15, 35, 70);
   *
   *   describe('Two rectangles. The left one is salmon pink and the right one is gray.');
   * }
   * </code>
   * </div>
   */
  fn.lightness = function(c) {
    // p5._validateParameters('lightness', arguments);
    return this.color(c)._getLightness();
  };

  /**
   * Blends two colors to find a third color between them.
   *
   * The `amt` parameter specifies the amount to interpolate between the two
   * values. 0 is equal to the first color, 0.1 is very near the first color,
   * 0.5 is halfway between the two colors, and so on. Negative numbers are set
   * to 0. Numbers greater than 1 are set to 1. This differs from the behavior of
   * <a href="#/lerp">lerp</a>. It's necessary because numbers outside of the
   * interval [0, 1] will produce strange and unexpected colors.
   *
   * The way that colors are interpolated depends on the current
   * <a href="#/colorMode">colorMode()</a>.
   *
   * @method lerpColor
   * @param  {p5.Color} c1  interpolate from this color.
   * @param  {p5.Color} c2  interpolate to this color.
   * @param  {Number}   amt number between 0 and 1.
   * @return {p5.Color}     interpolated color.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(100, 100);
   *
   *   background(200);
   *
   *   // Create p5.Color objects to interpolate between.
   *   let from = color(218, 165, 32);
   *   let to = color(72, 61, 139);
   *
   *   // Create intermediate colors.
   *   let interA = lerpColor(from, to, 0.33);
   *   let interB = lerpColor(from, to, 0.66);
   *
   *   // Draw the left rectangle.
   *   noStroke();
   *   fill(from);
   *   rect(10, 20, 20, 60);
   *
   *   // Draw the left-center rectangle.
   *   fill(interA);
   *   rect(30, 20, 20, 60);
   *
   *   // Draw the right-center rectangle.
   *   fill(interB);
   *   rect(50, 20, 20, 60);
   *
   *   // Draw the right rectangle.
   *   fill(to);
   *   rect(70, 20, 20, 60);
   *
   *   describe(
   *     'Four rectangles. From left to right, the rectangles are tan, brown, brownish purple, and purple.'
   *   );
   * }
   * </code>
   * </div>
   */
  fn.lerpColor = function(c1, c2, amt) {
    // p5._validateParameters('lerpColor', arguments);
    return c1.lerp(c2, amt, this._renderer.states.colorMode);
  };

  /**
   * Blends multiple colors to find a color between them.
   *
   * The `amt` parameter specifies the amount to interpolate between the color
   * stops which are colors at each `amt` value "location" with `amt` values
   * that are between 2 color stops interpolating between them based on its relative
   * distance to both.
   *
   * The way that colors are interpolated depends on the current
   * <a href="/reference/p5/colorMode/">colorMode()</a>.
   *
   * @method paletteLerp
   * @param {Array<[(p5.Color|String|Number|Number[]), Number]>} colors_stops color stops to interpolate from
   * @param {Number} amt number to use to interpolate relative to color stops
   * @return {p5.Color} interpolated color.
   *
   * @example
   * <div>
   * <code>
   * function setup() {
   *   createCanvas(400, 400);
   * }
   *
   * function draw() {
   *   // The background goes from white to red to green to blue fill
   *   background(paletteLerp([
   *     ['white', 0],
   *     ['red', 0.05],
   *     ['green', 0.25],
   *     ['blue', 1]
   *   ], millis() / 10000 % 1));
   * }
   * </code>
   * </div>
   */
  fn.paletteLerp = function(color_stops, amt) {
    const first_color_stop = color_stops[0];
    if (amt < first_color_stop[1])
      return this.color(first_color_stop[0]);

    for (let i = 1; i < color_stops.length; i++) {
      const color_stop = color_stops[i];
      if (amt < color_stop[1]) {
        const prev_color_stop = color_stops[i - 1];
        return this.lerpColor(
          this.color(prev_color_stop[0]),
          this.color(color_stop[0]),
          (amt - prev_color_stop[1]) / (color_stop[1] - prev_color_stop[1])
        );
      }
    }

    return this.color(color_stops[color_stops.length - 1][0]);
  };
}

if(typeof p5 !== 'undefined'){
  creatingReading(p5, p5.prototype);
}

export { Color as C, HSB as H, LAB as L, OKLAB as O, RGB as R, color as a, RGBHDR as b, creatingReading as c, HSL as d, HWB as e, LCH as f, OKLCH as g, RGBA as h };
