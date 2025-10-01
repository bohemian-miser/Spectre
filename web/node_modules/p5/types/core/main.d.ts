// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class p5 {
    constructor(sketch: any, node?: HTMLElement);

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
   * @param
   * @param
   */
  describe(text: string, display: FALLBACK | LABEL): void;

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
   * @param
   * @param
   * @param
   */
  describeElement(name: string, text: string, display: FALLBACK | LABEL): void;

  /**
   * Creates a screen reader-accessible description of shapes on the canvas.`textOutput()` adds a general description, list of shapes, and
   * table of shapes to the web page. The general description includes the
   * canvas size, canvas color, and number of shapes. For example,
   * `Your output is a, 100 by 100 pixels, gray canvas containing the following 2 shapes:`.A list of shapes follows the general description. The list describes the
   * color, location, and area of each shape. For example,
   * `a red circle at middle covering 3% of the canvas`. Each shape can be
   * selected to get more details.`textOutput()` uses its table of shapes as a list. The table describes the
   * shape, color, location, coordinates and area. For example,
   * `red circle location = middle area = 3%`. This is different from
   * gridOutput(), which uses its table as a grid.The `display` parameter is optional. It determines how the description is
   * displayed. If `LABEL` is passed, as in `textOutput(LABEL)`, the description
   * will be visible in a div element next to the canvas. Using `LABEL` creates
   * unhelpful duplicates for screen readers. Only use `LABEL` during
   * development. If `FALLBACK` is passed, as in `textOutput(FALLBACK)`, the
   * description will only be visible to screen readers. This is the default
   * mode.Read
   * Writing accessible canvas descriptions
   * to learn more about making sketches accessible.
 *
   * @param
   */
  textOutput(display: FALLBACK | LABEL): void;

  /**
   * Creates a screen reader-accessible description of shapes on the canvas.`gridOutput()` adds a general description, table of shapes, and list of
   * shapes to the web page. The general description includes the canvas size,
   * canvas color, and number of shapes. For example,
   * `gray canvas, 100 by 100 pixels, contains 2 shapes:  1 circle 1 square`.`gridOutput()` uses its table of shapes as a grid. Each shape in the grid
   * is placed in a cell whose row and column correspond to the shape's location
   * on the canvas. The grid cells describe the color and type of shape at that
   * location. For example, `red circle`. These descriptions can be selected
   * individually to get more details. This is different from
   * textOutput(), which uses its table as a list.A list of shapes follows the table. The list describes the color, type,
   * location, and area of each shape. For example,
   * `red circle, location = middle, area = 3 %`.The `display` parameter is optional. It determines how the description is
   * displayed. If `LABEL` is passed, as in `gridOutput(LABEL)`, the description
   * will be visible in a div element next to the canvas. Using `LABEL` creates
   * unhelpful duplicates for screen readers. Only use `LABEL` during
   * development. If `FALLBACK` is passed, as in `gridOutput(FALLBACK)`, the
   * description will only be visible to screen readers. This is the default
   * mode.Read
   * Writing accessible canvas descriptions
   * to learn more about making sketches accessible.
 *
   * @param
   */
  gridOutput(display: FALLBACK | LABEL): void;

  /**
   * Removes the sketch from the web page.Calling `remove()` stops the draw loop and removes any HTML elements
   * created by the sketch, including the canvas. A new sketch can be
   * created by using the p5() constructor, as in
   * `new p5()`.
   */
  remove(): void;

  /**
   * Removes the sketch from the web page.Calling `remove()` stops the draw loop and removes any HTML elements
   * created by the sketch, including the canvas. A new sketch can be
   * created by using the p5() constructor, as in
   * `new p5()`.
   */
  remove(): void;

  /**
   * Removes the sketch from the web page.Calling `remove()` stops the draw loop and removes any HTML elements
   * created by the sketch, including the canvas. A new sketch can be
   * created by using the p5() constructor, as in
   * `new p5()`.
   */
  remove(): void;

  /**
   * Creates a new sketch in "instance" mode.All p5.js sketches are instances of the `p5` class. Put another way, all
   * p5.js sketches are objects with methods including `pInst.setup()`,
   * `pInst.draw()`, `pInst.circle()`, and `pInst.fill()`. By default, sketches
   * run in "global mode" to hide some of this complexity.In global mode, a default instance of the `p5` class is created
   * automatically. The default `p5` instance searches the web page's source
   * code for declarations of system functions such as `setup()`, `draw()`,
   * and `mousePressed()`, then attaches those functions to itself as methods.
   * Calling a function such as `circle()` in global mode actually calls the
   * default `p5` object's `pInst.circle()` method.It's often helpful to isolate the code within sketches from the rest of the
   * code on a web page. Two common use cases are web pages that use other
   * JavaScript libraries and web pages with multiple sketches. "Instance mode"
   * makes it easy to support both of these scenarios.Instance mode sketches support the same API as global mode sketches. They
   * use a function to bundle, or encapsulate, an entire sketch. The function
   * containing the sketch is then passed to the `p5()` constructor.The first parameter, `sketch`, is a function that contains the sketch. For
   * example, the statement `new p5(mySketch)` would create a new instance mode
   * sketch from a function named `mySketch`. The function should have one
   * parameter, `p`, that's a `p5` object.The second parameter, `node`, is optional. If a string is passed, as in
   * `new p5(mySketch, 'sketch-one')` the new instance mode sketch will become a
   * child of the HTML element with the id `sketch-one`. If an HTML element is
   * passed, as in `new p5(mySketch, myElement)`, then the new instance mode
   * sketch will become a child of the `Element` object called `myElement`.
 *
   * @param
   * @param
   */
  p5(sketch: object, node: string | HTMLElement): void;

  /**
   * Removes the sketch from the web page.Calling `remove()` stops the draw loop and removes any HTML elements
   * created by the sketch, including the canvas. A new sketch can be
   * created by using the p5() constructor, as in
   * `new p5()`.
   */
  remove(): void;

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
   * @param
   * @param
   */
  color(gray: number, alpha: number): p5.Color;

  color(v1: number, v2: number, v3: number, alpha: number): p5.Color;

  color(value: string): p5.Color;

  color(values: number[]): p5.Color;

  color(color: p5.Color): p5.Color;

  /**
   * Gets the red value of a color.`red()` extracts the red value from a
   * p5.Color object, an array of color components, or
   * a CSS color string.By default, `red()` returns a color's red value in the range 0
   * to 255. If the colorMode() is set to RGB, it
   * returns the red value in the given range.
 *
   * @param
   */
  red(color: p5.Color | number[] | string): number;

  /**
   * Gets the green value of a color.`green()` extracts the green value from a
   * p5.Color object, an array of color components, or
   * a CSS color string.By default, `green()` returns a color's green value in the range 0
   * to 255. If the colorMode() is set to RGB, it
   * returns the green value in the given range.
 *
   * @param
   */
  green(color: p5.Color | number[] | string): number;

  /**
   * Gets the blue value of a color.`blue()` extracts the blue value from a
   * p5.Color object, an array of color components, or
   * a CSS color string.By default, `blue()` returns a color's blue value in the range 0
   * to 255. If the colorMode() is set to RGB, it
   * returns the blue value in the given range.
 *
   * @param
   */
  blue(color: p5.Color | number[] | string): number;

  /**
   * Gets the alpha (transparency) value of a color.`alpha()` extracts the alpha value from a
   * p5.Color object, an array of color components, or
   * a CSS color string.
 *
   * @param
   */
  alpha(color: p5.Color | number[] | string): number;

  /**
   * Gets the hue value of a color.`hue()` extracts the hue value from a
   * p5.Color object, an array of color components, or
   * a CSS color string.Hue describes a color's position on the color wheel. By default, `hue()`
   * returns a color's HSL hue in the range 0 to 360. If the
   * colorMode() is set to HSB or HSL, it returns the hue
   * value in the given mode.
 *
   * @param
   */
  hue(color: p5.Color | number[] | string): number;

  /**
   * Gets the saturation value of a color.`saturation()` extracts the saturation value from a
   * p5.Color object, an array of color components, or
   * a CSS color string.Saturation is scaled differently in HSB and HSL. By default, `saturation()`
   * returns a color's HSL saturation in the range 0 to 100. If the
   * colorMode() is set to HSB or HSL, it returns the
   * saturation value in the given mode.
 *
   * @param
   */
  saturation(color: p5.Color | number[] | string): number;

  /**
   * Gets the brightness value of a color.`brightness()` extracts the HSB brightness value from a
   * p5.Color object, an array of color components, or
   * a CSS color string.By default, `brightness()` returns a color's HSB brightness in the range 0
   * to 100. If the colorMode() is set to HSB, it
   * returns the brightness value in the given range.
 *
   * @param
   */
  brightness(color: p5.Color | number[] | string): number;

  /**
   * Gets the lightness value of a color.`lightness()` extracts the HSL lightness value from a
   * p5.Color object, an array of color components, or
   * a CSS color string.By default, `lightness()` returns a color's HSL lightness in the range 0
   * to 100. If the colorMode() is set to HSL, it
   * returns the lightness value in the given range.
 *
   * @param
   */
  lightness(color: p5.Color | number[] | string): number;

  /**
   * Blends two colors to find a third color between them.The `amt` parameter specifies the amount to interpolate between the two
   * values. 0 is equal to the first color, 0.1 is very near the first color,
   * 0.5 is halfway between the two colors, and so on. Negative numbers are set
   * to 0. Numbers greater than 1 are set to 1. This differs from the behavior of
   * lerp. It's necessary because numbers outside of the
   * interval [0, 1] will produce strange and unexpected colors.The way that colors are interpolated depends on the current
   * colorMode().
 *
   * @param
   * @param
   * @param
   */
  lerpColor(c1: p5.Color, c2: p5.Color, amt: number): p5.Color;

  /**
   * Blends multiple colors to find a color between them.The `amt` parameter specifies the amount to interpolate between the color
   * stops which are colors at each `amt` value "location" with `amt` values
   * that are between 2 color stops interpolating between them based on its relative
   * distance to both.The way that colors are interpolated depends on the current
   * colorMode().
 *
   * @param
   * @param
   */
  paletteLerp(colors_stops: [p5.Color | string | number | number[], number][], amt: number): p5.Color;

  /**
   * Starts defining a shape that will mask any shapes drawn afterward.Any shapes drawn between `beginClip()` and
   * endClip() will add to the mask shape. The mask
   * will apply to anything drawn after endClip().The parameter, `options`, is optional. If an object with an `invert`
   * property is passed, as in `beginClip({ invert: true })`, it will be used to
   * set the masking mode. `{ invert: true }` inverts the mask, creating holes
   * in shapes that are masked. `invert` is `false` by default.Masks can be contained between the
   * push() and pop() functions.
   * Doing so allows unmasked shapes to be drawn after masked shapes.Masks can also be defined in a callback function that's passed to
   * clip().
 *
   * @param
   */
  beginClip(options: object): void;

  /**
   * Ends defining a mask that was started with
   * beginClip().
   */
  endClip(): void;

  /**
   * Defines a shape that will mask any shapes drawn afterward.The first parameter, `callback`, is a function that defines the mask.
   * Any shapes drawn in  `callback` will add to the mask shape. The mask
   * will apply to anything drawn after `clip()` is called.The second parameter, `options`, is optional. If an object with an `invert`
   * property is passed, as in `beginClip({ invert: true })`, it will be used to
   * set the masking mode. `{ invert: true }` inverts the mask, creating holes
   * in shapes that are masked. `invert` is `false` by default.Masks can be contained between the
   * push() and pop() functions.
   * Doing so allows unmasked shapes to be drawn after masked shapes.Masks can also be defined with beginClip()
   * and endClip().
 *
   * @param
   * @param
   */
  clip(callback: Function, options: object): void;

  /**
   * Sets the color used for the background of the canvas.By default, the background is transparent. `background()` is typically used
   * within draw() to clear the display window at the
   * beginning of each frame. It can also be used inside
   * setup() to set the background on the first frame
   * of animation.The version of `background()` with one parameter interprets the value one
   * of four ways. If the parameter is a `Number`, it's interpreted as a grayscale
   * value. If the parameter is a `String`, it's interpreted as a CSS color string.
   * RGB, RGBA, HSL, HSLA, hex, and named color strings are supported. If the
   * parameter is a p5.Color object, it will be used as
   * the background color. If the parameter is a
   * p5.Image object, it will be used as the background
   * image.The version of `background()` with two parameters interprets the first one
   * as a grayscale value. The second parameter sets the alpha (transparency)
   * value.The version of `background()` with three parameters interprets them as RGB,
   * HSB, or HSL colors, depending on the current
   * colorMode(). By default, colors are specified
   * in RGB values. Calling `background(255, 204, 0)` sets the background a bright
   * yellow color.
 *
   * @param
   */
  background(color: p5.Color): void;

  background(colorstring: string, a: number): void;

  background(gray: number, a: number): void;

  background(v1: number, v2: number, v3: number, a: number): void;

  background(values: number[]): void;

  background(image: p5.Image, a: number): void;

  /**
   * Clears the pixels on the canvas.`clear()` makes every pixel 100% transparent. Calling `clear()` doesn't
   * clear objects created by `createX()` functions such as
   * createGraphics(),
   * createVideo(), and
   * createImg(). These objects will remain
   * unchanged after calling `clear()` and can be redrawn.In WebGL mode, this function can clear the screen to a specific color. It
   * interprets four numeric parameters as normalized RGBA color values. It also
   * clears the depth buffer. If you are not using the WebGL renderer, these
   * parameters will have no effect.
 *
   * @param
   * @param
   * @param
   * @param
   */
  clear(r: number, g: number, b: number, a: number): void;

  /**
   * Clears all data from the print stream.
   */
  clear(): void;

  /**
   * Changes the way color values are interpreted.By default, the `Number` parameters for fill(),
   * stroke(),
   * background(), and
   * color() are defined by values between 0 and 255
   * using the RGB color model. This is equivalent to calling
   * `colorMode(RGB, 255)`. Pure red is `color(255, 0, 0)` in this model.Calling `colorMode(RGB, 100)` sets colors to use RGB color values
   * between 0 and 100. Pure red is `color(100, 0, 0)` in this model.Calling `colorMode(HSB)` or `colorMode(HSL)` changes to HSB or HSL systems instead of RGB.
   * Pure red is `color(0, 100, 100)` in HSB and `color(0, 100, 50)` in HSL.Some additional color modes that p5.js supports are:`RGBHDR` - High Dynamic Range RGB defined within the Display P3 color space.
   * Colors are expressed with an extended dynamic range. To render these colors
   * accurately, you must use the HDR canvas.`HWB`    - Hue, Whiteness, Blackness.
   * Similar to HSB and HSL, this mode uses a hue angle.
   * Instead of saturation and lightness, HWB defines colors based on the percentage
   * of whiteness and blackness. This is the color model used by Chrome's GUI color picker.
   * Pure red in HWB is represented as `color(0, 0, 0)` (i.e., hue 0 with 0% whiteness and 0% blackness).`     <img src="assets/hwb.png"></img>``LAB`    - Also known as CIE Lab, this color mode defines colors with Lightness, Alpha, and Beta.
   * It is widely used in professional color measurement contexts due to its perceptual uniformity.`LCH`    - A more intuitive representation of the CIE Lab color space using Lightness, Chroma, and Hue.
   * This mode separates the color's chromatic intensity (chroma) from its lightness,
   * simplifying color selection and manipulation.`OKLAB`  - A variant of the CIE Lab color space that corrects for non-uniformities inherent in LAB.
   * The adjustment provides a more perceptually accurate and uniform representation,
   * which is particularly beneficial for smooth color transitions.`OKLCH`  - An easier-to-use representation of OKLAB, expressing colors in terms of Lightness, Chroma, and Hue.
   * This mode retains the perceptual benefits of OKLAB while offering a more intuitive format for color manipulation.p5.Color objects remember the mode that they were
   * created in. Changing modes doesn't affect their appearance.`Single-value (Grayscale) Colors`:When a color is specified with only one parameter (e.g., `color(g)`), p5.js will interpret it
   * as a grayscale color. However, how that single parameter translates into a grayscale value
   * depends on the color mode:
 *
   * @param
   * @param
   */
  colorMode(mode: RGB | HSB | HSL | RGBHDR | HWB | LAB | LCH | OKLAB | OKLCH, max: number): void;

  colorMode(mode: RGB | HSB | HSL | RGBHDR | HWB | LAB | LCH | OKLAB | OKLCH, max1: number, max2: number, max3: number, maxA: number): string;

  /**
   * Sets the color used to fill shapes.Calling `fill(255, 165, 0)` or `fill('orange')` means all shapes drawn
   * after the fill command will be filled with the color orange.The version of `fill()` with one parameter interprets the value one of
   * three ways. If the parameter is a `Number`, it's interpreted as a grayscale
   * value. If the parameter is a `String`, it's interpreted as a CSS color
   * string. A p5.Color object can also be provided to
   * set the fill color.The version of `fill()` with three parameters interprets them as RGB, HSB,
   * or HSL colors, depending on the current
   * colorMode(). The default color space is RGB,
   * with each value in the range from 0 to 255.
 *
   * @param
   * @param
   * @param
   * @param
   */
  fill(v1: number, v2: number, v3: number, alpha: number): void;

  fill(value: string): void;

  fill(gray: number, alpha: number): void;

  fill(values: number[]): void;

  fill(color: p5.Color): void;

  /**
   * Disables setting the fill color for shapes.Calling `noFill()` is the same as making the fill completely transparent,
   * as in `fill(0, 0)`. If both noStroke() and
   * `noFill()` are called, nothing will be drawn to the screen.
   */
  noFill(): void;

  /**
   * Disables drawing points, lines, and the outlines of shapes.Calling `noStroke()` is the same as making the stroke completely transparent,
   * as in `stroke(0, 0)`. If both `noStroke()` and
   * noFill() are called, nothing will be drawn to the
   * screen.
   */
  noStroke(): void;

  /**
   * Sets the color used to draw points, lines, and the outlines of shapes.Calling `stroke(255, 165, 0)` or `stroke('orange')` means all shapes drawn
   * after calling `stroke()` will be filled with the color orange. The way
   * these parameters are interpreted may be changed with the
   * colorMode() function.The version of `stroke()` with one parameter interprets the value one of
   * three ways. If the parameter is a `Number`, it's interpreted as a grayscale
   * value. If the parameter is a `String`, it's interpreted as a CSS color
   * string. A p5.Color object can also be provided to
   * set the stroke color.The version of `stroke()` with two parameters interprets the first one as a
   * grayscale value. The second parameter sets the alpha (transparency) value.The version of `stroke()` with three parameters interprets them as RGB, HSB,
   * or HSL colors, depending on the current `colorMode()`.The version of `stroke()` with four parameters interprets them as RGBA, HSBA,
   * or HSLA colors, depending on the current `colorMode()`. The last parameter
   * sets the alpha (transparency) value.
 *
   * @param
   * @param
   * @param
   * @param
   */
  stroke(v1: number, v2: number, v3: number, alpha: number): void;

  stroke(value: string): void;

  stroke(gray: number, alpha: number): void;

  stroke(values: number[]): void;

  stroke(color: p5.Color): void;

  /**
   * Starts using shapes to erase parts of the canvas.All drawing that follows `erase()` will subtract from the canvas, revealing
   * the web page underneath. The erased areas will become transparent, allowing
   * the content behind the canvas to show through. The
   * fill(), stroke(), and
   * blendMode() have no effect once `erase()` is
   * called.The `erase()` function has two optional parameters. The first parameter
   * sets the strength of erasing by the shape's interior. A value of 0 means
   * that no erasing will occur. A value of 255 means that the shape's interior
   * will fully erase the content underneath. The default value is 255
   * (full strength).The second parameter sets the strength of erasing by the shape's edge. A
   * value of 0 means that no erasing will occur. A value of 255 means that the
   * shape's edge will fully erase the content underneath. The default value is
   * 255 (full strength).To cancel the erasing effect, use the noErase()
   * function.`erase()` has no effect on drawing done with the
   * image() and
   * background() functions.
 *
   * @param
   * @param
   */
  erase(strengthFill: number, strengthStroke: number): void;

  /**
   * Ends erasing that was started with erase().The fill(), stroke(), and
   * blendMode() settings will return to what they
   * were prior to calling erase().
   */
  noErase(): void;

  /**
   * Sets the way colors blend when added to the canvas.By default, drawing with a solid color paints over the current pixel values
   * on the canvas. `blendMode()` offers many options for blending colors.Shapes, images, and text can be used as sources for drawing to the canvas.
   * A source pixel changes the color of the canvas pixel where it's drawn. The
   * final color results from blending the source pixel's color with the canvas
   * pixel's color. RGB color values from the source and canvas pixels are
   * compared, added, subtracted, multiplied, and divided to create different
   * effects. Red values with red values, greens with greens, and blues with
   * blues.The parameter, `mode`, sets the blend mode. For example, calling
   * `blendMode(ADD)` sets the blend mode to `ADD`. The following blend modes
   * are available in both 2D and WebGL mode:The following blend modes are only available in 2D mode:The following blend modes are only available in WebGL mode:
 *
   * @param
   */
  blendMode(mode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | REMOVE | SUBTRACT): void;

  /**
   * Displays text in the web browser's console.`print()` is helpful for printing values while debugging. Each call to
   * `print()` creates a new line of text.Note: Call `print('\n')` to print a blank line. Calling `print()` without
   * an argument opens the browser's dialog for printing documents.
 *
   * @param
   */
  print(contents: Any): void;

  /**
   * Writes data to the print stream with new lines added.The parameter, `data`, is the data to write. `data` can be a number or
   * string, as in `myWriter.print('hi')`, or an array of numbers and strings,
   * as in `myWriter.print([1, 2, 3])`. A comma will be inserted between array
   * array elements when they're added to the print stream.
 *
   * @param
   */
  print(data: string | number | Array): void;

  /**
   * Changes the cursor's appearance.The first parameter, `type`, sets the type of cursor to display. The
   * built-in options are `ARROW`, `CROSS`, `HAND`, `MOVE`, `TEXT`, and `WAIT`.
   * `cursor()` also recognizes standard CSS cursor properties passed as
   * strings: `'help'`, `'wait'`, `'crosshair'`, `'not-allowed'`, `'zoom-in'`,
   * and `'grab'`. If the path to an image is passed, as in
   * `cursor('assets/target.png')`, then the image will be used as the cursor.
   * Images must be in .cur, .gif, .jpg, .jpeg, or .png format and should be at most 32 by 32 pixels large.The parameters `x` and `y` are optional. If an image is used for the
   * cursor, `x` and `y` set the location pointed to within the image. They are
   * both 0 by default, so the cursor points to the image's top-left corner. `x`
   * and `y` must be less than the image's width and height, respectively.
 *
   * @param
   * @param
   * @param
   */
  cursor(type: ARROW | CROSS | HAND | MOVE | TEXT | WAIT | string, x: number, y: number): void;

  /**
   * Sets the number of frames to draw per second.Calling `frameRate()` with one numeric argument, as in `frameRate(30)`,
   * attempts to draw 30 frames per second (FPS). The target frame rate may not
   * be achieved depending on the sketch's processing needs. Most computers
   * default to a frame rate of 60 FPS. Frame rates of 24 FPS and above are
   * fast enough for smooth animations.Calling `frameRate()` without an argument returns the current frame rate.
   * The value returned is an approximation.
 *
   * @param
   */
  frameRate(fps: number): void;

  frameRate(): number;

  /**
   * Returns the target frame rate.The value is either the system frame rate or the last value passed to
   * frameRate().
   */
  getTargetFrameRate(): number;

  /**
   * Hides the cursor from view.
   */
  noCursor(): void;

  /**
   * A function that's called when the browser window is resized.Code placed in the body of `windowResized()` will run when the
   * browser window's size changes. It's a good place to call
   * resizeCanvas() or make other
   * adjustments to accommodate the new window size.The `event` parameter is optional. If added to the function declaration, it
   * can be used for debugging or other purposes.
 *
   * @param
   */
  windowResized(event: UIEvent): void;

  /**
   * Toggles full-screen mode or returns the current mode.Calling `fullscreen(true)` makes the sketch full-screen. Calling
   * `fullscreen(false)` makes the sketch its original size.Calling `fullscreen()` without an argument returns `true` if the sketch
   * is in full-screen mode and `false` if not.Note: Due to browser restrictions, `fullscreen()` can only be called with
   * user input such as a mouse press.
 *
   * @param
   */
  fullscreen(val: boolean): boolean;

  /**
   * Sets the pixel density or returns the current density.Computer displays are grids of little lights called pixels. A
   * display's pixel density describes how many pixels it packs into an
   * area. Displays with smaller pixels have a higher pixel density and create
   * sharper images.`pixelDensity()` sets the pixel scaling for high pixel density displays.
   * By default, the pixel density is set to match the display's density.
   * Calling `pixelDensity(1)` turn this off.Calling `pixelDensity()` without an argument returns the current pixel
   * density.
 *
   * @param
   */
  pixelDensity(val: number): void;

  pixelDensity(): number;

  /**
   * Returns the display's current pixel density.
   */
  displayDensity(): number;

  /**
   * Returns the sketch's current
   * URL
   * as a `String`.
   */
  getURL(): string;

  /**
   * Returns the current
   * URL
   * path as an `Array` of `String`s.For example, consider a sketch hosted at the URL
   * `https://example.com/sketchbook`. Calling `getURLPath()` returns
   * `['sketchbook']`. For a sketch hosted at the URL
   * `https://example.com/sketchbook/monday`, `getURLPath()` returns
   * `['sketchbook', 'monday']`.
   */
  getURLPath(): string[];

  /**
   * Returns the current
   * URL parameters
   * in an `Object`.For example, calling `getURLParams()` in a sketch hosted at the URL
   * `https://p5js.org?year=2014&month=May&day=15` returns
   * `{ year: 2014, month: 'May', day: 15 }`.
   */
  getURLParams(): object;

  /**
   * Converts 3D world coordinates to 2D screen coordinates.This function takes a 3D vector and converts its coordinates
   * from the world space to screen space. This can be useful for placing
   * 2D elements in a 3D scene or for determining the screen position
   * of 3D objects.
 *
   * @param
   * @param
   * @param
   */
  worldToScreen(x: number | p5.Vector, y: number, z: number): p5.Vector;

  /**
   * Converts 2D screen coordinates to 3D world coordinates.This function takes a vector and converts its coordinates from coordinates
   * on the screen to coordinates in the currently drawn object. This can be
   * useful for determining the mouse position relative to a 2D or 3D object.If given, the Z component of the input coordinates is treated as "depth",
   * or distance from the camera.
 *
   * @param
   * @param
   * @param
   */
  screenToWorld(x: number | p5.Vector, y: number, z: number): p5.Vector;

  /**
   * This is a helper function that generates Zod schemas for a function based on
   * the parameter data from `docs/parameterData.json`.Example parameter data for function `background`:
   * "background": {
   * "overloads": [
   * ["p5.Color"],
   * ["String", "Number?"],
   * ["Number", "Number?"],
   * ["Number", "Number", "Number", "Number?"],
   * ["Number[]"],
   * ["p5.Image", "Number?"]
   * ]
   * }
   * Where each array in `overloads` represents a set of valid overloaded
   * parameters, and `?` is a shorthand for `Optional`.
 *
   * @param
   */
  generateZodSchemasForFunc(func: string): z.ZodSchema;

  /**
   * A function that's called once when the sketch begins running.Declaring the function `setup()` sets a code block to run once
   * automatically when the sketch starts running. It's used to perform
   * setup tasks such as creating the canvas and initializing variables:`function setup() {
   * // Code to run once at the start of the sketch.
   * }`Code placed in `setup()` will run once before code placed in
   * draw() begins looping.
   * If `setup()` is declared `async` (e.g. `async function setup()`),
   * execution pauses at each `await` until its promise resolves.
   * For example, `font = await loadFont(...)` waits for the font asset
   * to load because `loadFont()` function returns a promise, and the await
   * keyword means the program will wait for the promise to resolve.
   * This ensures that all assets are fully loaded before the sketch continues.loading assets.Note: `setup()` doesn’t have to be declared, but it’s common practice to do so.
   */
  setup(): void;

  /**
   * A function that's called repeatedly while the sketch runs.Declaring the function `draw()` sets a code block to run repeatedly
   * once the sketch starts. It’s used to create animations and respond to
   * user inputs:`function draw() {
   * // Code to run repeatedly.
   * }`This is often called the "draw loop" because p5.js calls the code in
   * `draw()` in a loop behind the scenes. By default, `draw()` tries to run
   * 60 times per second. The actual rate depends on many factors. The
   * drawing rate, called the "frame rate", can be controlled by calling
   * frameRate(). The number of times `draw()`
   * has run is stored in the system variable
   * frameCount().Code placed within `draw()` begins looping after
   * setup() runs. `draw()` will run until the user
   * closes the sketch. `draw()` can be stopped by calling the
   * noLoop() function. `draw()` can be resumed by
   * calling the loop() function.
   */
  draw(): void;

  /**
   * Creates a canvas element on the web page.`createCanvas()` creates the main drawing canvas for a sketch. It should
   * only be called once at the beginning of setup().
   * Calling `createCanvas()` more than once causes unpredictable behavior.The first two parameters, `width` and `height`, are optional. They set the
   * dimensions of the canvas and the values of the
   * width and height system
   * variables. For example, calling `createCanvas(900, 500)` creates a canvas
   * that's 900×500 pixels. By default, `width` and `height` are both 100.The third parameter is also optional. If either of the constants `P2D` or
   * `WEBGL` is passed, as in `createCanvas(900, 500, WEBGL)`, then it will set
   * the sketch's rendering mode. If an existing
   * HTMLCanvasElement
   * is passed, as in `createCanvas(900, 500, myCanvas)`, then it will be used
   * by the sketch.The fourth parameter is also optional. If an existing
   * HTMLCanvasElement
   * is passed, as in `createCanvas(900, 500, WEBGL, myCanvas)`, then it will be
   * used by the sketch.Note: In WebGL mode, the canvas will use a WebGL2 context if it's supported
   * by the browser. Check the webglVersion
   * system variable to check what version is being used, or call
   * `setAttributes({ version: 1 })` to create a WebGL1 context.
 *
   * @param
   * @param
   * @param
   * @param
   */
  createCanvas(width: number, height: number, renderer: P2D | WEBGL | P2DHDR, canvas: HTMLCanvasElement): p5.Renderer;

  createCanvas(width: number, height: number, canvas: HTMLCanvasElement): p5.Renderer;

  /**
   * Resizes the canvas to a given width and height.`resizeCanvas()` immediately clears the canvas and calls
   * redraw(). It's common to call `resizeCanvas()`
   * within the body of windowResized() like
   * so:`function windowResized() {
   * resizeCanvas(windowWidth, windowHeight);
   * }`The first two parameters, `width` and `height`, set the dimensions of the
   * canvas. They also the values of the width and
   * height system variables. For example, calling
   * `resizeCanvas(300, 500)` resizes the canvas to 300×500 pixels, then sets
   * width to 300 and
   * height 500.The third parameter, `noRedraw`, is optional. If `true` is passed, as in
   * `resizeCanvas(300, 500, true)`, then the canvas will be canvas to 300×500
   * pixels but the redraw() function won't be called
   * immediately. By default, redraw() is called
   * immediately when `resizeCanvas()` finishes executing.
 *
   * @param
   * @param
   * @param
   */
  resizeCanvas(width: number, height: number, noRedraw: boolean): void;

  /**
   * Removes the default canvas.By default, a 100×100 pixels canvas is created without needing to call
   * createCanvas(). `noCanvas()` removes the
   * default canvas for sketches that don't need it.
   */
  noCanvas(): void;

  /**
   * Creates a p5.Graphics object.`createGraphics()` creates an offscreen drawing canvas (graphics buffer)
   * and returns it as a p5.Graphics object. Drawing
   * to a separate graphics buffer can be helpful for performance and for
   * organizing code.The first two parameters, `width` and `height`, are optional. They set the
   * dimensions of the p5.Graphics object. For
   * example, calling `createGraphics(900, 500)` creates a graphics buffer
   * that's 900×500 pixels.The third parameter is also optional. If either of the constants `P2D` or
   * `WEBGL` is passed, as in `createGraphics(900, 500, WEBGL)`, then it will set
   * the p5.Graphics object's rendering mode. If an
   * existing
   * HTMLCanvasElement
   * is passed, as in `createGraphics(900, 500, myCanvas)`, then it will be used
   * by the graphics buffer.The fourth parameter is also optional. If an existing
   * HTMLCanvasElement
   * is passed, as in `createGraphics(900, 500, WEBGL, myCanvas)`, then it will be
   * used by the graphics buffer.Note: In WebGL mode, the p5.Graphics object
   * will use a WebGL2 context if it's supported by the browser. Check the
   * webglVersion system variable to check what
   * version is being used, or call `setAttributes({ version: 1 })` to create a
   * WebGL1 context.
 *
   * @param
   * @param
   * @param
   * @param
   */
  createGraphics(width: number, height: number, renderer: P2D | WEBGL, canvas: HTMLCanvasElement): p5.Graphics;

  createGraphics(width: number, height: number, canvas: HTMLCanvasElement): p5.Graphics;

  /**
   * Creates and a new p5.Framebuffer object.p5.Framebuffer objects are separate drawing
   * surfaces that can be used as textures in WebGL mode. They're similar to
   * p5.Graphics objects and generally run much
   * faster when used as textures.The parameter, `options`, is optional. An object can be passed to configure
   * the p5.Framebuffer object. The available
   * properties are:If the `width`, `height`, or `density` attributes are set, they won't automatically match the main canvas and must be changed manually.Note: `createFramebuffer()` can only be used in WebGL mode.
 *
   * @param
   */
  createFramebuffer(options: object): p5.Framebuffer;

  /**
   * Clears the depth buffer in WebGL mode.`clearDepth()` clears information about how far objects are from the camera
   * in 3D space. This information is stored in an object called the
   * . Clearing the depth buffer ensures new objects aren't drawn
   * behind old ones. Doing so can be useful for feedback effects in which the
   * previous frame serves as the background for the current frame.The parameter, `depth`, is optional. If a number is passed, as in
   * `clearDepth(0.5)`, it determines the range of objects to clear from the
   * depth buffer. 0 doesn't clear any depth information, 0.5 clears depth
   * information halfway between the near and far clipping planes, and 1 clears
   * depth information all the way to the far clipping plane. By default,
   * `depth` is 1.Note: `clearDepth()` can only be used in WebGL mode.
 *
   * @param
   */
  clearDepth(depth: number): void;

  /**
   * Stops the code in draw() from running repeatedly.By default, draw() tries to run 60 times per
   * second. Calling `noLoop()` stops draw() from
   * repeating. The draw loop can be restarted by calling
   * loop(). draw() can be run
   * once by calling redraw().The isLooping() function can be used to check
   * whether a sketch is looping, as in `isLooping() === true`.
   */
  noLoop(): void;

  /**
   * Resumes the draw loop after noLoop() has been
   * called.By default, draw() tries to run 60 times per
   * second. Calling noLoop() stops
   * draw() from repeating. The draw loop can be
   * restarted by calling `loop()`.The isLooping() function can be used to check
   * whether a sketch is looping, as in `isLooping() === true`.
   */
  loop(): void;

  /**
   * Returns `true` if the draw loop is running and `false` if not.By default, draw() tries to run 60 times per
   * second. Calling noLoop() stops
   * draw() from repeating. The draw loop can be
   * restarted by calling loop().The `isLooping()` function can be used to check whether a sketch is
   * looping, as in `isLooping() === true`.
   */
  isLooping(): boolean;

  /**
   * Runs the code in draw() once.By default, draw() tries to run 60 times per
   * second. Calling noLoop() stops
   * draw() from repeating. Calling `redraw()` will
   * execute the code in the draw() function a set
   * number of times.The parameter, `n`, is optional. If a number is passed, as in `redraw(5)`,
   * then the draw loop will run the given number of times. By default, `n` is
   * 1.
 *
   * @param
   */
  redraw(n: number): void;

  /**
   * Applies a transformation matrix to the coordinate system.Transformations such as
   * translate(),
   * rotate(), and
   * scale()
   * use matrix-vector multiplication behind the scenes. A table of numbers,
   * called a matrix, encodes each transformation. The values in the matrix
   * then multiply each point on the canvas, which is represented by a vector.`applyMatrix()` allows for many transformations to be applied at once. See
   * Wikipedia
   * and MDN
   * for more details about transformations.There are two ways to call `applyMatrix()` in two and three dimensions.In 2D mode, the parameters `a`, `b`, `c`, `d`, `e`, and `f`, correspond to
   * elements in the following transformation matrix:The numbers can be passed individually, as in
   * `applyMatrix(2, 0, 0, 0, 2, 0)`. They can also be passed in an array, as in
   * `applyMatrix([2, 0, 0, 0, 2, 0])`.In 3D mode, the parameters `a`, `b`, `c`, `d`, `e`, `f`, `g`, `h`, `i`,
   * `j`, `k`, `l`, `m`, `n`, `o`, and `p` correspond to elements in the
   * following transformation matrix:The numbers can be passed individually, as in
   * `applyMatrix(2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1)`. They can
   * also be passed in an array, as in
   * `applyMatrix([2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1])`.By default, transformations accumulate. The
   * push() and pop() functions
   * can be used to isolate transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `applyMatrix()` inside the draw() function won't
   * cause shapes to transform continuously.
 *
   * @param
   */
  applyMatrix(arr: Array): void;

  applyMatrix(a: number, b: number, c: number, d: number, e: number, f: number): void;

  applyMatrix(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number): void;

  /**
   * Clears all transformations applied to the coordinate system.
   */
  resetMatrix(): void;

  /**
   * Rotates the coordinate system.By default, the positive x-axis points to the right and the positive y-axis
   * points downward. The `rotate()` function changes this orientation by
   * rotating the coordinate system about the origin. Everything drawn after
   * `rotate()` is called will appear to be rotated.The first parameter, `angle`, is the amount to rotate. For example, calling
   * `rotate(1)` rotates the coordinate system clockwise 1 radian which is
   * nearly 57˚. `rotate()` interprets angle values using the current
   * angleMode().The second parameter, `axis`, is optional. It's used to orient 3D rotations
   * in WebGL mode. If a p5.Vector is passed, as in
   * `rotate(QUARTER_PI, myVector)`, then the coordinate system will rotate
   * `QUARTER_PI` radians about `myVector`. If an array of vector components is
   * passed, as in `rotate(QUARTER_PI, [1, 0, 0])`, then the coordinate system
   * will rotate `QUARTER_PI` radians about a vector with the components
   * `[1, 0, 0]`.By default, transformations accumulate. For example, calling `rotate(1)`
   * twice has the same effect as calling `rotate(2)` once. The
   * push() and pop() functions
   * can be used to isolate transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `rotate(1)` inside the draw() function won't cause
   * shapes to spin.
 *
   * @param
   * @param
   */
  rotate(angle: number, axis: p5.Vector | number[]): void;

  /**
   * Rotates the coordinate system about the x-axis in WebGL mode.The parameter, `angle`, is the amount to rotate. For example, calling
   * `rotateX(1)` rotates the coordinate system about the x-axis by 1 radian.
   * `rotateX()` interprets angle values using the current
   * angleMode().By default, transformations accumulate. For example, calling `rotateX(1)`
   * twice has the same effect as calling `rotateX(2)` once. The
   * push() and pop() functions
   * can be used to isolate transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `rotateX(1)` inside the draw() function won't cause
   * shapes to spin.
 *
   * @param
   */
  rotateX(angle: number): void;

  /**
   * Rotates the coordinate system about the y-axis in WebGL mode.The parameter, `angle`, is the amount to rotate. For example, calling
   * `rotateY(1)` rotates the coordinate system about the y-axis by 1 radian.
   * `rotateY()` interprets angle values using the current
   * angleMode().By default, transformations accumulate. For example, calling `rotateY(1)`
   * twice has the same effect as calling `rotateY(2)` once. The
   * push() and pop() functions
   * can be used to isolate transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `rotateY(1)` inside the draw() function won't cause
   * shapes to spin.
 *
   * @param
   */
  rotateY(angle: number): void;

  /**
   * Rotates the coordinate system about the z-axis in WebGL mode.The parameter, `angle`, is the amount to rotate. For example, calling
   * `rotateZ(1)` rotates the coordinate system about the z-axis by 1 radian.
   * `rotateZ()` interprets angle values using the current
   * angleMode().By default, transformations accumulate. For example, calling `rotateZ(1)`
   * twice has the same effect as calling `rotateZ(2)` once. The
   * push() and pop() functions
   * can be used to isolate transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `rotateZ(1)` inside the draw() function won't cause
   * shapes to spin.
 *
   * @param
   */
  rotateZ(angle: number): void;

  /**
   * Scales the coordinate system.By default, shapes are drawn at their original scale. A rectangle that's 50
   * pixels wide appears to take up half the width of a 100 pixel-wide canvas.
   * The `scale()` function can shrink or stretch the coordinate system so that
   * shapes appear at different sizes. There are two ways to call `scale()` with
   * parameters that set the scale factor(s).The first way to call `scale()` uses numbers to set the amount of scaling.
   * The first parameter, `s`, sets the amount to scale each axis. For example,
   * calling `scale(2)` stretches the x-, y-, and z-axes by a factor of 2. The
   * next two parameters, `y` and `z`, are optional. They set the amount to
   * scale the y- and z-axes. For example, calling `scale(2, 0.5, 1)` stretches
   * the x-axis by a factor of 2, shrinks the y-axis by a factor of 0.5, and
   * leaves the z-axis unchanged.The second way to call `scale()` uses a p5.Vector
   * object to set the scale factors. For example, calling `scale(myVector)`
   * uses the x-, y-, and z-components of `myVector` to set the amount of
   * scaling along the x-, y-, and z-axes. Doing so is the same as calling
   * `scale(myVector.x, myVector.y, myVector.z)`.By default, transformations accumulate. For example, calling `scale(1)`
   * twice has the same effect as calling `scale(2)` once. The
   * push() and pop() functions
   * can be used to isolate transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `scale(2)` inside the draw() function won't cause
   * shapes to grow continuously.
 *
   * @param
   * @param
   * @param
   */
  scale(s: number | p5.Vector | number[], y: number, z: number): void;

  scale(scales: p5.Vector | number[]): void;

  /**
   * Shears the x-axis so that shapes appear skewed.By default, the x- and y-axes are perpendicular. The `shearX()` function
   * transforms the coordinate system so that x-coordinates are translated while
   * y-coordinates are fixed.The first parameter, `angle`, is the amount to shear. For example, calling
   * `shearX(1)` transforms all x-coordinates using the formula
   * `x = x + y * tan(angle)`. `shearX()` interprets angle values using the
   * current angleMode().By default, transformations accumulate. For example, calling
   * `shearX(1)` twice has the same effect as calling `shearX(2)` once. The
   * push() and
   * pop() functions can be used to isolate
   * transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `shearX(1)` inside the draw() function won't
   * cause shapes to shear continuously.
 *
   * @param
   */
  shearX(angle: number): void;

  /**
   * Shears the y-axis so that shapes appear skewed.By default, the x- and y-axes are perpendicular. The `shearY()` function
   * transforms the coordinate system so that y-coordinates are translated while
   * x-coordinates are fixed.The first parameter, `angle`, is the amount to shear. For example, calling
   * `shearY(1)` transforms all y-coordinates using the formula
   * `y = y + x * tan(angle)`. `shearY()` interprets angle values using the
   * current angleMode().By default, transformations accumulate. For example, calling
   * `shearY(1)` twice has the same effect as calling `shearY(2)` once. The
   * push() and
   * pop() functions can be used to isolate
   * transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `shearY(1)` inside the draw() function won't
   * cause shapes to shear continuously.
 *
   * @param
   */
  shearY(angle: number): void;

  /**
   * Translates the coordinate system.By default, the origin `(0, 0)` is at the sketch's top-left corner in 2D
   * mode and center in WebGL mode. The `translate()` function shifts the origin
   * to a different position. Everything drawn after `translate()` is called
   * will appear to be shifted. There are two ways to call `translate()` with
   * parameters that set the origin's position.The first way to call `translate()` uses numbers to set the amount of
   * translation. The first two parameters, `x` and `y`, set the amount to
   * translate along the positive x- and y-axes. For example, calling
   * `translate(20, 30)` translates the origin 20 pixels along the x-axis and 30
   * pixels along the y-axis. The third parameter, `z`, is optional. It sets the
   * amount to translate along the positive z-axis. For example, calling
   * `translate(20, 30, 40)` translates the origin 20 pixels along the x-axis,
   * 30 pixels along the y-axis, and 40 pixels along the z-axis.The second way to call `translate()` uses a
   * p5.Vector object to set the amount of
   * translation. For example, calling `translate(myVector)` uses the x-, y-,
   * and z-components of `myVector` to set the amount to translate along the x-,
   * y-, and z-axes. Doing so is the same as calling
   * `translate(myVector.x, myVector.y, myVector.z)`.By default, transformations accumulate. For example, calling
   * `translate(10, 0)` twice has the same effect as calling
   * `translate(20, 0)` once. The push() and
   * pop() functions can be used to isolate
   * transformations within distinct drawing groups.Note: Transformations are reset at the beginning of the draw loop. Calling
   * `translate(10, 0)` inside the draw() function won't
   * cause shapes to move continuously.
 *
   * @param
   * @param
   * @param
   */
  translate(x: number, y: number, z: number): void;

  translate(vector: p5.Vector): void;

  /**
   * Begins a drawing group that contains its own styles and transformations.By default, styles such as fill() and
   * transformations such as rotate() are applied to
   * all drawing that follows. The `push()` and pop()
   * functions can limit the effect of styles and transformations to a specific
   * group of shapes, images, and text. For example, a group of shapes could be
   * translated to follow the mouse without affecting the rest of the sketch:`// Begin the drawing group.
   * push();
   * 
   * // Translate the origin to the mouse's position.
   * translate(mouseX, mouseY);
   * 
   * // Style the face.
   * noStroke();
   * fill('green');
   * 
   * // Draw the face.
   * circle(0, 0, 60);
   * 
   * // Style the eyes.
   * fill('white');
   * 
   * // Draw the left eye.
   * ellipse(-20, -20, 30, 20);
   * 
   * // Draw the right eye.
   * ellipse(20, -20, 30, 20);
   * 
   * // End the drawing group.
   * pop();
   * 
   * // Draw a bug.
   * let x = random(0, 100);
   * let y = random(0, 100);
   * text('🦟', x, y);`In the code snippet above, the bug's position isn't affected by
   * `translate(mouseX, mouseY)` because that transformation is contained
   * between `push()` and pop(). The bug moves around
   * the entire canvas as expected.Note: `push()` and pop() are always called as a
   * pair. Both functions are required to begin and end a drawing group.`push()` and pop() can also be nested to create
   * subgroups. For example, the code snippet above could be changed to give
   * more detail to the frog’s eyes:`// Begin the drawing group.
   * push();
   * 
   * // Translate the origin to the mouse's position.
   * translate(mouseX, mouseY);
   * 
   * // Style the face.
   * noStroke();
   * fill('green');
   * 
   * // Draw a face.
   * circle(0, 0, 60);
   * 
   * // Style the eyes.
   * fill('white');
   * 
   * // Draw the left eye.
   * push();
   * translate(-20, -20);
   * ellipse(0, 0, 30, 20);
   * fill('black');
   * circle(0, 0, 8);
   * pop();
   * 
   * // Draw the right eye.
   * push();
   * translate(20, -20);
   * ellipse(0, 0, 30, 20);
   * fill('black');
   * circle(0, 0, 8);
   * pop();
   * 
   * // End the drawing group.
   * pop();
   * 
   * // Draw a bug.
   * let x = random(0, 100);
   * let y = random(0, 100);
   * text('🦟', x, y);`In this version, the code to draw each eye is contained between its own
   * `push()` and pop() functions. Doing so makes it
   * easier to add details in the correct part of a drawing.`push()` and pop() contain the effects of the
   * following functions:In WebGL mode, `push()` and pop() contain the
   * effects of a few additional styles:
   */
  push(): void;

  push(xs: number[], ys: number[], v: object): void;

  /**
   * Ends a drawing group that contains its own styles and transformations.By default, styles such as fill() and
   * transformations such as rotate() are applied to
   * all drawing that follows. The push() and `pop()`
   * functions can limit the effect of styles and transformations to a specific
   * group of shapes, images, and text. For example, a group of shapes could be
   * translated to follow the mouse without affecting the rest of the sketch:`// Begin the drawing group.
   * push();
   * 
   * // Translate the origin to the mouse's position.
   * translate(mouseX, mouseY);
   * 
   * // Style the face.
   * noStroke();
   * fill('green');
   * 
   * // Draw the face.
   * circle(0, 0, 60);
   * 
   * // Style the eyes.
   * fill('white');
   * 
   * // Draw the left eye.
   * ellipse(-20, -20, 30, 20);
   * 
   * // Draw the right eye.
   * ellipse(20, -20, 30, 20);
   * 
   * // End the drawing group.
   * pop();
   * 
   * // Draw a bug.
   * let x = random(0, 100);
   * let y = random(0, 100);
   * text('🦟', x, y);`In the code snippet above, the bug's position isn't affected by
   * `translate(mouseX, mouseY)` because that transformation is contained
   * between push() and `pop()`. The bug moves around
   * the entire canvas as expected.Note: push() and `pop()` are always called as a
   * pair. Both functions are required to begin and end a drawing group.push() and `pop()` can also be nested to create
   * subgroups. For example, the code snippet above could be changed to give
   * more detail to the frog’s eyes:`// Begin the drawing group.
   * push();
   * 
   * // Translate the origin to the mouse's position.
   * translate(mouseX, mouseY);
   * 
   * // Style the face.
   * noStroke();
   * fill('green');
   * 
   * // Draw a face.
   * circle(0, 0, 60);
   * 
   * // Style the eyes.
   * fill('white');
   * 
   * // Draw the left eye.
   * push();
   * translate(-20, -20);
   * ellipse(0, 0, 30, 20);
   * fill('black');
   * circle(0, 0, 8);
   * pop();
   * 
   * // Draw the right eye.
   * push();
   * translate(20, -20);
   * ellipse(0, 0, 30, 20);
   * fill('black');
   * circle(0, 0, 8);
   * pop();
   * 
   * // End the drawing group.
   * pop();
   * 
   * // Draw a bug.
   * let x = random(0, 100);
   * let y = random(0, 100);
   * text('🦟', x, y);`In this version, the code to draw each eye is contained between its own
   * push() and `pop()` functions. Doing so makes it
   * easier to add details in the correct part of a drawing.push() and `pop()` contain the effects of the
   * following functions:In WebGL mode, push() and `pop()` contain the
   * effects of a few additional styles:
   */
  pop(): void;

  /**
   * Stores a value in the web browser's local storage.Web browsers can save small amounts of data using the built-in
   * localStorage object.
   * Data stored in `localStorage` can be retrieved at any point, even after
   * refreshing a page or restarting the browser. Data are stored as key-value
   * pairs.`storeItem()` makes it easy to store values in `localStorage` and
   * getItem() makes it easy to retrieve them.The first parameter, `key`, is the name of the value to be stored as a
   * string.The second parameter, `value`, is the value to be stored. Values can have
   * any type.Note: Sensitive data such as passwords or personal information shouldn't be
   * stored in `localStorage`.
 *
   * @param
   * @param
   */
  storeItem(key: string, value: string | number | boolean | object | Array): void;

  /**
   * Returns a value in the web browser's local storage.Web browsers can save small amounts of data using the built-in
   * localStorage object.
   * Data stored in `localStorage` can be retrieved at any point, even after
   * refreshing a page or restarting the browser. Data are stored as key-value
   * pairs.storeItem() makes it easy to store values in
   * `localStorage` and `getItem()` makes it easy to retrieve them.The first parameter, `key`, is the name of the value to be stored as a
   * string.The second parameter, `value`, is the value to be retrieved a string. For
   * example, calling `getItem('size')` retrieves the value with the key `size`.Note: Sensitive data such as passwords or personal information shouldn't be
   * stored in `localStorage`.
 *
   * @param
   */
  getItem(key: string): string | number | boolean | object | Array;

  /**
   * Removes all items in the web browser's local storage.Web browsers can save small amounts of data using the built-in
   * localStorage object.
   * Data stored in `localStorage` can be retrieved at any point, even after
   * refreshing a page or restarting the browser. Data are stored as key-value
   * pairs. Calling `clearStorage()` removes all data from `localStorage`.Note: Sensitive data such as passwords or personal information shouldn't be
   * stored in `localStorage`.
   */
  clearStorage(): void;

  /**
   * Removes an item from the web browser's local storage.Web browsers can save small amounts of data using the built-in
   * localStorage object.
   * Data stored in `localStorage` can be retrieved at any point, even after
   * refreshing a page or restarting the browser. Data are stored as key-value
   * pairs.storeItem() makes it easy to store values in
   * `localStorage` and `removeItem()` makes it easy to delete them.The parameter, `key`, is the name of the value to remove as a string. For
   * example, calling `removeItem('size')` removes the item with the key `size`.Note: Sensitive data such as passwords or personal information shouldn't be
   * stored in `localStorage`.
 *
   * @param
   */
  removeItem(key: string): void;

  /**
   * Searches the page for the first element that matches the given
   * CSS selector string.The selector string can be an ID, class, tag name, or a combination.
   * `select()` returns a p5.Element object if it
   * finds a match and `null` if not.The second parameter, `container`, is optional. It specifies a container to
   * search within. `container` can be CSS selector string, a
   * p5.Element object, or an
   * HTMLElement object.
 *
   * @param
   * @param
   */
  select(selectors: string, container: string | p5.Element | HTMLElement): p5.Element | any;

  /**
   * Searches the page for all elements that matches the given
   * CSS selector string.The selector string can be an ID, class, tag name, or a combination.
   * `selectAll()` returns an array of p5.Element
   * objects if it finds any matches and an empty array if none are found.The second parameter, `container`, is optional. It specifies a container to
   * search within. `container` can be CSS selector string, a
   * p5.Element object, or an
   * HTMLElement object.
 *
   * @param
   * @param
   */
  selectAll(selectors: string, container: string | p5.Element | HTMLElement): p5.Element[];

  /**
   * Creates a new p5.Element object.The first parameter, `tag`, is a string an HTML tag such as `'h5'`.The second parameter, `content`, is optional. It's a string that sets the
   * HTML content to insert into the new element. New elements have no content
   * by default.
 *
   * @param
   * @param
   */
  createElement(tag: string, content: string): p5.Element;

  /**
   * Removes all elements created by p5.js, including any event handlers.There are two exceptions:
   * canvas elements created by createCanvas()
   * and p5.Render objects created by
   * createGraphics().
   */
  removeElements(): void;

  /**
   * Helpers for create methods.
 *
   * @param
   * @param
   * @param
   */
  addElement(elt: any, pInst: any, media: any): void;

  /**
   * Helpers for create methods.
 *
   * @param
   * @param
   * @param
   */
  addElement(elt: any, pInst: any, media: any): void;

  /**
   * Creates a `&lt;div&gt;&lt;/div&gt;` element.`&lt;div&gt;&lt;/div&gt;` elements are commonly used as containers for
   * other elements.The parameter `html` is optional. It accepts a string that sets the
   * inner HTML of the new `&lt;div&gt;&lt;/div&gt;`.
 *
   * @param
   */
  createDiv(html: string): p5.Element;

  /**
   * Creates a paragraph element.`&lt;p&gt;&lt;/p&gt;` elements are commonly used for paragraph-length text.The parameter `html` is optional. It accepts a string that sets the
   * inner HTML of the new `&lt;p&gt;&lt;/p&gt;`.
 *
   * @param
   */
  createP(html: string): p5.Element;

  /**
   * Creates a `&lt;span&gt;&lt;/span&gt;` element.`&lt;span&gt;&lt;/span&gt;` elements are commonly used as containers
   * for inline elements. For example, a `&lt;span&gt;&lt;/span&gt;`
   * can hold part of a sentence that's a
   * different style.The parameter `html` is optional. It accepts a string that sets the
   * inner HTML of the new `&lt;span&gt;&lt;/span&gt;`.
 *
   * @param
   */
  createSpan(html: string): p5.Element;

  /**
   * Creates an `&lt;img&gt;` element that can appear outside of the canvas.The first parameter, `src`, is a string with the path to the image file.
   * `src` should be a relative path, as in `'assets/image.png'`, or a URL, as
   * in `'https://example.com/image.png'`.The second parameter, `alt`, is a string with the
   * alternate text
   * for the image. An empty string `''` can be used for images that aren't displayed.The third parameter, `crossOrigin`, is optional. It's a string that sets the
   * crossOrigin property
   * of the image. Use `'anonymous'` or `'use-credentials'` to fetch the image
   * with cross-origin access.The fourth parameter, `callback`, is also optional. It sets a function to
   * call after the image loads. The new image is passed to the callback
   * function as a p5.Element object.
 *
   * @param
   * @param
   */
  createImg(src: string, alt: string): p5.Element;

  createImg(src: string, alt: string, crossOrigin: string, successCallback: Function): p5.Element;

  /**
   * Creates an `&lt;a&gt;&lt;/a&gt;` element that links to another web page.The first parmeter, `href`, is a string that sets the URL of the linked
   * page.The second parameter, `html`, is a string that sets the inner HTML of the
   * link. It's common to use text, images, or buttons as links.The third parameter, `target`, is optional. It's a string that tells the
   * web browser where to open the link. By default, links open in the current
   * browser tab. Passing `'_blank'` will cause the link to open in a new
   * browser tab. MDN describes a few
   * other options.
 *
   * @param
   * @param
   * @param
   */
  createA(href: string, html: string, target: string): p5.Element;

  /**
   * Creates a slider `&lt;input&gt;&lt;/input&gt;` element.Range sliders are useful for quickly selecting numbers from a given range.The first two parameters, `min` and `max`, are numbers that set the
   * slider's minimum and maximum.The third parameter, `value`, is optional. It's a number that sets the
   * slider's default value.The fourth parameter, `step`, is also optional. It's a number that sets the
   * spacing between each value in the slider's range. Setting `step` to 0
   * allows the slider to move smoothly from `min` to `max`.
 *
   * @param
   * @param
   * @param
   * @param
   */
  createSlider(min: number, max: number, value: number, step: number): p5.Element;

  /**
   * Creates a `&lt;button&gt;&lt;/button&gt;` element.The first parameter, `label`, is a string that sets the label displayed on
   * the button.The second parameter, `value`, is optional. It's a string that sets the
   * button's value. See
   * MDN
   * for more details.
 *
   * @param
   * @param
   */
  createButton(label: string, value: string): p5.Element;

  /**
   * Creates a checkbox `&lt;input&gt;&lt;/input&gt;` element.Checkboxes extend the p5.Element class with a
   * `checked()` method. Calling `myBox.checked()` returns `true` if it the box
   * is checked and `false` if not.The first parameter, `label`, is optional. It's a string that sets the label
   * to display next to the checkbox.The second parameter, `value`, is also optional. It's a boolean that sets the
   * checkbox's value.
 *
   * @param
   * @param
   */
  createCheckbox(label: string, value: boolean): p5.Element;

  /**
   * Creates a dropdown menu `&lt;select&gt;&lt;/select&gt;` element.The parameter is optional. If `true` is passed, as in
   * `let mySelect = createSelect(true)`, then the dropdown will support
   * multiple selections. If an existing `&lt;select&gt;&lt;/select&gt;` element
   * is passed, as in `let mySelect = createSelect(otherSelect)`, the existing
   * element will be wrapped in a new p5.Element
   * object.Dropdowns extend the p5.Element class with a few
   * helpful methods for managing options:
 *
   * @param
   */
  createSelect(multiple: boolean): p5.Element;

  createSelect(existing: object): p5.Element;

  /**
   * Creates a radio button element.The parameter is optional. If a string is passed, as in
   * `let myRadio = createSelect('food')`, then each radio option will
   * have `"food"` as its `name` parameter: `&lt;input name="food"&gt;&lt;/input&gt;`.
   * If an existing `&lt;div&gt;&lt;/div&gt;` or `&lt;span&gt;&lt;/span&gt;`
   * element is passed, as in `let myRadio = createSelect(container)`, it will
   * become the radio button's parent element.Radio buttons extend the p5.Element class with a few
   * helpful methods for managing options:
 *
   * @param
   */
  createRadio(containerElement: object): p5.Element;

  createRadio(name: string): p5.Element;

  createRadio(): p5.Element;

  /**
   * Creates a color picker element.The parameter, `value`, is optional. If a color string or
   * p5.Color object is passed, it will set the default
   * color.Color pickers extend the p5.Element class with a
   * couple of helpful methods for managing colors:
 *
   * @param
   */
  createColorPicker(value: string | p5.Color): p5.Element;

  /**
   * Creates a text `&lt;input&gt;&lt;/input&gt;` element.Call `myInput.size()` to set the length of the text box.The first parameter, `value`, is optional. It's a string that sets the
   * input's default value. The input is blank by default.The second parameter, `type`, is also optional. It's a string that
   * specifies the type of text being input. See MDN for a full
   * list of options.
   * The default is `'text'`.
 *
   * @param
   * @param
   */
  createInput(value: string, type: string): p5.Element;

  createInput(value: string): p5.Element;

  /**
   * Creates an `&lt;input&gt;&lt;/input&gt;` element of type `'file'`.`createFileInput()` allows users to select local files for use in a sketch.
   * It returns a p5.File object.The first parameter, `callback`, is a function that's called when the file
   * loads. The callback function should have one parameter, `file`, that's a
   * p5.File object.The second parameter, `multiple`, is optional. It's a boolean value that
   * allows loading multiple files if set to `true`. If `true`, `callback`
   * will be called once per file.
 *
   * @param
   * @param
   */
  createFileInput(callback: Function, multiple: boolean): p5.File;

  /**
   * VIDEO STUFF *
 *
   * @param
   * @param
   * @param
   * @param
   */
  createMedia(pInst: any, type: any, src: any, callback: any): void;

  /**
   * The setMoveThreshold() function is used to set the movement threshold for
   * the deviceMoved() function. The default threshold is set to 0.5.
 *
   * @param
   */
  setMoveThreshold(value: number): void;

  /**
   * The setShakeThreshold() function is used to set the movement threshold for
   * the deviceShaken() function. The default threshold is set to 30.
 *
   * @param
   */
  setShakeThreshold(value: number): void;

  /**
   * The deviceMoved() function is called when the device is moved by more than
   * the threshold value along X, Y or Z axis. The default threshold is set to 0.5.
   * The threshold value can be changed using setMoveThreshold().
   */
  deviceMoved(): void;

  /**
   * The deviceTurned() function is called when the device rotates by
   * more than 90 degrees continuously.The axis that triggers the deviceTurned() method is stored in the turnAxis
   * variable. The deviceTurned() method can be locked to trigger on any axis:
   * X, Y or Z by comparing the turnAxis variable to 'X', 'Y' or 'Z'.
   */
  deviceTurned(): void;

  /**
   * The deviceShaken() function is called when the device total acceleration
   * changes of accelerationX and accelerationY values is more than
   * the threshold value. The default threshold is set to 30.
   * The threshold value can be changed using setShakeThreshold().
   */
  deviceShaken(): void;

  /**
   * A function that's called once when any key is pressed.Declaring the function `keyPressed()` sets a code block to run once
   * automatically when the user presses any key:`function keyPressed() {
   * // Code to run.
   * }`The key and keyCode
   * variables will be updated with the most recently typed value when
   * `keyPressed()` is called by p5.js:`function keyPressed() {
   * if (key === 'c') {
   * // Code to run.
   * }
   * 
   * if (keyCode === 13) { // Enter key
   * // Code to run.
   * }
   * }`The parameter, `event`, is optional. `keyPressed()` is always passed a
   * KeyboardEvent
   * object with properties that describe the key press event:`function keyPressed(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`Browsers may have default behaviors attached to various key events. For
   * example, some browsers may jump to the bottom of a web page when the
   * `SPACE` key is pressed. To prevent any default behavior for this event, add
   * `return false;` to the end of the function.
 *
   * @param
   */
  keyPressed(event: KeyboardEvent): void;

  /**
   * A function that's called once when any key is released.Declaring the function `keyReleased()` sets a code block to run once
   * automatically when the user releases any key:`function keyReleased() {
   * // Code to run.
   * }`The key and keyCode
   * variables will be updated with the most recently released value when
   * `keyReleased()` is called by p5.js:`function keyReleased() {
   * if (key === 'c') {
   * // Code to run.
   * }
   * 
   * if (keyCode === 13) { // Enter key
   * // Code to run.
   * }
   * }`The parameter, `event`, is optional. `keyReleased()` is always passed a
   * KeyboardEvent
   * object with properties that describe the key press event:`function keyReleased(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`Browsers may have default behaviors attached to various key events. To
   * prevent any default behavior for this event, add `return false;` to the end
   * of the function.
 *
   * @param
   */
  keyReleased(event: KeyboardEvent): void;

  /**
   * A function that's called once when keys with printable characters are pressed.Declaring the function `keyTyped()` sets a code block to run once
   * automatically when the user presses any key with a printable character such
   * as `a` or 1. Modifier keys such as `SHIFT`, `CONTROL`, and the arrow keys
   * will be ignored:`function keyTyped() {
   * // Code to run.
   * }`The key and keyCode
   * variables will be updated with the most recently released value when
   * `keyTyped()` is called by p5.js:`function keyTyped() {
   * // Check for the "c" character using key.
   * if (key === 'c') {
   * // Code to run.
   * }
   * 
   * // Check for "c" using keyCode.
   * if (keyCode === 67) { // 67 is the ASCII code for 'c'
   * // Code to run.
   * }
   * }`The parameter, `event`, is optional. `keyTyped()` is always passed a
   * KeyboardEvent
   * object with properties that describe the key press event:`function keyReleased(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`Note: Use the keyPressed() function and
   * keyCode system variable to respond to modifier
   * keys such as `ALT`.Browsers may have default behaviors attached to various key events. To
   * prevent any default behavior for this event, add `return false;` to the end
   * of the function.
 *
   * @param
   */
  keyTyped(event: KeyboardEvent): void;

  /**
   * Returns `true` if the key it’s checking is pressed and `false` if not.`keyIsDown()` is helpful when checking for multiple different key presses.
   * For example, `keyIsDown()` can be used to check if both `LEFT_ARROW` and
   * `UP_ARROW` are pressed:`if (keyIsDown(LEFT_ARROW) && keyIsDown(UP_ARROW)) {
   * // Move diagonally.
   * }``keyIsDown()` can check for key presses using strings based on
   * KeyboardEvent.key
   * or KeyboardEvent.code values,
   * such as `keyIsDown('x')` or `keyIsDown('ArrowLeft')`.Note: In p5.js 2.0 and newer, numeric keycodes (such as 88 for 'X') are no longer supported.
   * This is a breaking change from previous versions.You can still use the p5 constants like `LEFT_ARROW` which now map to string values
   * internally rather than numeric codes.
 *
   * @param
   */
  keyIsDown(code: number | string): boolean;

  /**
   * A function that's called when the mouse moves.Declaring the function `mouseMoved()` sets a code block to run
   * automatically when the user moves the mouse without clicking any mouse
   * buttons:`function mouseMoved() {
   * // Code to run.
   * }`The mouse system variables, such as mouseX and
   * mouseY, will be updated with their most recent
   * value when `mouseMoved()` is called by p5.js:`function mouseMoved() {
   * if (mouseX < 50) {
   * // Code to run if the mouse is on the left.
   * }
   * 
   * if (mouseY > 50) {
   * // Code to run if the mouse is near the bottom.
   * }
   * }`The parameter, `event`, is optional. `mouseMoved()` is always passed a
   * MouseEvent
   * object with properties that describe the mouse move event:`function mouseMoved(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`Browsers may have default behaviors attached to various mouse events. For
   * example, some browsers highlight text when the user moves the mouse while
   * pressing a mouse button. To prevent any default behavior for this event,
   * add `return false;` to the end of the function.
 *
   * @param
   */
  mouseMoved(event: MouseEvent): void;

  /**
   * A function that's called when the mouse moves while a button is pressed.Declaring the function `mouseDragged()` sets a code block to run
   * automatically when the user clicks and drags the mouse:`function mouseDragged() {
   * // Code to run.
   * }`The mouse system variables, such as mouseX and
   * mouseY, will be updated with their most recent
   * value when `mouseDragged()` is called by p5.js:`function mouseDragged() {
   * if (mouseX < 50) {
   * // Code to run if the mouse is on the left.
   * }
   * 
   * if (mouseY > 50) {
   * // Code to run if the mouse is near the bottom.
   * }
   * }`The parameter, `event`, is optional. `mouseDragged()` is always passed a
   * MouseEvent
   * object with properties that describe the mouse drag event:`function mouseDragged(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`On touchscreen devices, `mouseDragged()` will run when a user moves a touch
   * point.Browsers may have default behaviors attached to various mouse events. For
   * example, some browsers highlight text when the user moves the mouse while
   * pressing a mouse button. To prevent any default behavior for this event,
   * add `return false;` to the end of the function.
 *
   * @param
   */
  mouseDragged(event: MouseEvent): void;

  /**
   * A function that's called once when a mouse button is pressed.Declaring the function `mousePressed()` sets a code block to run
   * automatically when the user presses a mouse button:`function mousePressed() {
   * // Code to run.
   * }`The mouse system variables, such as mouseX and
   * mouseY, will be updated with their most recent
   * value when `mousePressed()` is called by p5.js:`function mousePressed() {
   * if (mouseX < 50) {
   * // Code to run if the mouse is on the left.
   * }
   * 
   * if (mouseY > 50) {
   * // Code to run if the mouse is near the bottom.
   * }
   * }`The parameter, `event`, is optional. `mousePressed()` is always passed a
   * MouseEvent
   * object with properties that describe the mouse press event:`function mousePressed(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`On touchscreen devices, `mousePressed()` will run when a user’s touch
   * begins.Browsers may have default behaviors attached to various mouse events. For
   * example, some browsers highlight text when the user moves the mouse while
   * pressing a mouse button. To prevent any default behavior for this event,
   * add `return false;` to the end of the function.Note: `mousePressed()`, mouseReleased(),
   * and mouseClicked() are all related.
   * `mousePressed()` runs as soon as the user clicks the mouse.
   * mouseReleased() runs as soon as the user
   * releases the mouse click. mouseClicked()
   * runs immediately after mouseReleased().
 *
   * @param
   */
  mousePressed(event: MouseEvent): void;

  /**
   * A function that's called once when a mouse button is released.Declaring the function `mouseReleased()` sets a code block to run
   * automatically when the user releases a mouse button after having pressed
   * it:`function mouseReleased() {
   * // Code to run.
   * }`The mouse system variables, such as mouseX and
   * mouseY, will be updated with their most recent
   * value when `mouseReleased()` is called by p5.js:`function mouseReleased() {
   * if (mouseX < 50) {
   * // Code to run if the mouse is on the left.
   * }
   * 
   * if (mouseY > 50) {
   * // Code to run if the mouse is near the bottom.
   * }
   * }`The parameter, `event`, is optional. `mouseReleased()` is always passed a
   * MouseEvent
   * object with properties that describe the mouse release event:`function mouseReleased(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`On touchscreen devices, `mouseReleased()` will run when a user’s touch
   * ends.Browsers may have default behaviors attached to various mouse events. For
   * example, some browsers highlight text when the user moves the mouse while
   * pressing a mouse button. To prevent any default behavior for this event,
   * add `return false;` to the end of the function.Note: mousePressed(), `mouseReleased()`,
   * and mouseClicked() are all related.
   * mousePressed() runs as soon as the user
   * clicks the mouse. `mouseReleased()` runs as soon as the user releases the
   * mouse click. mouseClicked() runs
   * immediately after `mouseReleased()`.
 *
   * @param
   */
  mouseReleased(event: MouseEvent): void;

  /**
   * A function that's called once after a mouse button is pressed and released.Declaring the function `mouseClicked()` sets a code block to run
   * automatically when the user releases a mouse button after having pressed
   * it:`function mouseClicked() {
   * // Code to run.
   * }`The mouse system variables, such as mouseX and
   * mouseY, will be updated with their most recent
   * value when `mouseClicked()` is called by p5.js:`function mouseClicked() {
   * if (mouseX < 50) {
   * // Code to run if the mouse is on the left.
   * }
   * 
   * if (mouseY > 50) {
   * // Code to run if the mouse is near the bottom.
   * }
   * }`The parameter, `event`, is optional. `mouseClicked()` is always passed a
   * MouseEvent
   * object with properties that describe the mouse click event:`function mouseClicked(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`On touchscreen devices, `mouseClicked()` will run when a user’s touch
   * ends.Browsers may have default behaviors attached to various mouse events. For
   * example, some browsers highlight text when the user moves the mouse while
   * pressing a mouse button. To prevent any default behavior for this event,
   * add `return false;` to the end of the function.Note: mousePressed(),
   * mouseReleased(),
   * and `mouseClicked()` are all related.
   * mousePressed() runs as soon as the user
   * clicks the mouse. mouseReleased() runs as
   * soon as the user releases the mouse click. `mouseClicked()` runs
   * immediately after mouseReleased().
 *
   * @param
   */
  mouseClicked(event: MouseEvent): void;

  /**
   * A function that's called once when a mouse button is clicked twice quickly.Declaring the function `doubleClicked()` sets a code block to run
   * automatically when the user presses and releases the mouse button twice
   * quickly:`function doubleClicked() {
   * // Code to run.
   * }`The mouse system variables, such as mouseX and
   * mouseY, will be updated with their most recent
   * value when `doubleClicked()` is called by p5.js:`function doubleClicked() {
   * if (mouseX < 50) {
   * // Code to run if the mouse is on the left.
   * }
   * 
   * if (mouseY > 50) {
   * // Code to run if the mouse is near the bottom.
   * }
   * }`The parameter, `event`, is optional. `doubleClicked()` is always passed a
   * MouseEvent
   * object with properties that describe the double-click event:`function doubleClicked(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`On touchscreen devices, code placed in `doubleClicked()` will run after two
   * touches that occur within a short time.Browsers may have default behaviors attached to various mouse events. For
   * example, some browsers highlight text when the user moves the mouse while
   * pressing a mouse button. To prevent any default behavior for this event,
   * add `return false;` to the end of the function.
 *
   * @param
   */
  doubleClicked(event: MouseEvent): void;

  /**
   * A function that's called once when the mouse wheel moves.Declaring the function `mouseWheel()` sets a code block to run
   * automatically when the user scrolls with the mouse wheel:`function mouseWheel() {
   * // Code to run.
   * }`The mouse system variables, such as mouseX and
   * mouseY, will be updated with their most recent
   * value when `mouseWheel()` is called by p5.js:`function mouseWheel() {
   * if (mouseX < 50) {
   * // Code to run if the mouse is on the left.
   * }
   * 
   * if (mouseY > 50) {
   * // Code to run if the mouse is near the bottom.
   * }
   * }`The parameter, `event`, is optional. `mouseWheel()` is always passed a
   * MouseEvent
   * object with properties that describe the mouse scroll event:`function mouseWheel(event) {
   * // Code to run that uses the event.
   * console.log(event);
   * }`The `event` object has many properties including `delta`, a `Number`
   * containing the distance that the user scrolled. For example, `event.delta`
   * might have the value 5 when the user scrolls up. `event.delta` is positive
   * if the user scrolls up and negative if they scroll down. The signs are
   * opposite on macOS with "natural" scrolling enabled.Browsers may have default behaviors attached to various mouse events. For
   * example, some browsers highlight text when the user moves the mouse while
   * pressing a mouse button. To prevent any default behavior for this event,
   * add `return false;` to the end of the function.Note: On Safari, `mouseWheel()` may only work as expected if
   * `return false;` is added at the end of the function.
 *
   * @param
   */
  mouseWheel(event: WheelEvent): void;

  /**
   * Locks the mouse pointer to its current position and makes it invisible.`requestPointerLock()` allows the mouse to move forever without leaving the
   * screen. Calling `requestPointerLock()` locks the values of
   * mouseX, mouseY,
   * pmouseX, and pmouseY.
   * movedX and movedY
   * continue updating and can be used to get the distance the mouse moved since
   * the last frame was drawn. Calling
   * exitPointerLock() resumes updating the
   * mouse system variables.Note: Most browsers require an input, such as a click, before calling
   * `requestPointerLock()`. It’s recommended to call `requestPointerLock()` in
   * an event function such as doubleClicked().
   */
  requestPointerLock(): void;

  /**
   * Exits a pointer lock started with
   * requestPointerLock.Calling `requestPointerLock()` locks the values of
   * mouseX, mouseY,
   * pmouseX, and pmouseY.
   * Calling `exitPointerLock()` resumes updating the mouse system variables.Note: Most browsers require an input, such as a click, before calling
   * `requestPointerLock()`. It’s recommended to call `requestPointerLock()` in
   * an event function such as doubleClicked().
   */
  exitPointerLock(): void;

  /**
   * Creates a new p5.Image object.`createImage()` uses the `width` and `height` parameters to set the new
   * p5.Image object's dimensions in pixels. The new
   * p5.Image can be modified by updating its
   * pixels array or by calling its
   * get() and
   * set() methods. The
   * loadPixels() method must be called
   * before reading or modifying pixel values. The
   * updatePixels() method must be called
   * for updates to take effect.Note: The new p5.Image object is transparent by
   * default.
 *
   * @param
   * @param
   */
  createImage(width: number, height: number): p5.Image;

  /**
   * Saves the current canvas as an image.By default, `saveCanvas()` saves the canvas as a PNG image called
   * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
   * file's name. If a file extension is included, as in
   * `saveCanvas('drawing.png')`, then the image will be saved using that
   * format.The second parameter, `extension`, is also optional. It sets the files format.
   * Either `'png'`, `'webp'`, or `'jpg'` can be used. For example, `saveCanvas('drawing', 'jpg')`
   * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
   * with a dialogue window.
 *
   * @param
   * @param
   * @param
   */
  saveCanvas(selectedCanvas: p5.Framebuffer | p5.Element | HTMLCanvasElement, filename: string, extension: string): void;

  saveCanvas(filename: string, extension: string): void;

  /**
   * Captures a sequence of frames from the canvas that can be saved as images.`saveFrames()` creates an array of frame objects. Each frame is stored as
   * an object with its file type, file name, and image data as a string. For
   * example, the first saved frame might have the following properties:`{ ext: 'png', filenmame: 'frame0', imageData: 'data:image/octet-stream;base64, abc123' }`.The first parameter, `filename`, sets the prefix for the file names. For
   * example, setting the prefix to `'frame'` would generate the image files
   * `frame0.png`, `frame1.png`, and so on.The second parameter, `extension`, sets the file type to either `'png'` or
   * `'jpg'`.The third parameter, `duration`, sets the duration to record in seconds.
   * The maximum duration is 15 seconds.The fourth parameter, `framerate`, sets the number of frames to record per
   * second. The maximum frame rate value is 22. Limits are placed on `duration`
   * and `framerate` to avoid using too much memory. Recording large canvases
   * can easily crash sketches or even web browsers.The fifth parameter, `callback`, is optional. If a function is passed,
   * image files won't be saved by default. The callback function can be used
   * to process an array containing the data for each captured frame. The array
   * of image data contains a sequence of objects with three properties for each
   * frame: `imageData`, `filename`, and `extension`.Note: Frames are downloaded as individual image files by default.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  saveFrames(filename: string, extension: string, duration: number, framerate: number, callback: any): void;

  /**
   * Loads an image to create a p5.Image object.`loadImage()` interprets the first parameter one of three ways. If the path
   * to an image file is provided, `loadImage()` will load it. Paths to local
   * files should be relative, such as `'assets/thundercat.jpg'`. URLs such as
   * `'https://example.com/thundercat.jpg'` may be blocked due to browser
   * security. Raw image data can also be passed as a base64 encoded image in
   * the form `'data:image/png;base64,arandomsequenceofcharacters'`. The `path`
   * parameter can also be defined as a
   * object for more advanced usage.The second parameter is optional. If a function is passed, it will be
   * called once the image has loaded. The callback function can optionally use
   * the new p5.Image object. The return value of the
   * function will be used as the final return value of `loadImage()`.The third parameter is also optional. If a function is passed, it will be
   * called if the image fails to load. The callback function can optionally use
   * the event error. The return value of the function will be used as the final
   * return value of `loadImage()`.This function returns a `Promise` and should be used in an `async` setup with
   * `await`. See the examples for the usage syntax.
 *
   * @param
   * @param
   * @param
   */
  loadImage(path: string | Request, successCallback: any, failureCallback: any): Promise<p5.Image>;

  /**
   * Generates a gif from a sketch and saves it to a file.`saveGif()` may be called in setup() or at any
   * point while a sketch is running.The first parameter, `fileName`, sets the gif's file name.The second parameter, `duration`, sets the gif's duration in seconds.The third parameter, `options`, is optional. If an object is passed,
   * `saveGif()` will use its properties to customize the gif. `saveGif()`
   * recognizes the properties `delay`, `units`, `silent`,
   * `notificationDuration`, and `notificationID`.
 *
   * @param
   * @param
   * @param
   */
  saveGif(filename: string, duration: number, options: object): void;

  /**
   * Helper function for loading GIF-based images
 *
   * @param
   * @param
   */
  _createGif(arrayBuffer: any, pImg: any): void;

  /**
   * Draws an image to the canvas.The first parameter, `img`, is the source image to be drawn. `img` can be
   * any of the following objects:The second and third parameters, `dx` and `dy`, set the coordinates of the
   * destination image's top left corner. See
   * imageMode() for other ways to position images.`let img;
   * 
   * async function setup() {
   * // Load the image.
   * img = await loadImage('assets/laDefense.jpg');
   * 
   * createCanvas(100, 100);
   * 
   * background(50);
   * 
   * // Draw the image.
   * image(img, 0, 0);
   * 
   * describe('An image of the underside of a white umbrella with a gridded ceiling above.');
   * }`Here's a diagram that explains how optional parameters work in `image()`:The fourth and fifth parameters, `dw` and `dh`, are optional. They set the
   * the width and height to draw the destination image. By default, `image()`
   * draws the full source image at its original size.The sixth and seventh parameters, `sx` and `sy`, are also optional.
   * These coordinates define the top left corner of a subsection to draw from
   * the source image.The eighth and ninth parameters, `sw` and `sh`, are also optional.
   * They define the width and height of a subsection to draw from the source
   * image. By default, `image()` draws the full subsection that begins at
   * `(sx, sy)` and extends to the edges of the source image.The ninth parameter, `fit`, is also optional. It enables a subsection of
   * the source image to be drawn without affecting its aspect ratio. If
   * `CONTAIN` is passed, the full subsection will appear within the destination
   * rectangle. If `COVER` is passed, the subsection will completely cover the
   * destination rectangle. This may have the effect of zooming into the
   * subsection.The tenth and eleventh paremeters, `xAlign` and `yAlign`, are also
   * optional. They determine how to align the fitted subsection. `xAlign` can
   * be set to either `LEFT`, `RIGHT`, or `CENTER`. `yAlign` can be set to
   * either `TOP`, `BOTTOM`, or `CENTER`. By default, both `xAlign` and `yAlign`
   * are set to `CENTER`.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  image(img: p5.Image | p5.Element | p5.Texture | p5.Framebuffer | p5.FramebufferTexture | p5.Renderer | p5.Graphics, x: number, y: number, width: number, height: number): void;

  image(img: p5.Image | p5.Element | p5.Texture | p5.Framebuffer | p5.FramebufferTexture, dx: number, dy: number, dWidth: number, dHeight: number, sx: number, sy: number, sWidth: number, sHeight: number, fit: CONTAIN | COVER, xAlign: LEFT | RIGHT | CENTER, yAlign: TOP | BOTTOM | CENTER): void;

  /**
   * Tints images using a color.The version of `tint()` with one parameter interprets it one of four ways.
   * If the parameter is a number, it's interpreted as a grayscale value. If the
   * parameter is a string, it's interpreted as a CSS color string. An array of
   * `[R, G, B, A]` values or a p5.Color object can
   * also be used to set the tint color.The version of `tint()` with two parameters uses the first one as a
   * grayscale value and the second as an alpha value. For example, calling
   * `tint(255, 128)` will make an image 50% transparent.The version of `tint()` with three parameters interprets them as RGB or
   * HSB values, depending on the current
   * colorMode(). The optional fourth parameter
   * sets the alpha value. For example, `tint(255, 0, 0, 100)` will give images
   * a red tint and make them transparent.
 *
   * @param
   * @param
   * @param
   * @param
   */
  tint(v1: number, v2: number, v3: number, alpha: number): void;

  tint(value: string): void;

  tint(gray: number, alpha: number): void;

  tint(values: number[]): void;

  tint(color: p5.Color): void;

  /**
   * Removes the current tint set by tint().`noTint()` restores images to their original colors.
   */
  noTint(): void;

  /**
   * Changes the location from which images are drawn when
   * image() is called.By default, the first
   * two parameters of image() are the x- and
   * y-coordinates of the image's upper-left corner. The next parameters are
   * its width and height. This is the same as calling `imageMode(CORNER)`.`imageMode(CORNERS)` also uses the first two parameters of
   * image() as the x- and y-coordinates of the image's
   * top-left corner. The third and fourth parameters are the coordinates of its
   * bottom-right corner.`imageMode(CENTER)` uses the first two parameters of
   * image() as the x- and y-coordinates of the image's
   * center. The next parameters are its width and height.
 *
   * @param
   */
  imageMode(mode: CORNER | CORNERS | CENTER): void;

  /**
   * Copies a region of pixels from one image to another.The first parameter, `srcImage`, is the
   * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to blend from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
   * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
   * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
   * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  blend(srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  blend(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  /**
   * Copies pixels from a source image to a region of the canvas.The first parameter, `srcImage`, is the
   * p5.Image object to blend. The source image can be
   * the canvas itself or a
   * p5.Image object. `copy()` will scale pixels from
   * the source region if it isn't the same size as the destination region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to copy from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of the canvas to copy into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the region's width and height.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  copy(srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  copy(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  /**
   * Applies an image filter to the canvas.The preset options are:`INVERT`
   * Inverts the colors in the image. No parameter is used.`GRAY`
   * Converts the image to grayscale. No parameter is used.`THRESHOLD`
   * Converts the image to black and white. Pixels with a grayscale value
   * above a given threshold are converted to white. The rest are converted to
   * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
   * value is specified, 0.5 is used.`OPAQUE`
   * Sets the alpha channel to entirely opaque. No parameter is used.`POSTERIZE`
   * Limits the number of colors in the image. Each color channel is limited to
   * the number of colors specified. Values between 2 and 255 are valid, but
   * results are most noticeable with lower values. The default value is 4.`BLUR`
   * Blurs the image. The level of blurring is specified by a blur radius. Larger
   * values increase the blur. The default value is 4. A gaussian blur is used
   * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
   * Reduces the light areas. No parameter is used.`DILATE`
   * Increases the light areas. No parameter is used.`filter()` uses WebGL in the background by default because it's faster.
   * This can be disabled in `P2D` mode by adding a `false` argument, as in
   * `filter(BLUR, false)`. This may be useful to keep computation off the GPU
   * or to work around a lack of WebGL support.In WebgL mode, `filter()` can also use custom shaders. See
   * createFilterShader() for more
   * information.
 *
   * @param
   * @param
   * @param
   */
  filter(filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | BLUR | ERODE | DILATE | BLUR, filterParam: number, useWebGL: boolean): void;

  filter(filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | BLUR | ERODE | DILATE | BLUR, filterParam: number, useWebGL: boolean): void;

  filter(shaderFilter: p5.Shader): void;

  /**
   * Gets a pixel or a region of pixels from the canvas.`get()` is easy to use but it's not as fast as
   * pixels. Use pixels
   * to read many pixel values.The version of `get()` with no parameters returns the entire canvas.The version of `get()` with two parameters interprets them as
   * coordinates. It returns an array with the `[R, G, B, A]` values of the
   * pixel at the given point.The version of `get()` with four parameters interprets them as coordinates
   * and dimensions. It returns a subsection of the canvas as a
   * p5.Image object. The first two parameters are the
   * coordinates for the upper-left corner of the subsection. The last two
   * parameters are the width and height of the subsection.Use p5.Image.get() to work directly with
   * p5.Image objects.
 *
   * @param
   * @param
   * @param
   * @param
   */
  get(x: number, y: number, w: number, h: number): p5.Image;

  get(): p5.Image;

  get(x: number, y: number): number[];

  /**
   * Loads the current value of each pixel on the canvas into the
   * pixels array.`loadPixels()` must be called before reading from or writing to
   * pixels.
   */
  loadPixels(): void;

  /**
   * Loads the current value of each pixel in the framebuffer into its
   * pixels array.`myBuffer.loadPixels()` must be called before reading from or writing to
   * myBuffer.pixels.
   */
  loadPixels(): void;

  /**
   * Sets the color of a pixel or draws an image to the canvas.`set()` is easy to use but it's not as fast as
   * pixels. Use pixels
   * to set many pixel values.`set()` interprets the first two parameters as x- and y-coordinates. It
   * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
   * array, a p5.Color object, or a
   * p5.Image object. If an image is passed, the first
   * two parameters set the coordinates for the image's upper-left corner,
   * regardless of the current imageMode().updatePixels() must be called after using
   * `set()` for changes to appear.
 *
   * @param
   * @param
   * @param
   */
  set(x: number, y: number, c: number | number[] | object): void;

  /**
   * Updates the canvas with the RGBA values in the
   * pixels array.`updatePixels()` only needs to be called after changing values in the
   * pixels array. Such changes can be made directly
   * after calling loadPixels() or by calling
   * set().
 *
   * @param
   * @param
   * @param
   * @param
   */
  updatePixels(x: number, y: number, w: number, h: number): void;

  /**
   * Updates the framebuffer with the RGBA values in the
   * pixels array.`myBuffer.updatePixels()` only needs to be called after changing values
   * in the myBuffer.pixels array. Such
   * changes can be made directly after calling
   * myBuffer.loadPixels().
   */
  updatePixels(): void;

  /**
   * Loads a JSON file to create an `Object`.JavaScript Object Notation
   * (JSON)
   * is a standard format for sending data between applications. The format is
   * based on JavaScript objects which have keys and values. JSON files store
   * data in an object with strings as keys. Values can be strings, numbers,
   * Booleans, arrays, `null`, or other objects.The first parameter, `path`, is a string with the path to the file.
   * Paths to local files should be relative, as in
   * `loadJSON('assets/data.json')`. URLs such as
   * `'https://example.com/data.json'` may be blocked due to browser security.
   * The `path` parameter can also be defined as a
   * object for more advanced usage.The second parameter, `successCallback`, is optional. If a function is
   * passed, as in `loadJSON('assets/data.json', handleData)`, then the
   * `handleData()` function will be called once the data loads. The object
   * created from the JSON data will be passed to `handleData()` as its only argument.
   * The return value of the `handleData()` function will be used as the final return
   * value of `loadJSON('assets/data.json', handleData)`.The third parameter, `failureCallback`, is also optional. If a function is
   * passed, as in `loadJSON('assets/data.json', handleData, handleFailure)`,
   * then the `handleFailure()` function will be called if an error occurs while
   * loading. The `Error` object will be passed to `handleFailure()` as its only
   * argument. The return value of the `handleFailure()` function will be used as the
   * final return value of `loadJSON('assets/data.json', handleData, handleFailure)`.This function returns a `Promise` and should be used in an `async` setup with
   * `await`. See the examples for the usage syntax.
 *
   * @param
   * @param
   * @param
   */
  loadJSON(path: string | Request, successCallback: Function, errorCallback: Function): Promise<object>;

  /**
   * Loads a text file to create an `Array`.The first parameter, `path`, is always a string with the path to the file.
   * Paths to local files should be relative, as in
   * `loadStrings('assets/data.txt')`. URLs such as
   * `'https://example.com/data.txt'` may be blocked due to browser security.
   * The `path` parameter can also be defined as a
   * object for more advanced usage.The second parameter, `successCallback`, is optional. If a function is
   * passed, as in `loadStrings('assets/data.txt', handleData)`, then the
   * `handleData()` function will be called once the data loads. The array
   * created from the text data will be passed to `handleData()` as its only
   * argument. The return value of the `handleData()` function will be used as
   * the final return value of `loadStrings('assets/data.txt', handleData)`.The third parameter, `failureCallback`, is also optional. If a function is
   * passed, as in `loadStrings('assets/data.txt', handleData, handleFailure)`,
   * then the `handleFailure()` function will be called if an error occurs while
   * loading. The `Error` object will be passed to `handleFailure()` as its only
   * argument. The return value of the `handleFailure()` function will be used as
   * the final return value of `loadStrings('assets/data.txt', handleData, handleFailure)`.This function returns a `Promise` and should be used in an `async` setup with
   * `await`. See the examples for the usage syntax.
 *
   * @param
   * @param
   * @param
   */
  loadStrings(path: string | Request, successCallback: Function, errorCallback: Function): Promise<string[]>;

  /**
   * Reads the contents of a file or URL and creates a p5.Table object with
   * its values. If a file is specified, it must be located in the sketch's
   * "data" folder. The filename parameter can also be a URL to a file found
   * online. By default, the file is assumed to be comma-separated (in CSV
   * format). Table only looks for a header row if the 'header' option is
   * included.This function returns a `Promise` and should be used in an `async` setup with
   * `await`. See the examples for the usage syntax.All files loaded and saved use UTF-8 encoding. This method is suitable for fetching files up to size of 64MB.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  loadTable(filename: string | Request, separator: string, header: string, callback: Function, errorCallback: Function): Promise<object>;

  /**
   * Loads an XML file to create a p5.XML object.Extensible Markup Language
   * (XML)
   * is a standard format for sending data between applications. Like HTML, the
   * XML format is based on tags and attributes, as in
   * `&lt;time units="s"&gt;1234&lt;/time&gt;`.The first parameter, `path`, is always a string with the path to the file.
   * Paths to local files should be relative, as in
   * `loadXML('assets/data.xml')`. URLs such as `'https://example.com/data.xml'`
   * may be blocked due to browser security. The `path` parameter can also be defined
   * as a
   * object for more advanced usage.The second parameter, `successCallback`, is optional. If a function is
   * passed, as in `loadXML('assets/data.xml', handleData)`, then the
   * `handleData()` function will be called once the data loads. The
   * p5.XML object created from the data will be passed
   * to `handleData()` as its only argument. The return value of the `handleData()`
   * function will be used as the final return value of `loadXML('assets/data.xml', handleData)`.The third parameter, `failureCallback`, is also optional. If a function is
   * passed, as in `loadXML('assets/data.xml', handleData, handleFailure)`, then
   * the `handleFailure()` function will be called if an error occurs while
   * loading. The `Error` object will be passed to `handleFailure()` as its only
   * argument. The return value of the `handleFailure()` function will be used as the
   * final return value of `loadXML('assets/data.xml', handleData, handleFailure)`.This function returns a `Promise` and should be used in an `async` setup with
   * `await`. See the examples for the usage syntax.
 *
   * @param
   * @param
   * @param
   */
  loadXML(path: string | Request, successCallback: Function, errorCallback: Function): Promise<p5.XML>;

  /**
   * This method is suitable for fetching files up to size of 64MB.
 *
   * @param
   * @param
   * @param
   */
  loadBytes(file: string | Request, callback: Function, errorCallback: Function): Promise<Uint8Array>;

  /**
   * Loads a file at the given path as a Blob, then returns the resulting data or
   * passes it to a success callback function, if provided. On load, this function
   * returns a `Promise` that resolves to a Blob containing the file data.
 *
   * @param
   * @param
   * @param
   */
  loadBlob(path: string | Request, successCallback: Function, errorCallback: Function): Promise<Blob>;

  /**
   * Method for executing an HTTP GET request. If data type is not specified,
   * it will default to `'text'`. This is equivalent to
   * calling httpDo(path, 'GET'). The 'binary' datatype will return
   * a Blob object, and the 'arrayBuffer' datatype will return an ArrayBuffer
   * which can be used to initialize typed arrays (such as Uint8Array).
 *
   * @param
   * @param
   * @param
   * @param
   */
  httpGet(path: string | Request, datatype: string, callback: Function, errorCallback: Function): Promise;

  httpGet(path: string | Request, callback: Function, errorCallback: Function): Promise;

  /**
   * Method for executing an HTTP POST request. If data type is not specified,
   * it will default to `'text'`. This is equivalent to
   * calling httpDo(path, 'POST').
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  httpPost(path: string | Request, data: object | boolean, datatype: string, callback: Function, errorCallback: Function): Promise;

  httpPost(path: string | Request, data: object | boolean, callback: Function, errorCallback: Function): Promise;

  httpPost(path: string | Request, callback: Function, errorCallback: Function): Promise;

  /**
   * Method for executing an HTTP request. If data type is not specified,
   * it will default to `'text'`.This function is meant for more advanced usage of HTTP requests in p5.js. It is
   * best used when a
   * object is passed to the `path` parameter.This method is suitable for fetching files up to size of 64MB when "GET" is used.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  httpDo(path: string | Request, method: string, datatype: string, data: object, callback: Function, errorCallback: Function): Promise;

  httpDo(path: string | Request, callback: Function, errorCallback: Function): Promise;

  /**
   * Creates a new p5.PrintWriter object.p5.PrintWriter objects provide a way to
   * save a sequence of text data, called the , to the user's
   * computer. They're low-level objects that enable precise control of text
   * output. Functions such as
   * saveStrings() and
   * saveJSON() are easier to use for simple file
   * saving.The first parameter, `filename`, is the name of the file to be written. If
   * a string is passed, as in `createWriter('words.txt')`, a new
   * p5.PrintWriter object will be created that
   * writes to a file named `words.txt`.The second parameter, `extension`, is optional. If a string is passed, as
   * in `createWriter('words', 'csv')`, the first parameter will be interpreted
   * as the file name and the second parameter as the extension.
 *
   * @param
   * @param
   */
  createWriter(name: string, extension: string): p5.PrintWriter;

  /**
   * Writes data to the print stream without adding new lines.The parameter, `data`, is the data to write. `data` can be a number or
   * string, as in `myWriter.write('hi')`, or an array of numbers and strings,
   * as in `myWriter.write([1, 2, 3])`. A comma will be inserted between array
   * array elements when they're added to the print stream.
 *
   * @param
   */
  write(data: string | number | Array): void;

  /**
   * Saves the file and closes the print stream.
   */
  close(): void;

  /**
   * Saves a given element(image, text, json, csv, wav, or html) to the client's
   * computer. The first parameter can be a pointer to element we want to save.
   * The element can be one of p5.Element,an Array of
   * Strings, an Array of JSON, a JSON object, a p5.Table
   * , a p5.Image, or a p5.SoundFile (requires
   * p5.sound). The second parameter is a filename (including extension).The
   * third parameter is for options specific to this type of object. This method
   * will save a file that fits the given parameters.
   * If it is called without specifying an element, by default it will save the
   * whole canvas as an image file. You can optionally specify a filename as
   * the first parameter in such a case.
 *
   * @param
   * @param
   * @param
   */
  save(objectOrFilename: object | string, filename: string, options: boolean | string): void;

  /**
   * Saves an `Object` or `Array` to a JSON file.JavaScript Object Notation
   * (JSON)
   * is a standard format for sending data between applications. The format is
   * based on JavaScript objects which have keys and values. JSON files store
   * data in an object with strings as keys. Values can be strings, numbers,
   * Booleans, arrays, `null`, or other objects.The first parameter, `json`, is the data to save. The data can be an array,
   * as in `[1, 2, 3]`, or an object, as in
   * `{ x: 50, y: 50, color: 'deeppink' }`.The second parameter, `filename`, is a string that sets the file's name.
   * For example, calling `saveJSON([1, 2, 3], 'data.json')` saves the array
   * `[1, 2, 3]` to a file called `data.json` on the user's computer.The third parameter, `optimize`, is optional. If `true` is passed, as in
   * `saveJSON([1, 2, 3], 'data.json', true)`, then all unneeded whitespace will
   * be removed to reduce the file size.Note: The browser will either save the file immediately or prompt the user
   * with a dialogue window.
 *
   * @param
   * @param
   * @param
   */
  saveJSON(json: Array | object, filename: string, optimize: boolean): void;

  /**
   * Saves an `Array` of `String`s to a file, one per line.The first parameter, `list`, is an array with the strings to save.The second parameter, `filename`, is a string that sets the file's name.
   * For example, calling `saveStrings(['0', '01', '011'], 'data.txt')` saves
   * the array `['0', '01', '011']` to a file called `data.txt` on the user's
   * computer.The third parameter, `extension`, is optional. If a string is passed, as in
   * `saveStrings(['0', '01', '0`1'], 'data', 'txt')`, the second parameter will
   * be interpreted as the file name and the third parameter as the extension.The fourth parameter, `isCRLF`, is also optional, If `true` is passed, as
   * in `saveStrings(['0', '01', '011'], 'data', 'txt', true)`, then two
   * characters, `\r\n` , will be added to the end of each string to create new
   * lines in the saved file. `\r` is a carriage return (CR) and `\n` is a line
   * feed (LF). By default, only `\n` (line feed) is added to each string in
   * order to create new lines.Note: The browser will either save the file immediately or prompt the user
   * with a dialogue window.
 *
   * @param
   * @param
   * @param
   * @param
   */
  saveStrings(list: string[], filename: string, extension: string, isCRLF: boolean): void;

  /**
   * Writes the contents of a Table object to a file. Defaults to a
   * text file with comma-separated-values ('csv') but can also
   * use tab separation ('tsv'), or generate an HTML table ('html').
   * The file saving process and location of the saved file will
   * vary between web browsers.
 *
   * @param
   * @param
   * @param
   */
  saveTable(Table: p5.Table, filename: string, options: string): void;

  /**
   * Sets the element's content.An element's content is the text between its tags. For example, the element
   * `&lt;language&gt;JavaScript&lt;/language&gt;` has the content `JavaScript`.The parameter, `content`, is a string with the element's new content.
 *
   * @param
   */
  setContent(content: string): void;

  /**
   * Calculates the absolute value of a number.A number's absolute value is its distance from zero on the number line.
   * -5 and 5 are both five units away from zero, so calling `abs(-5)` and
   * `abs(5)` both return 5. The absolute value of a number is always positive.
 *
   * @param
   */
  abs(n: number): number;

  /**
   * Calculates the closest integer value that is greater than or equal to a
   * number.For example, calling `ceil(9.03)` and `ceil(9.97)` both return the value
   * 10.
 *
   * @param
   */
  ceil(n: number): number;

  /**
   * Constrains a number between a minimum and maximum value.
 *
   * @param
   * @param
   * @param
   */
  constrain(n: number, low: number, high: number): number;

  /**
   * Calculates the distance between two points.The version of `dist()` with four parameters calculates distance in two
   * dimensions.The version of `dist()` with six parameters calculates distance in three
   * dimensions.Use p5.Vector.dist() to calculate the
   * distance between two p5.Vector objects.
 *
   * @param
   * @param
   * @param
   * @param
   */
  dist(x1: number, y1: number, x2: number, y2: number): number;

  dist(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number;

  /**
   * Calculates the distance between two points represented by vectors.A point's coordinates can be represented by the components of a vector
   * that extends from the origin to the point.The static version of `dist()`, as in `p5.Vector.dist(v1, v2)`, is the same
   * as calling `v1.dist(v2)`.Use dist() to calculate the distance between points
   * using coordinates as in `dist(x1, y1, x2, y2)`.
 *
   * @param
   */
  dist(v: p5.Vector): number;

  /**
   * Calculates the value of Euler's number e (2.71828...) raised to the power
   * of a number.
 *
   * @param
   */
  exp(n: number): number;

  /**
   * Calculates the closest integer value that is less than or equal to the
   * value of a number.
 *
   * @param
   */
  floor(n: number): number;

  /**
   * Calculates a number between two numbers at a specific increment.The `amt` parameter is the amount to interpolate between the two numbers.
   * 0.0 is equal to the first number, 0.1 is very near the first number, 0.5 is
   * half-way in between, and 1.0 is equal to the second number. The `lerp()`
   * function is convenient for creating motion along a straight path and for
   * drawing dotted lines.If the value of `amt` is less than 0 or more than 1, `lerp()` will return a
   * number outside of the original interval. For example, calling
   * `lerp(0, 10, 1.5)` will return 15.
 *
   * @param
   * @param
   * @param
   */
  lerp(start: number, stop: number, amt: number): number;

  /**
   * Calculates the natural logarithm (the base-e logarithm) of a number.`log()` expects the `n` parameter to be a value greater than 0 because
   * the natural logarithm is defined that way.
 *
   * @param
   */
  log(n: number): number;

  /**
   * Calculates the magnitude, or length, of a vector.A vector can be thought of in different ways. In one view, a vector is a
   * point in space. The vector's components, `x` and `y`, are the point's
   * coordinates `(x, y)`. A vector's magnitude is the distance from the origin
   * `(0, 0)` to `(x, y)`. `mag(x, y)` is a shortcut for calling
   * `dist(0, 0, x, y)`.A vector can also be thought of as an arrow pointing in space. This view is
   * helpful for programming motion. See p5.Vector for
   * more details.Use p5.Vector.mag() to calculate the
   * magnitude of a p5.Vector object.
 *
   * @param
   * @param
   */
  mag(x: number, y: number): number;

  /**
   * Re-maps a number from one range to another.For example, calling `map(2, 0, 10, 0, 100)` returns 20. The first three
   * arguments set the original value to 2 and the original range from 0 to 10.
   * The last two arguments set the target range from 0 to 100. 20's position
   * in the target range [0, 100] is proportional to 2's position in the
   * original range [0, 10].The sixth parameter, `withinBounds`, is optional. By default, `map()` can
   * return values outside of the target range. For example,
   * `map(11, 0, 10, 0, 100)` returns 110. Passing `true` as the sixth parameter
   * constrains the remapped value to the target range. For example,
   * `map(11, 0, 10, 0, 100, true)` returns 100.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  map(value: number, start1: number, stop1: number, start2: number, stop2: number, withinBounds: boolean): number;

  /**
   * Returns the largest value in a sequence of numbers.The version of `max()` with one parameter interprets it as an array of
   * numbers and returns the largest number.The version of `max()` with two or more parameters interprets them as
   * individual numbers and returns the largest number.
 *
   * @param
   * @param
   */
  max(n0: number, n1: number): number;

  max(nums: number[]): number;

  /**
   * Returns the smallest value in a sequence of numbers.The version of `min()` with one parameter interprets it as an array of
   * numbers and returns the smallest number.The version of `min()` with two or more parameters interprets them as
   * individual numbers and returns the smallest number.
 *
   * @param
   * @param
   */
  min(n0: number, n1: number): number;

  min(nums: number[]): number;

  /**
   * Maps a number from one range to a value between 0 and 1.For example, `norm(2, 0, 10)` returns 0.2. 2's position in the original
   * range [0, 10] is proportional to 0.2's position in the range [0, 1]. This
   * is the same as calling `map(2, 0, 10, 0, 1)`.Numbers outside of the original range are not constrained between 0 and 1.
   * Out-of-range values are often intentional and useful.
 *
   * @param
   * @param
   * @param
   */
  norm(value: number, start: number, stop: number): number;

  /**
   * Calculates exponential expressions such as 23.For example, `pow(2, 3)` evaluates the expression
   * 2 × 2 × 2. `pow(2, -3)` evaluates 1 ÷
   * (2 × 2 × 2).
 *
   * @param
   * @param
   */
  pow(n: number, e: number): number;

  /**
   * Calculates the integer closest to a number.For example, `round(133.8)` returns the value 134.The second parameter, `decimals`, is optional. It sets the number of
   * decimal places to use when rounding. For example, `round(12.34, 1)` returns
   * 12.3. `decimals` is 0 by default.
 *
   * @param
   * @param
   */
  round(n: number, decimals: number): number;

  /**
   * Calculates the square of a number.Squaring a number means multiplying the number by itself. For example,
   * `sq(3)` evaluates 3 × 3 which is 9. `sq(-3)` evaluates -3 × -3
   * which is also 9. Multiplying two negative numbers produces a positive
   * number. The value returned by `sq()` is always positive.
 *
   * @param
   */
  sq(n: number): number;

  /**
   * Calculates the square root of a number.A number's square root can be multiplied by itself to produce the original
   * number. For example, `sqrt(9)` returns 3 because 3 × 3 = 9. `sqrt()`
   * always returns a positive value. `sqrt()` doesn't work with negative arguments
   * such as `sqrt(-9)`.
 *
   * @param
   */
  sqrt(n: number): number;

  /**
   * Calculates the fractional part of a number.A number's fractional part includes its decimal values. For example,
   * `fract(12.34)` returns 0.34.
 *
   * @param
   */
  fract(n: number): number;

  /**
   * Creates a new p5.Vector object.A vector can be thought of in different ways. In one view, a vector is like
   * an arrow pointing in space. Vectors have both magnitude (length) and
   * direction. This view is helpful for programming motion.A vector's components determine its magnitude and direction. For example,
   * calling `createVector(3, 4)` creates a new
   * p5.Vector object with an x-component of 3 and a
   * y-component of 4. From the origin, this vector's tip is 3 units to the
   * right and 4 units down.You can also pass N dimensions to the `createVector` function. For example,
   * calling `createVector(1, 2, 3, 4)` creates a vector with four components.
   * This allows for flexibility in representing vectors in higher-dimensional
   * spaces.p5.Vector objects are often used to program
   * motion because they simplify the math. For example, a moving ball has a
   * position and a velocity. Position describes where the ball is in space. The
   * ball's position vector extends from the origin to the ball's center.
   * Velocity describes the ball's speed and the direction it's moving. If the
   * ball is moving straight up, its velocity vector points straight up. Adding
   * the ball's velocity vector to its position vector moves it, as in
   * `pos.add(vel)`. Vector math relies on methods inside the
   * p5.Vector class.
 *
   * @param
   */
  createVector(x: number[]): p5.Vector;

  /**
   * Returns random numbers that can be tuned to feel organic.Values returned by random() and
   * randomGaussian() can change by large
   * amounts between function calls. By contrast, values returned by `noise()`
   * can be made "smooth". Calls to `noise()` with similar inputs will produce
   * similar outputs. `noise()` is used to create textures, motion, shapes,
   * terrains, and so on. Ken Perlin invented `noise()` while animating the
   * original Tron film in the 1980s.`noise()` always returns values between 0 and 1. It returns the same value
   * for a given input while a sketch is running. `noise()` produces different
   * results each time a sketch runs. The
   * noiseSeed() function can be used to generate
   * the same sequence of Perlin noise values each time a sketch runs.The character of the noise can be adjusted in two ways. The first way is to
   * scale the inputs. `noise()` interprets inputs as coordinates. The sequence
   * of noise values will be smoother when the input coordinates are closer. The
   * second way is to use the noiseDetail()
   * function.The version of `noise()` with one parameter computes noise values in one
   * dimension. This dimension can be thought of as space, as in `noise(x)`, or
   * time, as in `noise(t)`.The version of `noise()` with two parameters computes noise values in two
   * dimensions. These dimensions can be thought of as space, as in
   * `noise(x, y)`, or space and time, as in `noise(x, t)`.The version of `noise()` with three parameters computes noise values in
   * three dimensions. These dimensions can be thought of as space, as in
   * `noise(x, y, z)`, or space and time, as in `noise(x, y, t)`.
 *
   * @param
   * @param
   * @param
   */
  noise(x: number, y: number, z: number): number;

  /**
   * Adjusts the character of the noise produced by the
   * noise() function.Perlin noise values are created by adding layers of noise together. The
   * noise layers, called octaves, are similar to harmonics in music. Lower
   * octaves contribute more to the output signal. They define the overall
   * intensity of the noise. Higher octaves create finer-grained details.By default, noise values are created by combining four octaves. Each higher
   * octave contributes half as much (50% less) compared to its predecessor.
   * `noiseDetail()` changes the number of octaves and the falloff amount. For
   * example, calling `noiseDetail(6, 0.25)` ensures that
   * noise() will use six octaves. Each higher octave
   * will contribute 25% as much (75% less) compared to its predecessor. Falloff
   * values between 0 and 1 are valid. However, falloff values greater than 0.5
   * might result in noise values greater than 1.
 *
   * @param
   * @param
   */
  noiseDetail(lod: number, falloff: number): void;

  /**
   * Sets the seed value for the noise() function.By default, noise() produces different results
   * each time a sketch is run. Calling `noiseSeed()` with a constant argument,
   * such as `noiseSeed(99)`, makes noise() produce the
   * same results each time a sketch is run.
 *
   * @param
   */
  noiseSeed(seed: number): void;

  /**
   * Multiplies a vector's `x`, `y`, and `z` components.`mult()` can use separate numbers, as in `v.mult(1, 2, 3)`, another
   * p5.Vector object, as in `v.mult(v2)`, or an array
   * of numbers, as in `v.mult([1, 2, 3])`.If only one value is provided, as in `v.mult(2)`, then all the components
   * will be multiplied by 2. If a value isn't provided for a component, it
   * won't change. For example, `v.mult(4, 5)` multiplies `v.x` by, `v.y` by 5,
   * and `v.z` by 1. Calling `mult()` with no arguments, as in `v.mult()`, has
   * no effect.The static version of `mult()`, as in `p5.Vector.mult(v, 2)`, returns a new
   * p5.Vector object and doesn't change the
   * originals.
 *
   * @param
   */
  mult(n: number): void;

  /**
   * Multiplies a quaternion with other quaternion.
 *
   * @param
   */
  mult(quat: p5.Quat): void;

  /**
   * Replaces the components of a p5.Vector that are very close to zero with zero.In computers, handling numbers with decimals can give slightly imprecise answers due to the way those numbers are represented.
   * This can make it hard to check if a number is zero, as it may be close but not exactly zero.
   * This method rounds very close numbers to zero to make those checks easier
   */
  clampToZero(): p5.Vector;

  /**
   * Sets the seed value for the random() and
   * randomGaussian() functions.By default, random() and
   * randomGaussian() produce different
   * results each time a sketch is run. Calling `randomSeed()` with a constant
   * argument, such as `randomSeed(99)`, makes these functions produce the same
   * results each time a sketch is run.
 *
   * @param
   */
  randomSeed(seed: number): void;

  /**
   * Returns a random number or a random element from an array.`random()` follows uniform distribution, which means that all outcomes are
   * equally likely. When `random()` is used to generate numbers, all
   * numbers in the output range are equally likely to be returned. When
   * `random()` is used to select elements from an array, all elements are
   * equally likely to be chosen.By default, `random()` produces different results each time a sketch runs.
   * The randomSeed() function can be used to
   * generate the same sequence of numbers or choices each time a sketch runs.The version of `random()` with no parameters returns a random number from 0
   * up to but not including 1.The version of `random()` with one parameter works one of two ways. If the
   * argument passed is a number, `random()` returns a random number from 0 up
   * to but not including the number. For example, calling `random(5)` returns
   * values between 0 and 5. If the argument passed is an array, `random()`
   * returns a random element from that array. For example, calling
   * `random(['🦁', '🐯', '🐻'])` returns either a lion, tiger, or bear emoji.The version of `random()` with two parameters returns a random number from
   * a given range. The arguments passed set the range's lower and upper bounds.
   * For example, calling `random(-5, 10.2)` returns values from -5 up to but
   * not including 10.2.
 *
   * @param
   * @param
   */
  random(min: number, max: number): number;

  random(choices: Array): any;

  /**
   * Returns a random number fitting a Gaussian, or normal, distribution.Normal distributions look like bell curves when plotted. Values from a
   * normal distribution cluster around a central value called the mean. The
   * cluster's standard deviation describes its spread.By default, `randomGaussian()` produces different results each time a
   * sketch runs. The randomSeed() function can be
   * used to generate the same sequence of numbers each time a sketch runs.There's no minimum or maximum value that `randomGaussian()` might return.
   * Values far from the mean are very unlikely and values near the mean are
   * very likely.The version of `randomGaussian()` with no parameters returns values with a
   * mean of 0 and standard deviation of 1.The version of `randomGaussian()` with one parameter interprets the
   * argument passed as the mean. The standard deviation is 1.The version of `randomGaussian()` with two parameters interprets the first
   * argument passed as the mean and the second as the standard deviation.
 *
   * @param
   * @param
   */
  randomGaussian(mean: number, sd: number): number;

  /**
   * Calculates the arc cosine of a number.`acos()` is the inverse of cos(). It expects
   * arguments in the range -1 to 1. By default, `acos()` returns values in the
   * range 0 to π (about 3.14). If the
   * angleMode() is `DEGREES`, then values are
   * returned in the range 0 to 180.
 *
   * @param
   */
  acos(value: number): number;

  /**
   * Calculates the arc sine of a number.`asin()` is the inverse of sin(). It expects input
   * values in the range of -1 to 1. By default, `asin()` returns values in the
   * range -π ÷ 2 (about -1.57) to π ÷ 2 (about 1.57). If
   * the angleMode() is `DEGREES` then values are
   * returned in the range -90 to 90.
 *
   * @param
   */
  asin(value: number): number;

  /**
   * Calculates the arc tangent of a number.`atan()` is the inverse of tan(). It expects input
   * values in the range of -Infinity to Infinity. By default, `atan()` returns
   * values in the range -π ÷ 2 (about -1.57) to π ÷ 2
   * (about 1.57). If the angleMode() is `DEGREES`
   * then values are returned in the range -90 to 90.
 *
   * @param
   */
  atan(value: number): number;

  /**
   * Calculates the angle formed by a point, the origin, and the positive
   * x-axis.`atan2()` is most often used for orienting geometry to the mouse's
   * position, as in `atan2(mouseY, mouseX)`. The first parameter is the point's
   * y-coordinate and the second parameter is its x-coordinate.By default, `atan2()` returns values in the range
   * -π (about -3.14) to π (3.14). If the
   * angleMode() is `DEGREES`, then values are
   * returned in the range -180 to 180.
 *
   * @param
   * @param
   */
  atan2(y: number, x: number): number;

  /**
   * Calculates the cosine of an angle.`cos()` is useful for many geometric tasks in creative coding. The values
   * returned oscillate between -1 and 1 as the input angle increases. `cos()`
   * calculates the cosine of an angle, using radians by default, or according
   * to if angleMode() setting (RADIANS or DEGREES).
 *
   * @param
   */
  cos(angle: number): number;

  /**
   * Calculates the sine of an angle.`sin()` is useful for many geometric tasks in creative coding. The values
   * returned oscillate between -1 and 1 as the input angle increases. `sin()`
   * calculates the sine of an angle, using radians by default, or according to
   * if angleMode() setting (RADIANS or DEGREES).
 *
   * @param
   */
  sin(angle: number): number;

  /**
   * Calculates the tangent of an angle.`tan()` is useful for many geometric tasks in creative coding. The values
   * returned range from -Infinity to Infinity and repeat periodically as the
   * input angle increases. `tan()` calculates the tan of an angle, using radians
   * by default, or according to
   * if angleMode() setting (RADIANS or DEGREES).
 *
   * @param
   */
  tan(angle: number): number;

  /**
   * Converts an angle measured in radians to its value in degrees.Degrees and radians are both units for measuring angles. There are 360˚ in
   * one full rotation. A full rotation is 2 × π (about 6.28) radians.The same angle can be expressed in with either unit. For example, 90° is a
   * quarter of a full rotation. The same angle is 2 × π ÷ 4
   * (about 1.57) radians.
 *
   * @param
   */
  degrees(radians: number): number;

  /**
   * Converts an angle measured in degrees to its value in radians.Degrees and radians are both units for measuring angles. There are 360˚ in
   * one full rotation. A full rotation is 2 × π (about 6.28) radians.The same angle can be expressed in with either unit. For example, 90° is a
   * quarter of a full rotation. The same angle is 2 × π ÷ 4
   * (about 1.57) radians.
 *
   * @param
   */
  radians(degrees: number): number;

  /**
   * Changes the unit system used to measure angles.Degrees and radians are both units for measuring angles. There are 360˚ in
   * one full rotation. A full rotation is 2 × π (about 6.28) radians.Functions such as rotate() and
   * sin() expect angles measured radians by default.
   * Calling `angleMode(DEGREES)` switches to degrees. Calling
   * `angleMode(RADIANS)` switches back to radians.Calling `angleMode()` with no arguments returns current angle mode, which
   * is either `RADIANS` or `DEGREES`.
 *
   * @param
   */
  angleMode(mode: RADIANS | DEGREES): void;

  angleMode(): RADIANS | DEGREES;

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
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  arc(x: number, y: number, w: number, h: number, start: number, stop: number, mode: CHORD | PIE | OPEN, detail: number): void;

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
   * @param
   * @param
   * @param
   * @param
   */
  ellipse(x: number, y: number, w: number, h: number): void;

  ellipse(x: number, y: number, w: number, h: number, detail: number): void;

  /**
   * Draws a circle.A circle is a round shape defined by the `x`, `y`, and `d` parameters.
   * `x` and `y` set the location of its center. `d` sets its width and height (diameter).
   * Every point on the circle's edge is the same distance, `0.5 * d`, from its center.
   * `0.5 * d` (half the diameter) is the circle's radius.
   * See ellipseMode() for other ways to set its position.
 *
   * @param
   * @param
   * @param
   */
  circle(x: number, y: number, d: number): void;

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
   * @param
   * @param
   * @param
   * @param
   */
  line(x1: number, y1: number, x2: number, y2: number): void;

  line(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void;

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
   * @param
   * @param
   * @param
   */
  point(x: number, y: number, z: number): void;

  point(coordinateVector: p5.Vector): void;

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
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  quad(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, detailX: number, detailY: number): void;

  quad(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number, x4: number, y4: number, z4: number, detailX: number, detailY: number): void;

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
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  rect(x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): void;

  rect(x: number, y: number, w: number, h: number, detailX: number, detailY: number): void;

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
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  square(x: number, y: number, s: number, tl: number, tr: number, br: number, bl: number): void;

  /**
   * Draws a triangle.A triangle is a three-sided shape defined by three points. The
   * first two parameters specify the triangle's first point `(x1, y1)`. The
   * middle two parameters specify its second point `(x2, y2)`. And the last two
   * parameters specify its third point `(x3, y3)`.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void;

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
   * @param
   */
  ellipseMode(mode: CENTER | RADIUS | CORNER | CORNERS): void;

  /**
   * Draws certain features with jagged (aliased) edges.smooth() is active by default. In 2D mode,
   * `noSmooth()` is helpful for scaling up images without blurring. The
   * functions don't affect shapes or fonts.In WebGL mode, `noSmooth()` causes all shapes to be drawn with jagged
   * (aliased) edges. The functions don't affect images or fonts.
   */
  noSmooth(): void;

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
   * @param
   */
  rectMode(mode: CENTER | RADIUS | CORNER | CORNERS): void;

  /**
   * Draws certain features with smooth (antialiased) edges.`smooth()` is active by default. In 2D mode,
   * noSmooth() is helpful for scaling up images
   * without blurring. The functions don't affect shapes or fonts.In WebGL mode, noSmooth() causes all shapes to
   * be drawn with jagged (aliased) edges. The functions don't affect images or
   * fonts.
   */
  smooth(): void;

  /**
   * Sets the style for rendering the ends of lines.The caps for line endings are either rounded (`ROUND`), squared
   * (`SQUARE`), or extended (`PROJECT`). The default cap is `ROUND`.The argument passed to `strokeCap()` must be written in ALL CAPS because
   * the constants `ROUND`, `SQUARE`, and `PROJECT` are defined this way.
   * JavaScript is a case-sensitive language.
 *
   * @param
   */
  strokeCap(cap: ROUND | SQUARE | PROJECT): void;

  /**
   * Sets the style of the joints that connect line segments.Joints are either mitered (`MITER`), beveled (`BEVEL`), or rounded
   * (`ROUND`). The default joint is `MITER` in 2D mode and `ROUND` in WebGL
   * mode.The argument passed to `strokeJoin()` must be written in ALL CAPS because
   * the constants `MITER`, `BEVEL`, and `ROUND` are defined this way.
   * JavaScript is a case-sensitive language.
 *
   * @param
   */
  strokeJoin(join: MITER | BEVEL | ROUND): void;

  /**
   * Sets the width of the stroke used for points, lines, and the outlines of
   * shapes.Note: `strokeWeight()` is affected by transformations, especially calls to
   * scale().
 *
   * @param
   */
  strokeWeight(weight: number): void;

  /**
   * Draws a Bézier curve.Bézier curves can form shapes and curves that slope gently. They're defined
   * by two anchor points and two control points. Bézier curves provide more
   * control than the spline curves created with the
   * spline() function.The first two parameters, `x1` and `y1`, set the first anchor point. The
   * first anchor point is where the curve starts.The next four parameters, `x2`, `y2`, `x3`, and `y3`, set the two control
   * points. The control points "pull" the curve towards them.The seventh and eighth parameters, `x4` and `y4`, set the last anchor
   * point. The last anchor point is where the curve ends.Bézier curves can also be drawn in 3D using WebGL mode. The 3D version of
   * `bezier()` has twelve arguments because each point has x-, y-,
   * and z-coordinates.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  bezier(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;

  bezier(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number, x4: number, y4: number, z4: number): void;

  /**
   * Calculates coordinates along a Bézier curve using interpolation.`bezierPoint()` calculates coordinates along a Bézier curve using the
   * anchor and control points. It expects points in the same order as the
   * bezier() function. `bezierPoint()` works one axis
   * at a time. Passing the anchor and control points' x-coordinates will
   * calculate the x-coordinate of a point on the curve. Passing the anchor and
   * control points' y-coordinates will calculate the y-coordinate of a point on
   * the curve.The first parameter, `a`, is the coordinate of the first anchor point.The second and third parameters, `b` and `c`, are the coordinates of the
   * control points.The fourth parameter, `d`, is the coordinate of the last anchor point.The fifth parameter, `t`, is the amount to interpolate along the curve. 0
   * is the first anchor point, 1 is the second anchor point, and 0.5 is halfway
   * between them.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  bezierPoint(a: number, b: number, c: number, d: number, t: number): number;

  /**
   * Calculates coordinates along a line that's tangent to a Bézier curve.Tangent lines skim the surface of a curve. A tangent line's slope equals
   * the curve's slope at the point where it intersects.`bezierTangent()` calculates coordinates along a tangent line using the
   * Bézier curve's anchor and control points. It expects points in the same
   * order as the bezier() function. `bezierTangent()`
   * works one axis at a time. Passing the anchor and control points'
   * x-coordinates will calculate the x-coordinate of a point on the tangent
   * line. Passing the anchor and control points' y-coordinates will calculate
   * the y-coordinate of a point on the tangent line.The first parameter, `a`, is the coordinate of the first anchor point.The second and third parameters, `b` and `c`, are the coordinates of the
   * control points.The fourth parameter, `d`, is the coordinate of the last anchor point.The fifth parameter, `t`, is the amount to interpolate along the curve. 0
   * is the first anchor point, 1 is the second anchor point, and 0.5 is halfway
   * between them.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  bezierTangent(a: number, b: number, c: number, d: number, t: number): number;

  /**
   * Draws a curve using a Catmull-Rom spline.Spline curves can form shapes and curves that slope gently. They’re like
   * cables that are attached to a set of points. By default (`ends: INCLUDE`),
   * the curve passes through all four points you provide, in order
   * `p0(x1,y1)` -> `p1(x2,y2)` -> `p2(x3,y3)` -> `p3(x4,y4)`. Think of them as
   * points on a curve. If you switch to `ends: EXCLUDE`, p0 and p3 act
   * like control points and only the middle span `p1->p2` is drawn.Spline curves can also be drawn in 3D using WebGL mode. The 3D version of
   * `spline()` has twelve arguments because each point has x-, y-, and
   * z-coordinates.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  spline(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;

  spline(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number, x4: number, y4: number, z4: number): void;

  /**
   * Calculates coordinates along a spline curve using interpolation.`splinePoint()` calculates coordinates along a spline curve using four
   * points p0, p1, p2, p3. It expects points in the same order as the
   * spline() function. `splinePoint()` works one axis
   * at a time. Passing the points' x-coordinates will
   * calculate the x-coordinate of a point on the curve. Passing the
   * points' y-coordinates will calculate the y-coordinate of a point on
   * the curve.The first parameter, `a`, is the coordinate of point p0.The second and third parameters, `b` and `c`, are the coordinates of
   * points p1 and p2.The fourth parameter, `d`, is the coordinate of point p3.The fifth parameter, `t`, is the amount to interpolate along the span
   * from p1 to p2. `t = 0` is p1, `t = 1` is p2, and `t = 0.5` is halfway
   * between them.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  splinePoint(a: number, b: number, c: number, d: number, t: number): number;

  /**
   * Calculates coordinates along a line that's tangent to a spline curve.Tangent lines skim the surface of a curve. A tangent line's slope equals
   * the curve's slope at the point where it intersects.`splineTangent()` calculates coordinates along a tangent line using four
   * points p0, p1, p2, p3. It expects points in the same order as the
   * spline() function. `splineTangent()` works one
   * axis at a time. Passing the points' x-coordinates returns the x-component of
   * the tangent vector; passing the points' y-coordinates returns the y-component.
   * The first parameter, `a`, is the coordinate of point p0.The second and third parameters, `b` and `c`, are the coordinates of
   * points p1 and p2.The fourth parameter, `d`, is the coordinate of point p3.The fifth parameter, `t`, is the amount to interpolate along the span
   * from p1 to p2. `t = 0` is p1, `t = 1` is p2, and `t = 0.5` is halfway
   * between them.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  splineTangent(a: number, b: number, c: number, d: number, t: number): number;

  /**
   * Influences the shape of the Bézier curve segment in a custom shape.
   * By default, this is 3; the other possible parameter is 2. This
   * results in quadratic Bézier curves.`bezierVertex()` adds a curved segment to custom shapes. The Bézier curves
   * it creates are defined like those made by the
   * bezier() function. `bezierVertex()` must be
   * called between the
   * beginShape() and
   * endShape() functions. There must be at least
   * one call to bezierVertex(), before
   * a number of `bezierVertex()` calls that is a multiple of the parameter
   * set by bezierOrder(...) (default 3).Each curve of order 3 requires three calls to `bezierVertex`, so
   * 2 curves would need 7 calls to `bezierVertex()`:
   * (1 one initial anchor point, two sets of 3 curves describing the curves)
   * With `bezierOrder(2)`, two curves would need 5 calls: 1 + 2 + 2.Bézier curves can also be drawn in 3D using WebGL mode.Note: `bezierVertex()` won’t work when an argument is passed to
   * beginShape().
 *
   * @param
   */
  bezierOrder(order: number): void;

  bezierOrder(): number;

  /**
   * Connects points with a smooth curve (a spline).`splineVertex()` adds a curved segment to custom shapes.
   * The curve it creates follows the same rules as the ones
   * made with the spline() function.
   * `splineVertex()` must be called between the
   * beginShape() and
   * endShape() functions.Spline curves can form shapes and curves that slope gently. They’re like
   * cables that are attached to a set of points. `splineVertex()` draws a smooth
   * curve through the points you give it.
   * beginShape() and
   * endShape() in order to draw a curve:If you provide three points, the spline will pass through them.
   * It works the same way with any number of points.`beginShape();
   * 
   * // Add the first point.
   * splineVertex(25, 80);
   * 
   * // Add the second point.
   * splineVertex(20, 30);
   * 
   * // Add the last point.
   * splineVertex(85, 60);
   * 
   * endShape();`Passing in `CLOSE` to `endShape()` closes the spline smoothly.`beginShape();
   * 
   * // Add the first point.
   * splineVertex(25, 80);
   * 
   * // Add the second point.
   * splineVertex(20, 30);
   * 
   * // Add the second point.
   * splineVertex(85, 60);
   * 
   * endShape(CLOSE);`By default (`ends: INCLUDE`), the curve passes through
   * all the points you add with `splineVertex()`, similar to
   * the spline() function. To draw only
   * the middle span p1->p2 (skipping p0->p1 and p2->p3), set
   * `splineProperty('ends', EXCLUDE)`. You don’t need to duplicate
   * vertices to draw those spans.Spline curves can also be drawn in 3D using WebGL mode. The 3D version of
   * `splineVertex()` has three arguments because each point has x-, y-, and
   * z-coordinates. By default, the vertex’s z-coordinate is set to 0.Note: `splineVertex()` won’t work when an argument is passed to
   * beginShape().
 *
   * @param
   * @param
   */
  splineVertex(x: number, y: number): void;

  splineVertex(x: number, y: number, z: number): void;

  splineVertex(x: number, y: number, u: number, v: number): void;

  splineVertex(x: number, y: number, z: number, u: number, v: number): void;

  /**
   * Gets or sets a given spline property.Use `splineProperty()` to adjust the behavior of splines
   * created with `splineVertex()` or `spline()`. You can control
   * two key aspects of a spline: its end behavior (`ends`) and
   * its curvature (`tightness`).By default, the ends property is set to `INCLUDE`, which means
   * the spline passes through every point, including the endpoints.
   * You can also set it to `EXCLUDE` i.e. `splineProperty('ends', EXCLUDE)`,
   * which makes the spline pass through all points except the endpoints.`INCLUDE` case will have the spline passing through
   * all points, like this:`splineProperty('ends', INCLUDE); // no need to set this, as it is the default
   * spline(25, 46, 93, 44, 93, 81, 35, 85);
   * 
   * point(25, 46);
   * point(93, 44);
   * point(93, 81);
   * point(35, 85);`EXCLUDE case will have the spline passing through
   * the middle points, like this:`splineProperty('ends', INCLUDE);
   * spline(25, 46, 93, 44, 93, 81, 35, 85);
   * 
   * point(25, 46);
   * point(93, 44);
   * point(93, 81);
   * point(35, 85);`By default, the tightness property is set to `0`,
   * producing a smooth curve that passes evenly through
   * the vertices. Negative values make the curve looser,
   * while positive values make it tighter. Common values
   * range between -1 and 1, though values outside this
   * range can also be used for different effects.For example, To set tightness, use `splineProperty('tightness', t)`,
   * (default: t = 0).Here's the example showing negetive value of tightness,
   * which creates a rounder bulge:`splineProperty('tightness', -5)
   * stroke(0);
   * strokeWeight(2);
   * spline(25, 46, 93, 44, 93, 81, 35, 85);`Here's the example showing positive value of tightness,
   * which makes the curve tighter and more angular:`splineProperty('tightness', 5)
   * stroke(0);
   * strokeWeight(2);
   * spline(25, 46, 93, 44, 93, 81, 35, 85);`In all cases, the splines in p5.js are cardinal splines.
   * When tightness is 0, these splines are often known as
   * Catmull-Rom splines
 *
   * @param
   * @param
   */
  splineProperty(property: string, value: any): void;

  splineProperty(property: string): any;

  /**
   * Get or set multiple spline properties at once.Similar to splineProperty():
   * `splineProperty('tightness', t)` is the same as
   * `splineProperties({'tightness': t})`
 *
   * @param
   */
  splineProperties(properties: object): void;

  splineProperties(): object;

  /**
   * Adds a vertex to a custom shape.`vertex()` sets the coordinates of vertices drawn between the
   * beginShape() and
   * endShape() functions.The first two parameters, `x` and `y`, set the x- and y-coordinates of the
   * vertex.The third parameter, `z`, is optional. It sets the z-coordinate of the
   * vertex in WebGL mode. By default, `z` is 0.The fourth and fifth parameters, `u` and `v`, are also optional. They set
   * the u- and v-coordinates for the vertex’s texture when used with
   * endShape(). By default, `u` and `v` are both 0.
 *
   * @param
   * @param
   */
  vertex(x: number, y: number): void;

  vertex(x: number, y: number, u: number, v: number): void;

  vertex(x: number, y: number, z: number, u: number, v: number): void;

  /**
   * Begins creating a hole within a flat shape.The `beginContour()` and endContour()
   * functions allow for creating negative space within custom shapes that are
   * flat. `beginContour()` begins adding vertices to a negative space and
   * endContour() stops adding them.
   * `beginContour()` and endContour() must be
   * called between beginShape() and
   * endShape().Transformations such as translate(),
   * rotate(), and scale()
   * don't work between `beginContour()` and
   * endContour(). It's also not possible to use
   * other shapes, such as ellipse() or
   * rect(), between `beginContour()` and
   * endContour().Note: The vertices that define a negative space must "wind" in the opposite
   * direction from the outer shape. First, draw vertices for the outer shape
   * clockwise order. Then, draw vertices for the negative space in
   * counter-clockwise order.
   */
  beginContour(): void;

  /**
   * Stops creating a hole within a flat shape.The beginContour() and `endContour()`
   * functions allow for creating negative space within custom shapes that are
   * flat. beginContour() begins adding vertices
   * to a negative space and `endContour()` stops adding them.
   * beginContour() and `endContour()` must be
   * called between beginShape() and
   * endShape().By default,
   * the controur has an `OPEN` end, and to close it,
   * call `endContour(CLOSE)`. The CLOSE contour mode closes splines smoothly.Transformations such as translate(),
   * rotate(), and scale()
   * don't work between beginContour() and
   * `endContour()`. It's also not possible to use other shapes, such as
   * ellipse() or rect(),
   * between beginContour() and `endContour()`.Note: The vertices that define a negative space must "wind" in the opposite
   * direction from the outer shape. First, draw vertices for the outer shape
   * clockwise order. Then, draw vertices for the negative space in
   * counter-clockwise order.
 *
   * @param
   */
  endContour(mode: OPEN | CLOSE): void;

  /**
   * Begins adding vertices to a custom shape.The `beginShape()` and endShape() functions
   * allow for creating custom shapes in 2D or 3D. `beginShape()` begins adding
   * vertices to a custom shape and endShape() stops
   * adding them.The parameter, `kind`, sets the kind of shape to make. The available kinds are:After calling `beginShape()`, shapes can be built by calling
   * vertex(),
   * bezierVertex(), and/or
   * splineVertex(). Calling
   * endShape() will stop adding vertices to the
   * shape. Each shape will be outlined with the current stroke color and filled
   * with the current fill color.Transformations such as translate(),
   * rotate(), and
   * scale() don't work between `beginShape()` and
   * endShape(). It's also not possible to use
   * other shapes, such as ellipse() or
   * rect(), between `beginShape()` and
   * endShape().
 *
   * @param
   */
  beginShape(kind: POINTS | LINES | TRIANGLES | TRIANGLE_FAN | TRIANGLE_STRIP | QUADS | QUAD_STRIP | PATH): void;

  /**
   * Adds a Bézier curve segment to a custom shape.`bezierVertex()` adds a curved segment to custom shapes. The Bézier curves
   * it creates are defined like those made by the
   * bezier() function. `bezierVertex()` must be
   * called between the
   * beginShape() and
   * endShape() functions.
   * Bézier need a starting point. Building a shape
   * only with Bézier curves needs one initial
   * call to bezierVertex(), before
   * a number of `bezierVertex()` calls that is a multiple of the parameter
   * set by bezierOrder(...) (default 3).
   * But shapes can mix different types of vertices, so if there
   * are some previous vertices, then the initial anchor is not needed,
   * only the multiples of 3 (or the Bézier order) calls to
   * `bezierVertex` for each curve.Each curve of order 3 requires three calls to `bezierVertex`, so
   * 2 curves would need 7 calls to `bezierVertex()`:
   * (1 one initial anchor point, two sets of 3 curves describing the curves)
   * With `bezierOrder(2)`, two curves would need 5 calls: 1 + 2 + 2.Bézier curves can also be drawn in 3D using WebGL mode.Note: `bezierVertex()` won’t work when an argument is passed to
   * beginShape().
 *
   * @param
   * @param
   * @param
   * @param
   */
  bezierVertex(x: number, y: number, u: number, v: number): void;

  bezierVertex(x: number, y: number, z: number, u: number, v: number): void;

  /**
   * Concludes the vertices of a custom shape.The beginShape() and `endShape()` functions
   * allow for creating custom shapes in 2D or 3D.
   * beginShape() begins adding vertices to a
   * custom shape and `endShape()` stops adding them.The first parameter, `mode`, is optional. By default, the first and last
   * vertices of a shape aren't connected. If the constant `CLOSE` is passed, as
   * in `endShape(CLOSE)`, then the first and last vertices will be connected.
   * When CLOSE mode is used for splines (with `splineVeertex()`), the shape is ended smoothly.The second parameter, `count`, is also optional. In WebGL mode, it’s more
   * efficient to draw many copies of the same shape using a technique called
   * instancing.
   * The `count` parameter tells WebGL mode how many copies to draw. For
   * example, calling `endShape(CLOSE, 400)` after drawing a custom shape will
   * make it efficient to draw 400 copies. This feature requires
   * writing a custom shader.After calling beginShape(), shapes can be
   * built by calling vertex(),
   * bezierVertex() and/or
   * splineVertex(). Calling
   * `endShape()` will stop adding vertices to the
   * shape. Each shape will be outlined with the current stroke color and filled
   * with the current fill color.Transformations such as translate(),
   * rotate(), and
   * scale() don't work between
   * beginShape() and `endShape()`. It's also not
   * possible to use other shapes, such as ellipse() or
   * rect(), between
   * beginShape() and `endShape()`.
 *
   * @param
   * @param
   */
  endShape(mode: CLOSE, count: number): void;

  /**
   * Sets the normal vector for vertices in a custom 3D shape.3D shapes created with beginShape() and
   * endShape() are made by connecting sets of
   * points called vertices. Each vertex added with
   * vertex() has a normal vector that points away
   * from it. The normal vector controls how light reflects off the shape.`normal()` can be called two ways with different parameters to define the
   * normal vector's components.The first way to call `normal()` has three parameters, `x`, `y`, and `z`.
   * If `Number`s are passed, as in `normal(1, 2, 3)`, they set the x-, y-, and
   * z-components of the normal vector.The second way to call `normal()` has one parameter, `vector`. If a
   * p5.Vector object is passed, as in
   * `normal(myVector)`, its components will be used to set the normal vector.`normal()` changes the normal vector of vertices added to a custom shape
   * with vertex(). `normal()` must be called between
   * the beginShape() and
   * endShape() functions, just like
   * vertex(). The normal vector set by calling
   * `normal()` will affect all following vertices until `normal()` is called
   * again:`beginShape();
   * 
   * // Set the vertex normal.
   * normal(-0.4, -0.4, 0.8);
   * 
   * // Add a vertex.
   * vertex(-30, -30, 0);
   * 
   * // Set the vertex normal.
   * normal(0, 0, 1);
   * 
   * // Add vertices.
   * vertex(30, -30, 0);
   * vertex(30, 30, 0);
   * 
   * // Set the vertex normal.
   * normal(0.4, -0.4, 0.8);
   * 
   * // Add a vertex.
   * vertex(-30, 30, 0);
   * 
   * endShape();`
 *
   * @param
   */
  normal(vector: p5.Vector): void;

  normal(x: number, y: number, z: number): void;

  /**
   * Sets the shader's vertex property or attribute variables.A vertex property, or vertex attribute, is a variable belonging to a vertex in a shader. p5.js provides some
   * default properties, such as `aPosition`, `aNormal`, `aVertexColor`, etc. These are
   * set using vertex(), normal()
   * and fill() respectively. Custom properties can also
   * be defined within beginShape() and
   * endShape().The first parameter, `propertyName`, is a string with the property's name.
   * This is the same variable name which should be declared in the shader, such as
   * `in vec3 aProperty`, similar to .`setUniform()`.The second parameter, `data`, is the value assigned to the shader variable. This
   * value will be applied to subsequent vertices created with
   * vertex(). It can be a Number or an array of numbers,
   * and in the shader program the type can be declared according to the WebGL
   * specification. Common types include `float`, `vec2`, `vec3`, `vec4` or matrices.See also the vertexProperty() method on
   * Geometry objects.
 *
   * @param
   * @param
   */
  vertexProperty(attributeName: string, data: number | number[]): void;

  /**
   * Loads a font and creates a p5.Font object.
   * `loadFont()` can load fonts in either .otf or .ttf format. Loaded fonts can
   * be used to style text on the canvas and in HTML elements.The first parameter, `path`, is the path to a font file.
   * Paths to local files should be relative. For example,
   * `'assets/inconsolata.otf'`. The Inconsolata font used in the following
   * examples can be downloaded for free
   * here.
   * Paths to remote files should be URLs. For example,
   * `'https://example.com/inconsolata.otf'`. URLs may be blocked due to browser
   * security.In 2D mode, `path` can take on a few other forms. It could be a path to a CSS file,
   * such as one from Google Fonts. It could also
   * be a string with a CSS `@font-face` declaration.The second parameter, `successCallback`, is optional. If a function is
   * passed, it will be called once the font has loaded. The callback function
   * may use the new p5.Font object if needed.The third parameter, `failureCallback`, is also optional. If a function is
   * passed, it will be called if the font fails to load. The callback function
   * may use the error
   * Event
   * object if needed.Fonts can take time to load. `await` the result of `loadFont()` in
   * setup() before using the result.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  loadFont(path: string, name: string, options: object, successCallback: Function, failureCallback: Function): Promise<p5.Font>;

  loadFont(path: string, successCallback: Function, failureCallback: Function): Promise<p5.Font>;

  /**
   * Draws text to the canvas.The first parameter, `str`, is the text to be drawn. The second and third
   * parameters, `x` and `y`, set the coordinates of the text's bottom-left
   * corner. See textAlign() for other ways to
   * align text.The fourth and fifth parameters, `maxWidth` and `maxHeight`, are optional.
   * They set the dimensions of the invisible rectangle containing the text. By
   * default, they set its  maximum width and height. See
   * rectMode() for other ways to define the
   * rectangular text box. Text will wrap to fit within the text box. Text
   * outside of the box won't be drawn.Text can be styled a few ways. Call the fill()
   * function to set the text's fill color. Call
   * stroke() and
   * strokeWeight() to set the text's outline.
   * Call textSize() and
   * textFont() to set the text's size and font,
   * respectively.Note: `WEBGL` mode only supports fonts loaded with
   * loadFont(). Calling
   * stroke() has no effect in `WEBGL` mode.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  text(str: string | object | Array | number | boolean, x: number, y: number, maxWidth: number, maxHeight: number): void;

  /**
   * Sets the way text is aligned when text() is called.By default, calling `text('hi', 10, 20)` places the bottom-left corner of
   * the text's bounding box at (10, 20).The first parameter, `horizAlign`, changes the way
   * text() interprets x-coordinates. By default, the
   * x-coordinate sets the left edge of the bounding box. `textAlign()` accepts
   * the following values for `horizAlign`: `LEFT`, `CENTER`, or `RIGHT`.The second parameter, `vertAlign`, is optional. It changes the way
   * text() interprets y-coordinates. By default, the
   * y-coordinate sets the bottom edge of the bounding box. `textAlign()`
   * accepts the following values for `vertAlign`: `TOP`, `BOTTOM`, `CENTER`,
   * or `BASELINE`.
 *
   * @param
   * @param
   */
  textAlign(horizAlign: LEFT | CENTER | RIGHT, vertAlign: TOP | BOTTOM | CENTER | BASELINE): void;

  /**
   * Returns the ascent of the text.The `textAscent()` function calculates the distance from the baseline to the
   * highest point of the current font. This value represents the ascent, which is essential
   * for determining the overall height of the text along with `textDescent()`. If
   * a text string is provided as an argument, the ascent is calculated based on that specific
   * string; otherwise, the ascent of the current font is returned.
 *
   * @param
   */
  textAscent(txt: string): number;

  /**
   * Returns the descent of the text.The `textDescent()` function calculates the distance from the baseline to the
   * lowest point of the current font. This value represents the descent, which, when combined
   * with the ascent (from `textAscent()`), determines the overall vertical span of the text.
   * If a text string is provided as an argument, the descent is calculated based on that specific string;
   * otherwise, the descent of the current font is returned.
 *
   * @param
   */
  textDescent(txt: string): number;

  /**
   * Sets the spacing between lines of text when
   * text() is called.Note: Spacing is measured in pixels.Calling `textLeading()` without an argument returns the current spacing.
 *
   * @param
   */
  textLeading(leading: number): number;

  /**
   * Sets the font used by the text() function.The first parameter, `font`, sets the font. `textFont()` recognizes either
   * a p5.Font object or a string with the name of a
   * system font. For example, `'Courier New'`.The second parameter, `size`, is optional. It sets the font size in pixels.
   * This has the same effect as calling textSize().Note: `WEBGL` mode only supports fonts loaded with
   * loadFont().
 *
   * @param
   * @param
   */
  textFont(font: p5.Font | string | object, size: number): void;

  /**
   * Sets or gets the current text size.The `textSize()` function is used to specify the size of the text
   * that will be rendered on the canvas. When called with an argument, it sets the
   * text size to the specified value (which can be a number representing pixels or a
   * CSS-style string, e.g., '32px', '2em'). When called without an argument, it
   * returns the current text size in pixels.
 *
   * @param
   */
  textSize(size: number): number;

  textSize(): number;

  /**
   * Sets the style for system fonts when
   * text() is called.The parameter, `style`, can be either `NORMAL`, `ITALIC`, `BOLD`, or
   * `BOLDITALIC`.`textStyle()` may be overridden by CSS styling. This function doesn't
   * affect fonts loaded with loadFont().
 *
   * @param
   */
  textStyle(style: NORMAL | ITALIC | BOLD | BOLDITALIC): NORMAL | ITALIC | BOLD | BOLDITALIC;

  textStyle(): NORMAL | BOLD | ITALIC | BOLDITALIC;

  /**
   * Calculates the width of the given text string in pixels.The `textWidth()` function processes the provided text string to determine its tight bounding box
   * based on the current text properties such as font, textSize, and textStyle. Internally, it splits
   * the text into individual lines (if line breaks are present) and computes the bounding box for each
   * line using the renderer’s measurement functions. The final width is determined as the maximum width
   * among all these lines.For example, if the text contains multiple lines due to wrapping or explicit line breaks, textWidth()
   * will return the width of the longest line.
 *
   * @param
   */
  textWidth(text: string): number;

  /**
   * Sets the style for wrapping text when
   * text() is called.The parameter, `style`, can be one of the following values:`WORD` starts new lines of text at spaces. If a string of text doesn't
   * have spaces, it may overflow the text box and the canvas. This is the
   * default style.`CHAR` starts new lines as needed to stay within the text box.`textWrap()` only works when the maximum width is set for a text box. For
   * example, calling `text('Have a wonderful day', 0, 10, 100)` sets the
   * maximum width to 100 pixels.Calling `textWrap()` without an argument returns the current style.
 *
   * @param
   */
  textWrap(style: WORD | CHAR): CHAR | WORD;

  textWrap(): CHAR | WORD;

  /**
   * Computes the tight bounding box for a block of text.The `textBounds()` function calculates the precise pixel boundaries that enclose
   * the rendered text based on the current text properties (such as font, textSize, textStyle, and
   * alignment). If the text spans multiple lines (due to line breaks or wrapping), the function
   * measures each line individually and then aggregates these measurements into a single bounding box.
   * The resulting object contains the x and y coordinates along with the width (w) and height (h)
   * of the text block.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  textBounds(str: string, x: number, y: number, width: number, height: number): object;

  /**
   * Sets or gets the text drawing direction.The textDirection() function allows you to specify the direction in which text is
   * rendered on the canvas. When provided with a direction parameter (such as "ltr" for
   * left-to-right, "rtl" for right-to-left, or "inherit"), it updates the renderer's state with that
   * value and applies the new setting. When called without any arguments, it returns the current text
   * direction. This function is particularly useful for rendering text in languages with different
   * writing directions.
 *
   * @param
   */
  textDirection(direction: string): string;

  textDirection(): string;

  /**
   * Sets or gets a single text property for the renderer.The `textProperty()` function allows you to set or retrieve a single text-related property,
   * such as `textAlign`, `textBaseline`, `fontStyle`, or any other property
   * that may be part of the renderer's state, its drawing context, or the canvas style.When called with a `prop` and a `value`, the function sets the property by checking
   * for its existence in the renderer's state, the drawing context, or the canvas style. If the property is
   * successfully modified, the function applies the updated text properties. If called with only the
   * `prop` parameter, the function returns the current value of that property.
 *
   * @param
   * @param
   */
  textProperty(prop: string, value: any): any;

  textProperty(prop: string): any;

  /**
   * Gets or sets text properties in batch, similar to calling `textProperty()`
   * multiple times.If an object is passed in, `textProperty(key, value)` will be called for you
   * on every key/value pair in the object.If no arguments are passed in, an object will be returned with all the current
   * properties.
 *
   * @param
   */
  textProperties(properties: object): void;

  textProperties(): object;

  /**
   * Computes a generic (non-tight) bounding box for a block of text.The `fontBounds()` function calculates the bounding box for the text based on the
   * font's intrinsic metrics (such as `fontBoundingBoxAscent` and
   * `fontBoundingBoxDescent`). Unlike `textBounds()`, which measures the exact
   * pixel boundaries of the rendered text, `fontBounds()` provides a looser measurement
   * derived from the font’s default spacing. This measurement is useful for layout purposes where
   * a consistent approximation of the text's dimensions is desired.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  fontBounds(str: string, x: number, y: number, width: number, height: number): object;

  /**
   * Returns the loose width of a text string based on the current font.The `fontWidth()` function measures the width of the provided text string using
   * the font's default measurement (i.e., the width property from the text metrics returned by
   * the browser). Unlike `textWidth()`, which calculates the tight pixel boundaries
   * of the text glyphs, `fontWidth()` uses the font's intrinsic spacing, which may include
   * additional space for character spacing and kerning. This makes it useful for scenarios where
   * an approximate width is sufficient for layout and positioning.
 *
   * @param
   */
  fontWidth(theText: string): number;

  /**
   * Returns the loose ascent of the text based on the font's intrinsic metrics.The `fontAscent()` function calculates the ascent of the text using the font's
   * intrinsic metrics (e.g., `fontBoundingBoxAscent`). This value represents the space
   * above the baseline that the font inherently occupies, and is useful for layout purposes when
   * an approximate vertical measurement is required.
   */
  fontAscent(): number;

  /**
   * Returns the loose descent of the text based on the font's intrinsic metrics.The `fontDescent()` function calculates the descent of the text using the font's
   * intrinsic metrics (e.g., `fontBoundingBoxDescent`). This value represents the space
   * below the baseline that the font inherently occupies, and is useful for layout purposes when
   * an approximate vertical measurement is required.
   */
  fontDescent(): number;

  /**
   * Sets or gets the current font weight.The textWeight() function is used to specify the weight (thickness) of the text.
   * When a numeric value is provided, it sets the font weight to that value and updates the
   * rendering properties accordingly (including the "font-variation-settings" on the canvas style).
   * When called without an argument, it returns the current font weight setting.
 *
   * @param
   */
  textWeight(weight: number): number;

  textWeight(): number;

  /**
   * Converts a `String` to a floating point (decimal) `Number`.`float()` converts strings that resemble numbers, such as `'12.34'`, into
   * numbers.The parameter, `str`, is the string value to convert. For example, calling
   * `float('12.34')` returns the number `12.34`.  If an array of strings is
   * passed, as in `float(['12.34', '56.78'])`, then an array of numbers will be
   * returned.Note: If a string can't be converted to a number, as in `float('giraffe')`,
   * then the value `NaN` (not a number) will be returned.
 *
   * @param
   */
  float(str: string): number;

  float(ns: string[]): number[];

  /**
   * Converts a `Boolean`, `String`, or decimal `Number` to an integer.`int()` converts values to integers. Integers are positive or negative
   * numbers without decimals. If the original value has decimals, as in -34.56,
   * they're removed to produce an integer such as -34.The parameter, `n`, is the value to convert. If `n` is a Boolean, as in
   * `int(false)` or `int(true)`, then the number 0 (`false`) or 1 (`true`) will
   * be returned. If `n` is a string or number, as in `int('45')` or
   * `int(67.89)`, then an integer will be returned. If an array is passed, as
   * in `int([12.34, 56.78])`, then an array of integers will be returned.Note: If a value can't be converted to a number, as in `int('giraffe')`,
   * then the value `NaN` (not a number) will be returned.
 *
   * @param
   */
  int(n: string | boolean | number): number;

  int(ns: Array): number[];

  /**
   * Converts a `Boolean` or `Number` to `String`.`str()` converts values to strings. See the
   * String reference page for guidance on using
   * template literals instead.The parameter, `n`, is the value to convert. If `n` is a Boolean, as in
   * `str(false)` or `str(true)`, then the value will be returned as a string,
   * as in `'false'` or `'true'`. If `n` is a number, as in `str(123)`, then its
   * value will be returned as a string, as in `'123'`. If an array is passed,
   * as in `str([12.34, 56.78])`, then an array of strings will be returned.
 *
   * @param
   */
  str(n: string | boolean | number): string;

  /**
   * Converts a `String` or `Number` to a `Boolean`.`boolean()` converts values to `true` or `false`.The parameter, `n`, is the value to convert. If `n` is a string, then
   * `boolean('true')` will return `true` and every other string value will
   * return `false`. If `n` is a number, then `boolean(0)` will return `false`
   * and every other numeric value will return `true`. If an array is passed, as
   * `in boolean([0, 1, 'true', 'blue'])`, then an array of Boolean values will
   * be returned.
 *
   * @param
   */
  boolean(n: string | boolean | number): boolean;

  boolean(ns: Array): boolean[];

  /**
   * Converts a `Boolean`, `String`, or `Number` to its byte value.`byte()` converts a value to an integer (whole number) between -128 and
   * 127. Values greater than 127 wrap around while negative values are
   * unchanged. For example, 128 becomes -128 and -129 remains the same.The parameter, `n`, is the value to convert. If `n` is a Boolean, as in
   * `byte(false)` or `byte(true)`, the number 0 (`false`) or 1 (`true`) will be
   * returned. If `n` is a string or number, as in `byte('256')` or `byte(256)`,
   * then the byte value will be returned. Decimal values are ignored. If an
   * array is passed, as in `byte([true, 123, '456'])`, then an array of byte
   * values will be returned.Note: If a value can't be converted to a number, as in `byte('giraffe')`,
   * then the value `NaN` (not a number) will be returned.
 *
   * @param
   */
  byte(n: string | boolean | number): number;

  byte(ns: Array): number[];

  byte(v: number): void;

  /**
   * Converts a `Number` or `String` to a single-character `String`.`char()` converts numbers to their single-character string representations.The parameter, `n`, is the value to convert. If a number is passed, as in
   * `char(65)`, the corresponding single-character string is returned. If a
   * string is passed, as in `char('65')`, the string is converted to an integer
   * (whole number) and the corresponding single-character string is returned.
   * If an array is passed, as in `char([65, 66, 67])`, an array of
   * single-character strings is returned.See MDN
   * for more information about conversions.
 *
   * @param
   */
  char(n: string | number): string;

  char(ns: Array): string[];

  /**
   * Converts a single-character `String` to a `Number`.`unchar()` converts single-character strings to their corresponding
   * integer (whole number).The parameter, `n`, is the character to convert. For example,
   * `unchar('A')`, returns the number 65. If an array is passed, as in
   * `unchar(['A', 'B', 'C'])`, an array of integers is returned.
 *
   * @param
   */
  unchar(n: string): number;

  unchar(ns: string[]): number[];

  /**
   * Converts a `Number` to a `String` with its hexadecimal value.`hex()` converts a number to a string with its hexadecimal number value.
   * Hexadecimal (hex) numbers are base-16, which means there are 16 unique
   * digits. Hex extends the numbers 0–9 with the letters A–F. For example, the
   * number `11` (eleven) in base-10 is written as the letter `B` in hex.The first parameter, `n`, is the number to convert. For example, `hex(20)`,
   * returns the string `'00000014'`. If an array is passed, as in
   * `hex([1, 10, 100])`, an array of hexadecimal strings is returned.The second parameter, `digits`, is optional. If a number is passed, as in
   * `hex(20, 2)`, it sets the number of hexadecimal digits to display. For
   * example, calling `hex(20, 2)` returns the string `'14'`.
 *
   * @param
   * @param
   */
  hex(n: number, digits: number): string;

  hex(ns: number[], digits: number): string[];

  /**
   * Converts a `String` with a hexadecimal value to a  `Number`.`unhex()` converts a string with its hexadecimal number value to a number.
   * Hexadecimal (hex) numbers are base-16, which means there are 16 unique
   * digits. Hex extends the numbers 0–9 with the letters A–F. For example, the
   * number `11` (eleven) in base-10 is written as the letter `B` in hex.The first parameter, `n`, is the hex string to convert. For example,
   * `unhex('FF')`, returns the number 255. If an array is passed, as in
   * `unhex(['00', '80', 'FF'])`, an array of numbers is returned.
 *
   * @param
   */
  unhex(n: string): number;

  unhex(ns: string[]): number[];

  /**
   * Returns the current day as a number from 1–31.
   */
  day(): number;

  /**
   * Returns the current hour as a number from 0–23.
   */
  hour(): number;

  /**
   * Returns the current minute as a number from 0–59.
   */
  minute(): number;

  /**
   * Returns the number of milliseconds since a sketch started running.`millis()` keeps track of how long a sketch has been running in
   * milliseconds (thousandths of a second). This information is often
   * helpful for timing events and animations.If a sketch has a
   * setup() function, then `millis()` begins tracking
   * time before the code in setup() runs.  If a
   * sketch includes asynchronous loading using `async`/`await`, then
   * `millis()` begins tracking time as soon as the asynchronous code
   * starts running.
   */
  millis(): number;

  /**
   * Returns the current month as a number from 1–12.
   */
  month(): number;

  /**
   * Returns the current second as a number from 0–59.
   */
  second(): number;

  /**
   * Returns the current year as a number such as 1999.
   */
  year(): number;

  /**
   * Converts a `Number` into a `String` with a given number of digits.`nf()` converts numbers such as `123.45` into strings formatted with a set
   * number of digits, as in `'123.4500'`.The first parameter, `num`, is the number to convert to a string. For
   * example, calling `nf(123.45)` returns the string `'123.45'`. If an array of
   * numbers is passed, as in `nf([123.45, 67.89])`, an array of formatted
   * strings will be returned.The second parameter, `left`, is optional. If a number is passed, as in
   * `nf(123.45, 4)`, it sets the minimum number of digits to include to the
   * left of the decimal place. If `left` is larger than the number of digits in
   * `num`, then unused digits will be set to 0. For example, calling
   * `nf(123.45, 4)` returns the string `'0123.45'`.The third parameter, `right`, is also optional. If a number is passed, as
   * in `nf(123.45, 4, 1)`, it sets the minimum number of digits to include to
   * the right of the decimal place. If `right` is smaller than the number of
   * decimal places in `num`, then `num` will be rounded to the given number of
   * decimal places. For example, calling `nf(123.45, 4, 1)` returns the string
   * `'0123.5'`. If right is larger than the number of decimal places in `num`,
   * then unused decimal places will be set to 0. For example, calling
   * `nf(123.45, 4, 3)` returns the string `'0123.450'`.When the number is negative, for example, calling `nf(-123.45, 5, 2)`
   * returns the string `'-00123.45'`.
 *
   * @param
   * @param
   * @param
   */
  nf(num: number | string, left: number | string, right: number | string): string;

  nf(nums: number[], left: number | string, right: number | string): string[];

  /**
   * Converts a `Number` into a `String` with commas to mark units of 1,000.`nfc()` converts numbers such as 12345 into strings formatted with commas
   * to mark the thousands place, as in `'12,345'`.The first parameter, `num`, is the number to convert to a string. For
   * example, calling `nfc(12345)` returns the string `'12,345'`.The second parameter, `right`, is optional. If a number is passed, as in
   * `nfc(12345, 1)`, it sets the minimum number of digits to include to the
   * right of the decimal place. If `right` is smaller than the number of
   * decimal places in `num`, then `num` will be rounded to the given number of
   * decimal places. For example, calling `nfc(12345.67, 1)` returns the string
   * `'12,345.7'`. If `right` is larger than the number of decimal places in
   * `num`, then unused decimal places will be set to 0. For example, calling
   * `nfc(12345.67, 3)` returns the string `'12,345.670'`.
 *
   * @param
   * @param
   */
  nfc(num: number | string, right: number | string): string;

  nfc(nums: number[], right: number | string): string[];

  /**
   * Converts a `Number` into a `String` with a plus or minus sign.`nfp()` converts numbers such as 123 into strings formatted with a `+` or
   * `-` symbol to mark whether they're positive or negative, as in `'+123'`.The first parameter, `num`, is the number to convert to a string. For
   * example, calling `nfp(123.45)` returns the string `'+123.45'`. If an array
   * of numbers is passed, as in `nfp([123.45, -6.78])`, an array of formatted
   * strings will be returned.The second parameter, `left`, is optional. If a number is passed, as in
   * `nfp(123.45, 4)`, it sets the minimum number of digits to include to the
   * left of the decimal place. If `left` is larger than the number of digits in
   * `num`, then unused digits will be set to 0. For example, calling
   * `nfp(123.45, 4)` returns the string `'+0123.45'`.The third parameter, `right`, is also optional. If a number is passed, as
   * in `nfp(123.45, 4, 1)`, it sets the minimum number of digits to include to
   * the right of the decimal place. If `right` is smaller than the number of
   * decimal places in `num`, then `num` will be rounded to the given number of
   * decimal places.  For example, calling `nfp(123.45, 4, 1)` returns the
   * string `'+0123.5'`. If `right` is larger than the number of decimal places
   * in `num`, then unused decimal places will be set to 0.  For example,
   * calling `nfp(123.45, 4, 3)` returns the string `'+0123.450'`.
 *
   * @param
   * @param
   * @param
   */
  nfp(num: number, left: number, right: number): string;

  nfp(nums: number[], left: number, right: number): string[];

  /**
   * Converts a positive `Number` into a `String` with an extra space in front.`nfs()` converts positive numbers such as 123.45 into strings formatted
   * with an extra space in front, as in ' 123.45'. Doing so can be helpful for
   * aligning positive and negative numbers.The first parameter, `num`, is the number to convert to a string. For
   * example, calling `nfs(123.45)` returns the string `' 123.45'`.The second parameter, `left`, is optional. If a number is passed, as in
   * `nfs(123.45, 4)`, it sets the minimum number of digits to include to the
   * left of the decimal place. If `left` is larger than the number of digits in
   * `num`, then unused digits will be set to 0. For example, calling
   * `nfs(123.45, 4)` returns the string `' 0123.45'`.The third parameter, `right`, is also optional. If a number is passed, as
   * in `nfs(123.45, 4, 1)`, it sets the minimum number of digits to include to
   * the right of the decimal place. If `right` is smaller than the number of
   * decimal places in `num`, then `num` will be rounded to the given number of
   * decimal places.  For example, calling `nfs(123.45, 4, 1)` returns the
   * string `' 0123.5'`. If `right` is larger than the number of decimal places
   * in `num`, then unused decimal places will be set to 0.  For example,
   * calling `nfs(123.45, 4, 3)` returns the string `' 0123.450'`.
 *
   * @param
   * @param
   * @param
   */
  nfs(num: number, left: number, right: number): string;

  nfs(nums: Array, left: number, right: number): string[];

  /**
   * Splits a `String` into pieces and returns an array containing the pieces.`splitTokens()` is an enhanced version of
   * split(). It can split a string when any characters
   * from a list are detected.The first parameter, `value`, is the string to split.The second parameter, `delim`, is optional. It sets the character(s) that
   * should be used to split the string. `delim` can be a single string, as in
   * `splitTokens('rock...paper...scissors...shoot', '...')`, or an array of
   * strings, as in
   * `splitTokens('rock;paper,scissors...shoot, [';', ',', '...'])`. By default,
   * if no `delim` characters are specified, then any whitespace character is
   * used to split. Whitespace characters include tab (`\t`), line feed (`\n`),
   * carriage return (`\r`), form feed (`\f`), and space.
 *
   * @param
   * @param
   */
  splitTokens(value: string, delim: string): string[];

  /**
   * Shuffles the elements of an array.The first parameter, `array`, is the array to be shuffled. For example,
   * calling `shuffle(myArray)` will shuffle the elements of `myArray`. By
   * default, the original array won’t be modified. Instead, a copy will be
   * created, shuffled, and returned.The second parameter, `modify`, is optional. If `true` is passed, as in
   * `shuffle(myArray, true)`, then the array will be shuffled in place without
   * making a copy.
 *
   * @param
   * @param
   */
  shuffle(array: Array, bool: boolean): Array;

  /**
   * Sets the stroke rendering mode to balance performance and visual features when drawing lines.`strokeMode()` offers two modes:Choose the mode that best suits your application's needs to either improve rendering speed or enhance visual quality.
 *
   * @param
   */
  strokeMode(mode: string): void;

  /**
   * Creates a custom p5.Geometry object from
   * simpler 3D shapes.`buildGeometry()` helps with creating complex 3D shapes from simpler ones
   * such as sphere(). It can help to make sketches
   * more performant. For example, if a complex 3D shape doesn’t change while a
   * sketch runs, then it can be created with `buildGeometry()`. Creating a
   * p5.Geometry object once and then drawing it
   * will run faster than repeatedly drawing the individual pieces.The parameter, `callback`, is a function with the drawing instructions for
   * the new p5.Geometry object. It will be called
   * once to create the new 3D shape.See beginGeometry() and
   * endGeometry() for another way to build 3D
   * shapes.Note: `buildGeometry()` can only be used in WebGL mode.
 *
   * @param
   */
  buildGeometry(callback: Function): p5.Geometry;

  /**
   * Clears a p5.Geometry object from the graphics
   * processing unit (GPU) memory.p5.Geometry objects can contain lots of data
   * about their vertices, surface normals, colors, and so on. Complex 3D shapes
   * can use lots of memory which is a limited resource in many GPUs. Calling
   * `freeGeometry()` can improve performance by freeing a
   * p5.Geometry object’s resources from GPU memory.
   * `freeGeometry()` works with p5.Geometry objects
   * created with beginGeometry() and
   * endGeometry(),
   * buildGeometry(), and
   * loadModel().The parameter, `geometry`, is the p5.Geometry
   * object to be freed.Note: A p5.Geometry object can still be drawn
   * after its resources are cleared from GPU memory. It may take longer to draw
   * the first time it’s redrawn.Note: `freeGeometry()` can only be used in WebGL mode.
 *
   * @param
   */
  freeGeometry(geometry: p5.Geometry): void;

  /**
   * Draws a plane.A plane is a four-sided, flat shape with every angle measuring 90˚. It’s
   * similar to a rectangle and offers advanced drawing features in WebGL mode.The first parameter, `width`, is optional. If a `Number` is passed, as in
   * `plane(20)`, it sets the plane’s width and height. By default, `width` is
   * 50.The second parameter, `height`, is also optional. If a `Number` is passed,
   * as in `plane(20, 30)`, it sets the plane’s height. By default, `height` is
   * set to the plane’s `width`.The third parameter, `detailX`, is also optional. If a `Number` is passed,
   * as in `plane(20, 30, 5)` it sets the number of triangle subdivisions to use
   * along the x-axis. All 3D shapes are made by connecting triangles to form
   * their surfaces. By default, `detailX` is 1.The fourth parameter, `detailY`, is also optional. If a `Number` is passed,
   * as in `plane(20, 30, 5, 7)` it sets the number of triangle subdivisions to
   * use along the y-axis. All 3D shapes are made by connecting triangles to
   * form their surfaces. By default, `detailY` is 1.Note: `plane()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   */
  plane(width: number, height: number, detailX: number, detailY: number): void;

  /**
   * Draws a box (rectangular prism).A box is a 3D shape with six faces. Each face makes a 90˚ with four
   * neighboring faces.The first parameter, `width`, is optional. If a `Number` is passed, as in
   * `box(20)`, it sets the box’s width and height. By default, `width` is 50.The second parameter, `height`, is also optional. If a `Number` is passed,
   * as in `box(20, 30)`, it sets the box’s height. By default, `height` is set
   * to the box’s `width`.The third parameter, `depth`, is also optional. If a `Number` is passed, as
   * in `box(20, 30, 40)`, it sets the box’s depth. By default, `depth` is set
   * to the box’s `height`.The fourth parameter, `detailX`, is also optional. If a `Number` is passed,
   * as in `box(20, 30, 40, 5)`, it sets the number of triangle subdivisions to
   * use along the x-axis. All 3D shapes are made by connecting triangles to
   * form their surfaces. By default, `detailX` is 1.The fifth parameter, `detailY`, is also optional. If a number is passed, as
   * in `box(20, 30, 40, 5, 7)`, it sets the number of triangle subdivisions to
   * use along the y-axis. All 3D shapes are made by connecting triangles to
   * form their surfaces. By default, `detailY` is 1.Note: `box()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  box(width: number, height: number, depth: number, detailX: number, detailY: number): void;

  /**
   * Draws a sphere.A sphere is a 3D shape with triangular faces that connect to form a round
   * surface. Spheres with few faces look like crystals. Spheres with many faces
   * have smooth surfaces and look like balls.The first parameter, `radius`, is optional. If a `Number` is passed, as in
   * `sphere(20)`, it sets the radius of the sphere. By default, `radius` is 50.The second parameter, `detailX`, is also optional. If a `Number` is passed,
   * as in `sphere(20, 5)`, it sets the number of triangle subdivisions to use
   * along the x-axis. All 3D shapes are made by connecting triangles to form
   * their surfaces. By default, `detailX` is 24.The third parameter, `detailY`, is also optional. If a `Number` is passed,
   * as in `sphere(20, 5, 2)`, it sets the number of triangle subdivisions to
   * use along the y-axis. All 3D shapes are made by connecting triangles to
   * form their surfaces. By default, `detailY` is 16.Note: `sphere()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   */
  sphere(radius: number, detailX: number, detailY: number): void;

  /**
   * Draws a cylinder.A cylinder is a 3D shape with triangular faces that connect a flat bottom
   * to a flat top. Cylinders with few faces look like boxes. Cylinders with
   * many faces have smooth surfaces.The first parameter, `radius`, is optional. If a `Number` is passed, as in
   * `cylinder(20)`, it sets the radius of the cylinder’s base. By default,
   * `radius` is 50.The second parameter, `height`, is also optional. If a `Number` is passed,
   * as in `cylinder(20, 30)`, it sets the cylinder’s height. By default,
   * `height` is set to the cylinder’s `radius`.The third parameter, `detailX`, is also optional. If a `Number` is passed,
   * as in `cylinder(20, 30, 5)`, it sets the number of edges used to form the
   * cylinder's top and bottom. Using more edges makes the top and bottom look
   * more like circles. By default, `detailX` is 24.The fourth parameter, `detailY`, is also optional. If a `Number` is passed,
   * as in `cylinder(20, 30, 5, 2)`, it sets the number of triangle subdivisions
   * to use along the y-axis, between cylinder's the top and bottom. All 3D
   * shapes are made by connecting triangles to form their surfaces. By default,
   * `detailY` is 1.The fifth parameter, `bottomCap`, is also optional. If a `false` is passed,
   * as in `cylinder(20, 30, 5, 2, false)` the cylinder’s bottom won’t be drawn.
   * By default, `bottomCap` is `true`.The sixth parameter, `topCap`, is also optional. If a `false` is passed, as
   * in `cylinder(20, 30, 5, 2, false, false)` the cylinder’s top won’t be
   * drawn. By default, `topCap` is `true`.Note: `cylinder()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  cylinder(radius: number, height: number, detailX: number, detailY: number, bottomCap: boolean, topCap: boolean): void;

  /**
   * Draws a cone.A cone is a 3D shape with triangular faces that connect a flat bottom to a
   * single point. Cones with few faces look like pyramids. Cones with many
   * faces have smooth surfaces.The first parameter, `radius`, is optional. If a `Number` is passed, as in
   * `cone(20)`, it sets the radius of the cone’s base. By default, `radius` is
   * 50.The second parameter, `height`, is also optional. If a `Number` is passed,
   * as in `cone(20, 30)`, it sets the cone’s height. By default, `height` is
   * set to the cone’s `radius`.The third parameter, `detailX`, is also optional. If a `Number` is passed,
   * as in `cone(20, 30, 5)`, it sets the number of edges used to form the
   * cone's base. Using more edges makes the base look more like a circle. By
   * default, `detailX` is 24.The fourth parameter, `detailY`, is also optional. If a `Number` is passed,
   * as in `cone(20, 30, 5, 7)`, it sets the number of triangle subdivisions to
   * use along the y-axis connecting the base to the tip. All 3D shapes are made
   * by connecting triangles to form their surfaces. By default, `detailY` is 1.The fifth parameter, `cap`, is also optional. If a `false` is passed, as
   * in `cone(20, 30, 5, 7, false)` the cone’s base won’t be drawn. By default,
   * `cap` is `true`.Note: `cone()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  cone(radius: number, height: number, detailX: number, detailY: number, cap: boolean): void;

  /**
   * Draws an ellipsoid.An ellipsoid is a 3D shape with triangular faces that connect to form a
   * round surface. Ellipsoids with few faces look like crystals. Ellipsoids
   * with many faces have smooth surfaces and look like eggs. `ellipsoid()`
   * defines a shape by its radii. This is different from
   * ellipse() which uses diameters
   * (width and height).The first parameter, `radiusX`, is optional. If a `Number` is passed, as in
   * `ellipsoid(20)`, it sets the radius of the ellipsoid along the x-axis. By
   * default, `radiusX` is 50.The second parameter, `radiusY`, is also optional. If a `Number` is passed,
   * as in `ellipsoid(20, 30)`, it sets the ellipsoid’s radius along the y-axis.
   * By default, `radiusY` is set to the ellipsoid’s `radiusX`.The third parameter, `radiusZ`, is also optional. If a `Number` is passed,
   * as in `ellipsoid(20, 30, 40)`, it sets the ellipsoid’s radius along the
   * z-axis. By default, `radiusZ` is set to the ellipsoid’s `radiusY`.The fourth parameter, `detailX`, is also optional. If a `Number` is passed,
   * as in `ellipsoid(20, 30, 40, 5)`, it sets the number of triangle
   * subdivisions to use along the x-axis. All 3D shapes are made by connecting
   * triangles to form their surfaces. By default, `detailX` is 24.The fifth parameter, `detailY`, is also optional. If a `Number` is passed,
   * as in `ellipsoid(20, 30, 40, 5, 7)`, it sets the number of triangle
   * subdivisions to use along the y-axis. All 3D shapes are made by connecting
   * triangles to form their surfaces. By default, `detailY` is 16.Note: `ellipsoid()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  ellipsoid(radiusX: number, radiusY: number, radiusZ: number, detailX: number, detailY: number): void;

  /**
   * Draws a torus.A torus is a 3D shape with triangular faces that connect to form a ring.
   * Toruses with few faces look flattened. Toruses with many faces have smooth
   * surfaces.The first parameter, `radius`, is optional. If a `Number` is passed, as in
   * `torus(30)`, it sets the radius of the ring. By default, `radius` is 50.The second parameter, `tubeRadius`, is also optional. If a `Number` is
   * passed, as in `torus(30, 15)`, it sets the radius of the tube. By default,
   * `tubeRadius` is 10.The third parameter, `detailX`, is also optional. If a `Number` is passed,
   * as in `torus(30, 15, 5)`, it sets the number of edges used to draw the hole
   * of the torus. Using more edges makes the hole look more like a circle. By
   * default, `detailX` is 24.The fourth parameter, `detailY`, is also optional. If a `Number` is passed,
   * as in `torus(30, 15, 5, 7)`, it sets the number of triangle subdivisions to
   * use while filling in the torus’ height. By default, `detailY` is 16.Note: `torus()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   */
  torus(radius: number, tubeRadius: number, detailX: number, detailY: number): void;

  /**
   * Sets the number of segments used to draw spline curves in WebGL mode.In WebGL mode, smooth shapes are drawn using many flat segments. Adding
   * more flat segments makes shapes appear smoother.The parameter, `detail`, is the density of segments to use while drawing a
   * spline curve.Note: `curveDetail()` has no effect in 2D mode.
 *
   * @param
   */
  curveDetail(resolution: number): void;

  /**
   * Allows the user to orbit around a 3D sketch using a mouse, trackpad, or
   * touchscreen.3D sketches are viewed through an imaginary camera. Calling
   * `orbitControl()` within the draw() function allows
   * the user to change the camera’s position:`function draw() {
   * background(200);
   * 
   * // Enable orbiting with the mouse.
   * orbitControl();
   * 
   * // Rest of sketch.
   * }`Left-clicking and dragging or swipe motion will rotate the camera position
   * about the center of the sketch. Right-clicking and dragging or multi-swipe
   * will pan the camera position without rotation. Using the mouse wheel
   * (scrolling) or pinch in/out will move the camera further or closer from the
   * center of the sketch.The first three parameters, `sensitivityX`, `sensitivityY`, and
   * `sensitivityZ`, are optional. They’re numbers that set the sketch’s
   * sensitivity to movement along each axis. For example, calling
   * `orbitControl(1, 2, -1)` keeps movement along the x-axis at its default
   * value, makes the sketch twice as sensitive to movement along the y-axis,
   * and reverses motion along the z-axis. By default, all sensitivity values
   * are 1.The fourth parameter, `options`, is also optional. It’s an object that
   * changes the behavior of orbiting. For example, calling
   * `orbitControl(1, 1, 1, options)` keeps the default sensitivity values while
   * changing the behaviors set with `options`. The object can have the
   * following properties:`let options = {
   * // Setting this to false makes mobile interactions smoother by
   * // preventing accidental interactions with the page while orbiting.
   * // By default, it's true.
   * disableTouchActions: true,
   * 
   * // Setting this to true makes the camera always rotate in the
   * // direction the mouse/touch is moving.
   * // By default, it's false.
   * freeRotation: false
   * };
   * 
   * orbitControl(1, 1, 1, options);`
 *
   * @param
   * @param
   * @param
   * @param
   */
  orbitControl(sensitivityX: number, sensitivityY: number, sensitivityZ: number, options: object): void;

  /**
   * Adds a grid and an axes icon to clarify orientation in 3D sketches.`debugMode()` adds a grid that shows where the “ground” is in a sketch. By
   * default, the grid will run through the origin `(0, 0, 0)` of the sketch
   * along the XZ plane. `debugMode()` also adds an axes icon that points along
   * the positive x-, y-, and z-axes. Calling `debugMode()` displays the grid
   * and axes icon with their default size and position.There are four ways to call `debugMode()` with optional parameters to
   * customize the debugging environment.The first way to call `debugMode()` has one parameter, `mode`. If the
   * system constant `GRID` is passed, as in `debugMode(GRID)`, then the grid
   * will be displayed and the axes icon will be hidden. If the constant `AXES`
   * is passed, as in `debugMode(AXES)`, then the axes icon will be displayed
   * and the grid will be hidden.The second way to call `debugMode()` has six parameters. The first
   * parameter, `mode`, selects either `GRID` or `AXES` to be displayed. The
   * next five parameters, `gridSize`, `gridDivisions`, `xOff`, `yOff`, and
   * `zOff` are optional. They’re numbers that set the appearance of the grid
   * (`gridSize` and `gridDivisions`) and the placement of the axes icon
   * (`xOff`, `yOff`, and `zOff`). For example, calling
   * `debugMode(20, 5, 10, 10, 10)` sets the `gridSize` to 20 pixels, the number
   * of `gridDivisions` to 5, and offsets the axes icon by 10 pixels along the
   * x-, y-, and z-axes.The third way to call `debugMode()` has five parameters. The first
   * parameter, `mode`, selects either `GRID` or `AXES` to be displayed. The
   * next four parameters, `axesSize`, `xOff`, `yOff`, and `zOff` are optional.
   * They’re numbers that set the appearance of the size of the axes icon
   * (`axesSize`) and its placement (`xOff`, `yOff`, and `zOff`).The fourth way to call `debugMode()` has nine optional parameters. The
   * first five parameters, `gridSize`, `gridDivisions`, `gridXOff`, `gridYOff`,
   * and `gridZOff` are numbers that set the appearance of the grid. For
   * example, calling `debugMode(100, 5, 0, 0, 0)` sets the `gridSize` to 100,
   * the number of `gridDivisions` to 5, and sets all the offsets to 0 so that
   * the grid is centered at the origin. The next four parameters, `axesSize`,
   * `xOff`, `yOff`, and `zOff` are numbers that set the appearance of the size
   * of the axes icon (`axesSize`) and its placement (`axesXOff`, `axesYOff`,
   * and `axesZOff`). For example, calling
   * `debugMode(100, 5, 0, 0, 0, 50, 10, 10, 10)` sets the `gridSize` to 100,
   * the number of `gridDivisions` to 5, and sets all the offsets to 0 so that
   * the grid is centered at the origin. It then sets the `axesSize` to 50 and
   * offsets the icon 10 pixels along each axis.
   */
  debugMode(): void;

  debugMode(mode: GRID | AXES): void;

  debugMode(mode: GRID | AXES, gridSize: number, gridDivisions: number, xOff: number, yOff: number, zOff: number): void;

  debugMode(mode: GRID | AXES, axesSize: number, xOff: number, yOff: number, zOff: number): void;

  debugMode(gridSize: number, gridDivisions: number, gridXOff: number, gridYOff: number, gridZOff: number, axesSize: number, axesXOff: number, axesYOff: number, axesZOff: number): void;

  /**
   * Turns off debugMode() in a 3D sketch.
   */
  noDebugMode(): void;

  /**
   * Creates a light that shines from all directions.Ambient light does not come from one direction. Instead, 3D shapes are
   * lit evenly from all sides. Ambient lights are almost always used in
   * combination with other types of lights.There are three ways to call `ambientLight()` with optional parameters to
   * set the light’s color.The first way to call `ambientLight()` has two parameters, `gray` and
   * `alpha`. `alpha` is optional. Grayscale and alpha values between 0 and 255
   * can be passed to set the ambient light’s color, as in `ambientLight(50)` or
   * `ambientLight(50, 30)`.The second way to call `ambientLight()` has one parameter, color. A
   * p5.Color object, an array of color values, or a
   * CSS color string, as in `ambientLight('magenta')`, can be passed to set the
   * ambient light’s color.The third way to call `ambientLight()` has four parameters, `v1`, `v2`,
   * `v3`, and `alpha`. `alpha` is optional. RGBA, HSBA, or HSLA values can be
   * passed to set the ambient light’s colors, as in `ambientLight(255, 0, 0)`
   * or `ambientLight(255, 0, 0, 30)`. Color values will be interpreted using
   * the current colorMode().
 *
   * @param
   * @param
   * @param
   * @param
   */
  ambientLight(v1: number, v2: number, v3: number, alpha: number): void;

  ambientLight(gray: number, alpha: number): void;

  ambientLight(value: string): void;

  ambientLight(values: number[]): void;

  ambientLight(color: p5.Color): void;

  /**
   * Sets the specular color for lights.`specularColor()` affects lights that bounce off a surface in a preferred
   * direction. These lights include
   * directionalLight(),
   * pointLight(), and
   * spotLight(). The function helps to create
   * highlights on p5.Geometry objects that are
   * styled with specularMaterial(). If a
   * geometry does not use
   * specularMaterial(), then
   * `specularColor()` will have no effect.Note: `specularColor()` doesn’t affect lights that bounce in all
   * directions, including ambientLight() and
   * imageLight().There are three ways to call `specularColor()` with optional parameters to
   * set the specular highlight color.The first way to call `specularColor()` has two optional parameters, `gray`
   * and `alpha`. Grayscale and alpha values between 0 and 255, as in
   * `specularColor(50)` or `specularColor(50, 80)`, can be passed to set the
   * specular highlight color.The second way to call `specularColor()` has one optional parameter,
   * `color`. A p5.Color object, an array of color
   * values, or a CSS color string can be passed to set the specular highlight
   * color.The third way to call `specularColor()` has four optional parameters, `v1`,
   * `v2`, `v3`, and `alpha`. RGBA, HSBA, or HSLA values, as in
   * `specularColor(255, 0, 0, 80)`, can be passed to set the specular highlight
   * color. Color values will be interpreted using the current
   * colorMode().
 *
   * @param
   * @param
   * @param
   */
  specularColor(v1: number, v2: number, v3: number): void;

  specularColor(gray: number): void;

  specularColor(value: string): void;

  specularColor(values: number[]): void;

  specularColor(color: p5.Color): void;

  /**
   * Creates a light that shines in one direction.Directional lights don’t shine from a specific point. They’re like a sun
   * that shines from somewhere offscreen. The light’s direction is set using
   * three `(x, y, z)` values between -1 and 1. For example, setting a light’s
   * direction as `(1, 0, 0)` will light p5.Geometry
   * objects from the left since the light faces directly to the right. A
   * maximum of 5 directional lights can be active at once.There are four ways to call `directionalLight()` with parameters to set the
   * light’s color and direction.The first way to call `directionalLight()` has six parameters. The first
   * three parameters, `v1`, `v2`, and `v3`, set the light’s color using the
   * current colorMode(). The last three
   * parameters, `x`, `y`, and `z`, set the light’s direction. For example,
   * `directionalLight(255, 0, 0, 1, 0, 0)` creates a red `(255, 0, 0)` light
   * that shines to the right `(1, 0, 0)`.The second way to call `directionalLight()` has four parameters. The first
   * three parameters, `v1`, `v2`, and `v3`, set the light’s color using the
   * current colorMode(). The last parameter,
   * `direction` sets the light’s direction using a
   * p5.Vector object. For example,
   * `directionalLight(255, 0, 0, lightDir)` creates a red `(255, 0, 0)` light
   * that shines in the direction the `lightDir` vector points.The third way to call `directionalLight()` has four parameters. The first
   * parameter, `color`, sets the light’s color using a
   * p5.Color object or an array of color values. The
   * last three parameters, `x`, `y`, and `z`, set the light’s direction. For
   * example, `directionalLight(myColor, 1, 0, 0)` creates a light that shines
   * to the right `(1, 0, 0)` with the color value of `myColor`.The fourth way to call `directionalLight()` has two parameters. The first
   * parameter, `color`, sets the light’s color using a
   * p5.Color object or an array of color values. The
   * second parameter, `direction`, sets the light’s direction using a
   * p5.Vector object. For example,
   * `directionalLight(myColor, lightDir)` creates a light that shines in the
   * direction the `lightDir` vector points with the color value of `myColor`.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  directionalLight(v1: number, v2: number, v3: number, x: number, y: number, z: number): void;

  directionalLight(v1: number, v2: number, v3: number, direction: p5.Vector): void;

  directionalLight(color: p5.Color | number[] | string, x: number, y: number, z: number): void;

  directionalLight(color: p5.Color | number[] | string, direction: p5.Vector): void;

  /**
   * Creates a light that shines from a point in all directions.Point lights are like light bulbs that shine in all directions. They can be
   * placed at different positions to achieve different lighting effects. A
   * maximum of 5 point lights can be active at once.There are four ways to call `pointLight()` with parameters to set the
   * light’s color and position.The first way to call `pointLight()` has six parameters. The first three
   * parameters, `v1`, `v2`, and `v3`, set the light’s color using the current
   * colorMode(). The last three parameters, `x`,
   * `y`, and `z`, set the light’s position. For example,
   * `pointLight(255, 0, 0, 50, 0, 0)` creates a red `(255, 0, 0)` light that
   * shines from the coordinates `(50, 0, 0)`.The second way to call `pointLight()` has four parameters. The first three
   * parameters, `v1`, `v2`, and `v3`, set the light’s color using the current
   * colorMode(). The last parameter, position sets
   * the light’s position using a p5.Vector object.
   * For example, `pointLight(255, 0, 0, lightPos)` creates a red `(255, 0, 0)`
   * light that shines from the position set by the `lightPos` vector.The third way to call `pointLight()` has four parameters. The first
   * parameter, `color`, sets the light’s color using a
   * p5.Color object or an array of color values. The
   * last three parameters, `x`, `y`, and `z`, set the light’s position. For
   * example, `directionalLight(myColor, 50, 0, 0)` creates a light that shines
   * from the coordinates `(50, 0, 0)` with the color value of `myColor`.The fourth way to call `pointLight()` has two parameters. The first
   * parameter, `color`, sets the light’s color using a
   * p5.Color object or an array of color values. The
   * second parameter, `position`, sets the light’s position using a
   * p5.Vector object. For example,
   * `directionalLight(myColor, lightPos)` creates a light that shines from the
   * position set by the `lightPos` vector with the color value of `myColor`.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  pointLight(v1: number, v2: number, v3: number, x: number, y: number, z: number): void;

  pointLight(v1: number, v2: number, v3: number, position: p5.Vector): void;

  pointLight(color: p5.Color | number[] | string, x: number, y: number, z: number): void;

  pointLight(color: p5.Color | number[] | string, position: p5.Vector): void;

  /**
   * Creates an ambient light from an image.`imageLight()` simulates a light shining from all directions. The effect is
   * like placing the sketch at the center of a giant sphere that uses the image
   * as its texture. The image's diffuse light will be affected by
   * fill() and the specular reflections will be
   * affected by specularMaterial() and
   * shininess().The parameter, `img`, is the p5.Image object to
   * use as the light source.
 *
   * @param
   */
  imageLight(img: p5.image): void;

  /**
   * Creates an immersive 3D background.`panorama()` transforms images containing 360˚ content, such as maps or
   * HDRIs, into immersive 3D backgrounds that surround a sketch. Exploring the
   * space requires changing the camera's perspective with functions such as
   * orbitControl() or
   * camera().
 *
   * @param
   */
  panorama(img: p5.Image): void;

  /**
   * Places an ambient and directional light in the scene.
   * The lights are set to ambientLight(128, 128, 128) and
   * directionalLight(128, 128, 128, 0, 0, -1).Note: lights need to be called (whether directly or indirectly)
   * within draw() to remain persistent in a looping program.
   * Placing them in setup() will cause them to only have an effect
   * the first time through the loop.
   */
  lights(): void;

  /**
   * Sets the falloff rate for pointLight()
   * and spotLight().A light’s falloff describes the intensity of its beam at a distance. For
   * example, a lantern has a slow falloff, a flashlight has a medium falloff,
   * and a laser pointer has a sharp falloff.`lightFalloff()` has three parameters, `constant`, `linear`, and
   * `quadratic`. They’re numbers used to calculate falloff at a distance, `d`,
   * as follows:`falloff = 1 / (constant + d * linear + (d * d) * quadratic)`Note: `constant`, `linear`, and `quadratic` should always be set to values
   * greater than 0.
 *
   * @param
   * @param
   * @param
   */
  lightFalloff(constant: number, linear: number, quadratic: number): void;

  /**
   * Creates a light that shines from a point in one direction.Spot lights are like flashlights that shine in one direction creating a
   * cone of light. The shape of the cone can be controlled using the angle and
   * concentration parameters. A maximum of 5 spot lights can be active at once.There are eight ways to call `spotLight()` with parameters to set the
   * light’s color, position, direction. For example,
   * `spotLight(255, 0, 0, 0, 0, 0, 1, 0, 0)` creates a red `(255, 0, 0)` light
   * at the origin `(0, 0, 0)` that points to the right `(1, 0, 0)`.The `angle` parameter is optional. It sets the radius of the light cone.
   * For example, `spotLight(255, 0, 0, 0, 0, 0, 1, 0, 0, PI / 16)` creates a
   * red `(255, 0, 0)` light at the origin `(0, 0, 0)` that points to the right
   * `(1, 0, 0)` with an angle of `PI / 16` radians. By default, `angle` is
   * `PI / 3` radians.The `concentration` parameter is also optional. It focuses the light
   * towards the center of the light cone. For example,
   * `spotLight(255, 0, 0, 0, 0, 0, 1, 0, 0, PI / 16, 50)` creates a red
   * `(255, 0, 0)` light at the origin `(0, 0, 0)` that points to the right
   * `(1, 0, 0)` with an angle of `PI / 16` radians at concentration of 50. By
   * default, `concentration` is 100.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  spotLight(v1: number, v2: number, v3: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, angle: number, concentration: number): void;

  spotLight(color: p5.Color | number[] | string, position: p5.Vector, direction: p5.Vector, angle: number, concentration: number): void;

  spotLight(v1: number, v2: number, v3: number, position: p5.Vector, direction: p5.Vector, angle: number, concentration: number): void;

  spotLight(color: p5.Color | number[] | string, x: number, y: number, z: number, direction: p5.Vector, angle: number, concentration: number): void;

  spotLight(color: p5.Color | number[] | string, position: p5.Vector, rx: number, ry: number, rz: number, angle: number, concentration: number): void;

  spotLight(v1: number, v2: number, v3: number, x: number, y: number, z: number, direction: p5.Vector, angle: number, concentration: number): void;

  spotLight(v1: number, v2: number, v3: number, position: p5.Vector, rx: number, ry: number, rz: number, angle: number, concentration: number): void;

  spotLight(color: p5.Color | number[] | string, x: number, y: number, z: number, rx: number, ry: number, rz: number, angle: number, concentration: number): void;

  /**
   * Removes all lights from the sketch.Calling `noLights()` removes any lights created with
   * lights(),
   * ambientLight(),
   * directionalLight(),
   * pointLight(), or
   * spotLight(). These functions may be called
   * after `noLights()` to create a new lighting scheme.
   */
  noLights(): void;

  /**
   * Loads a 3D model to create a
   * p5.Geometry object.`loadModel()` can load 3D models from OBJ and STL files. Once the model is
   * loaded, it can be displayed with the
   * model() function, as in `model(shape)`.There are three ways to call `loadModel()` with optional parameters to help
   * process the model.The first parameter, `path`, is a `String` with the path to the file. Paths
   * to local files should be relative, as in `loadModel('assets/model.obj')`.
   * URLs such as `'https://example.com/model.obj'` may be blocked due to browser
   * security. The `path` parameter can also be defined as a
   * object for more advanced usage.
   * Note: When loading a `.obj` file that references materials stored in
   * `.mtl` files, p5.js will attempt to load and apply those materials.
   * To ensure that the `.obj` file reads the `.mtl` file correctly include the
   * `.mtl` file alongside it.The first way to call `loadModel()` has three optional parameters after the
   * file path. The first optional parameter, `successCallback`, is a function
   * to call once the model loads. For example,
   * `loadModel('assets/model.obj', handleModel)` will call the `handleModel()`
   * function once the model loads. The second optional parameter,
   * `failureCallback`, is a function to call if the model fails to load. For
   * example, `loadModel('assets/model.obj', handleModel, handleFailure)` will
   * call the `handleFailure()` function if an error occurs while loading. The
   * third optional parameter, `fileType`, is the model’s file extension as a
   * string. For example,
   * `loadModel('assets/model', handleModel, handleFailure, '.obj')` will try to
   * load the file model as a `.obj` file.The second way to call `loadModel()` has four optional parameters after the
   * file path. The first optional parameter is a `Boolean` value. If `true` is
   * passed, as in `loadModel('assets/model.obj', true)`, then the model will be
   * resized to ensure it fits the canvas. The next three parameters are
   * `successCallback`, `failureCallback`, and `fileType` as described above.The third way to call `loadModel()` has one optional parameter after the
   * file path. The optional parameter, `options`, is an `Object` with options,
   * as in `loadModel('assets/model.obj', options)`. The `options` object can
   * have the following properties:`let options = {
   * // Enables standardized size scaling during loading if set to true.
   * normalize: true,
   * 
   * // Function to call once the model loads.
   * successCallback: handleModel,
   * 
   * // Function to call if an error occurs while loading.
   * failureCallback: handleError,
   * 
   * // Model's file extension.
   * fileType: '.stl',
   * 
   * // Flips the U texture coordinates of the model.
   * flipU: false,
   * 
   * // Flips the V texture coordinates of the model.
   * flipV: false
   * };
   * 
   * // Pass the options object to loadModel().
   * loadModel('assets/model.obj', options);`This function returns a `Promise` and should be used in an `async` setup with
   * `await`. See the examples for the usage syntax.Note: There’s no support for colored STL files. STL files with color will
   * be rendered without color.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  loadModel(path: string | Request, fileType: string, normalize: boolean, successCallback: any, failureCallback: any): Promise<p5.Geometry>;

  loadModel(path: string | Request, fileType: string, successCallback: any, failureCallback: any): Promise<p5.Geometry>;

  loadModel(path: string | Request, options: object): Promise<p5.Geometry>;

  /**
   * Draws a p5.Geometry object to the canvas.The parameter, `model`, is the
   * p5.Geometry object to draw.
   * p5.Geometry objects can be built with
   * buildGeometry(), or
   * beginGeometry() and
   * endGeometry(). They can also be loaded from
   * a file with loadGeometry().Note: `model()` can only be used in WebGL mode.
 *
   * @param
   * @param
   */
  model(model: p5.Geometry, count: number): void;

  /**
   * Load a 3d model from an OBJ or STL string.OBJ and STL files lack a built-in sense of scale, causing models exported from different programs to vary in size.
   * If your model doesn't display correctly, consider using `loadModel()` with `normalize` set to `true` to standardize its size.
   * Further adjustments can be made using the `scale()` function.Also, the support for colored STL files is not present. STL files with color will be
   * rendered without color properties.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  createModel(modelString: string, fileType: string, normalize: boolean, successCallback: any, failureCallback: any): p5.Geometry;

  createModel(modelString: string, fileType: string, successCallback: any, failureCallback: any): p5.Geometry;

  createModel(modelString: string, fileType: string, options: object): p5.Geometry;

  /**
   * Loads vertex and fragment shaders to create a
   * p5.Shader object.Shaders are programs that run on the graphics processing unit (GPU). They
   * can process many pixels at the same time, making them fast for many
   * graphics tasks. They’re written in a language called
   * GLSL
   * and run along with the rest of the code in a sketch.Once the p5.Shader object is created, it can be
   * used with the shader() function, as in
   * `shader(myShader)`. A shader program consists of two files, a vertex shader
   * and a fragment shader. The vertex shader affects where 3D geometry is drawn
   * on the screen and the fragment shader affects color.`loadShader()` loads the vertex and fragment shaders from their `.vert` and
   * `.frag` files. For example, calling
   * `loadShader('assets/shader.vert', 'assets/shader.frag')` loads both
   * required shaders and returns a p5.Shader object.The third parameter, `successCallback`, is optional. If a function is
   * passed, it will be called once the shader has loaded. The callback function
   * can use the new p5.Shader object as its
   * parameter. The return value of the `successCallback()` function will be used
   * as the final return value of `loadShader()`.The fourth parameter, `failureCallback`, is also optional. If a function is
   * passed, it will be called if the shader fails to load. The callback
   * function can use the event error as its parameter. The return value of the `
   * failureCallback()` function will be used as the final return value of `loadShader()`.This function returns a `Promise` and should be used in an `async` setup with
   * `await`. See the examples for the usage syntax.Note: Shaders can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   */
  loadShader(vertFilename: string | Request, fragFilename: string | Request, successCallback: Function, failureCallback: Function): Promise<p5.Shader>;

  /**
   * Creates a new p5.Shader object.Shaders are programs that run on the graphics processing unit (GPU). They
   * can process many pixels at the same time, making them fast for many
   * graphics tasks. They’re written in a language called
   * GLSL
   * and run along with the rest of the code in a sketch.Once the p5.Shader object is created, it can be
   * used with the shader() function, as in
   * `shader(myShader)`. A shader program consists of two parts, a vertex shader
   * and a fragment shader. The vertex shader affects where 3D geometry is drawn
   * on the screen and the fragment shader affects color.The first parameter, `vertSrc`, sets the vertex shader. It’s a string that
   * contains the vertex shader program written in GLSL.The second parameter, `fragSrc`, sets the fragment shader. It’s a string
   * that contains the fragment shader program written in GLSL.A shader can optionally describe  which are functions in GLSL that
   * users may choose to provide to customize the behavior of the shader using the
   * `modify()` method of `p5.Shader`. These are added by
   * describing the hooks in a third parameter, `options`, and referencing the hooks in
   * your `vertSrc` or `fragSrc`. Hooks for the vertex or fragment shader are described under
   * the `vertex` and `fragment` keys of `options`. Each one is an object. where each key is
   * the type and name of a hook function, and each value is a string with the
   * parameter list and default implementation of the hook. For example, to let users
   * optionally run code at the start of the vertex shader, the options object could
   * include:`{
   * vertex: {
   * 'void beforeVertex': '() {}'
   * }
   * }`Then, in your vertex shader source, you can run a hook by calling a function
   * with the same name prefixed by `HOOK_`. If you want to check if the default
   * hook has been replaced, maybe to avoid extra overhead, you can check if the
   * same name prefixed by `AUGMENTED_HOOK_` has been defined:`void main() {
   * // In most cases, just calling the hook is fine:
   * HOOK_beforeVertex();
   * 
   * // Alternatively, for more efficiency:
   * #ifdef AUGMENTED_HOOK_beforeVertex
   * HOOK_beforeVertex();
   * #endif
   * 
   * // Add the rest of your shader code here!
   * }`Note: Only filter shaders can be used in 2D mode. All shaders can be used
   * in WebGL mode.
 *
   * @param
   * @param
   * @param
   */
  createShader(vertSrc: string, fragSrc: string, options: object): p5.Shader;

  /**
   * Creates and loads a filter shader from an external file.
 *
   * @param
   * @param
   * @param
   */
  loadFilterShader(fragFilename: string, successCallback: Function, failureCallback: Function): Promise<p5.Shader>;

  /**
   * Creates a p5.Shader object to be used with the
   * filter() function.`createFilterShader()` works like
   * createShader() but has a default vertex
   * shader included. `createFilterShader()` is intended to be used along with
   * filter() for filtering the contents of a canvas.
   * A filter shader will be applied to the whole canvas instead of just
   * p5.Geometry objects.The parameter, `fragSrc`, sets the fragment shader. It’s a string that
   * contains the fragment shader program written in
   * GLSL.The p5.Shader object that's created has some
   * uniforms that can be set:The p5.Shader that's created also provides
   * `varying vec2 vTexCoord`, a coordinate with values between 0 and 1.
   * `vTexCoord` describes where on the canvas the pixel will be drawn.For more info about filters and shaders, see Adam Ferriss' repo of shader examples
   * or the Introduction to Shaders tutorial.
 *
   * @param
   */
  createFilterShader(fragSrc: string): p5.Shader;

  /**
   * Sets the p5.Shader object to apply while drawing.Shaders are programs that run on the graphics processing unit (GPU). They
   * can process many pixels or vertices at the same time, making them fast for
   * many graphics tasks. They’re written in a language called
   * GLSL
   * and run along with the rest of the code in a sketch.
   * p5.Shader objects can be created using the
   * createShader() and
   * loadShader() functions.The parameter, `s`, is the p5.Shader object to
   * apply. For example, calling `shader(myShader)` applies `myShader` to
   * process each pixel on the canvas. This only changes the fill (the inner part of shapes),
   * but does not affect the outlines (strokes) or any images drawn using the `image()` function.
   * The source code from a p5.Shader object's
   * fragment and vertex shaders will be compiled the first time it's passed to
   * `shader()`. See
   * MDN
   * for more information about compiling shaders.Calling resetShader() restores a sketch’s
   * default shaders.Note: Shaders can only be used in WebGL mode.If you want to apply shaders to strokes or images, use the following methods:
 *
   * @param
   */
  shader(s: p5.Shader): void;

  /**
   * Sets the p5.Shader object to apply for strokes.This method applies the given shader to strokes, allowing customization of
   * how lines and outlines are drawn in 3D space. The shader will be used for
   * strokes until resetShader() is called or another
   * strokeShader is applied.The shader will be used for:To further customize its behavior, refer to the various hooks provided by
   * the baseStrokeShader() method, which allow
   * control over stroke weight, vertex positions, colors, and more.
 *
   * @param
   */
  strokeShader(s: p5.Shader): void;

  /**
   * Sets the p5.Shader object to apply for images.This method allows the user to apply a custom shader to images, enabling
   * advanced visual effects such as pixel manipulation, color adjustments,
   * or dynamic behavior. The shader will be applied to the image drawn using
   * the image() function.The shader will be used exclusively for:
 *
   * @param
   */
  imageShader(s: p5.Shader): void;

  /**
   * Get the default shader used with lights, materials,
   * and textures.You can call `baseMaterialShader().modify()`
   * and change any of the following hooks:`void beforeVertex`Called at the start of the vertex shader.`Vertex getObjectInputs`Update the vertex data of the model being drawn before any positioning has been applied. It takes in a `Vertex` struct, which includes:`Vertex getWorldInputs`Update the vertex data of the model being drawn after transformations such as `translate()` and `scale()` have been applied, but before the camera has been applied. It takes in a `Vertex` struct like, in the `getObjectInputs` hook above, that can be modified and returned.`Vertex getCameraInputs`Update the vertex data of the model being drawn as they appear relative to the camera. It takes in a `Vertex` struct like, in the `getObjectInputs` hook above, that can be modified and returned.`void afterVertex`Called at the end of the vertex shader.`void beforeFragment`Called at the start of the fragment shader.`Inputs getPixelInputs`Update the per-pixel inputs of the material. It takes in an `Inputs` struct, which includes:`vec4 combineColors`Take in a `ColorComponents` struct containing all the different components of light, and combining them into
   * a single final color. The struct contains:`vec4 getFinalColor`Update the final color after mixing. It takes in a `vec4 color` and must return a modified version.`void afterFragment`Called at the end of the fragment shader.Most of the time, you will need to write your hooks in GLSL ES version 300. If you
   * are using WebGL 1 instead of 2, write your hooks in GLSL ES 100 instead.Call `baseMaterialShader().inspectHooks()` to see all the possible hooks and
   * their default implementations.
   */
  baseMaterialShader(): p5.Shader;

  /**
   * Get the base shader for filters.You can then call `baseFilterShader().modify()`
   * and change the following hook:`vec4 getColor`Output the final color for the current pixel. It takes in two parameters:
   * `FilterInputs inputs`, and `in sampler2D canvasContent`, and must return a color
   * as a `vec4`.`FilterInputs inputs` is a scruct with the following properties:`in sampler2D canvasContent` is a texture with the contents of the sketch, pre-filter. Call
   * `getTexture(canvasContent, someCoordinate)` to retrieve the color of the sketch at that coordinate,
   * with coordinate values between 0 and 1.Most of the time, you will need to write your hooks in GLSL ES version 300. If you
   * are using WebGL 1, write your hooks in GLSL ES 100 instead.
   */
  baseFilterShader(): p5.Shader;

  /**
   * Get the shader used by `normalMaterial()`.You can call `baseNormalShader().modify()`
   * and change any of the following hooks:`void beforeVertex`Called at the start of the vertex shader.`Vertex getObjectInputs`Update the vertex data of the model being drawn before any positioning has been applied. It takes in a `Vertex` struct, which includes:`Vertex getWorldInputs`Update the vertex data of the model being drawn after transformations such as `translate()` and `scale()` have been applied, but before the camera has been applied. It takes in a `Vertex` struct like, in the `getObjectInputs` hook above, that can be modified and returned.`Vertex getCameraInputs`Update the vertex data of the model being drawn as they appear relative to the camera. It takes in a `Vertex` struct like, in the `getObjectInputs` hook above, that can be modified and returned.`void afterVertex`Called at the end of the vertex shader.`void beforeFragment`Called at the start of the fragment shader.`vec4 getFinalColor`Update the final color after mixing. It takes in a `vec4 color` and must return a modified version.`void afterFragment`Called at the end of the fragment shader.Most of the time, you will need to write your hooks in GLSL ES version 300. If you
   * are using WebGL 1 instead of 2, write your hooks in GLSL ES 100 instead.Call `baseNormalShader().inspectHooks()` to see all the possible hooks and
   * their default implementations.
   */
  baseNormalShader(): p5.Shader;

  /**
   * Get the shader used when no lights or materials are applied.You can call `baseColorShader().modify()`
   * and change any of the following hooks:`void beforeVertex`Called at the start of the vertex shader.`Vertex getObjectInputs`Update the vertex data of the model being drawn before any positioning has been applied. It takes in a `Vertex` struct, which includes:`Vertex getWorldInputs`Update the vertex data of the model being drawn after transformations such as `translate()` and `scale()` have been applied, but before the camera has been applied. It takes in a `Vertex` struct like, in the `getObjectInputs` hook above, that can be modified and returned.`Vertex getCameraInputs`Update the vertex data of the model being drawn as they appear relative to the camera. It takes in a `Vertex` struct like, in the `getObjectInputs` hook above, that can be modified and returned.`void afterVertex`Called at the end of the vertex shader.`void beforeFragment`Called at the start of the fragment shader.`vec4 getFinalColor`Update the final color after mixing. It takes in a `vec4 color` and must return a modified version.`void afterFragment`Called at the end of the fragment shader.Most of the time, you will need to write your hooks in GLSL ES version 300. If you
   * are using WebGL 1 instead of 2, write your hooks in GLSL ES 100 instead.Call `baseColorShader().inspectHooks()` to see all the possible hooks and
   * their default implementations.
   */
  baseColorShader(): p5.Shader;

  /**
   * Get the shader used when drawing the strokes of shapes.You can call `baseStrokeShader().modify()`
   * and change any of the following hooks:`void beforeVertex`Called at the start of the vertex shader.`StrokeVertex getObjectInputs`Update the vertex data of the stroke being drawn before any positioning has been applied. It takes in a `StrokeVertex` struct, which includes:`StrokeVertex getWorldInputs`Update the vertex data of the model being drawn after transformations such as `translate()` and `scale()` have been applied, but before the camera has been applied. It takes in a `StrokeVertex` struct like, in the `getObjectInputs` hook above, that can be modified and returned.`StrokeVertex getCameraInputs`Update the vertex data of the model being drawn as they appear relative to the camera. It takes in a `StrokeVertex` struct like, in the `getObjectInputs` hook above, that can be modified and returned.`void afterVertex`Called at the end of the vertex shader.`void beforeFragment`Called at the start of the fragment shader.`Inputs getPixelInputs`Update the inputs to the shader. It takes in a struct `Inputs inputs`, which includes:`bool shouldDiscard`Caps and joins are made by discarded pixels in the fragment shader to carve away unwanted areas. Use this to change this logic. It takes in a `bool willDiscard` and must return a modified version.`vec4 getFinalColor`Update the final color after mixing. It takes in a `vec4 color` and must return a modified version.`void afterFragment`Called at the end of the fragment shader.Most of the time, you will need to write your hooks in GLSL ES version 300. If you
   * are using WebGL 1 instead of 2, write your hooks in GLSL ES 100 instead.Call `baseStrokeShader().inspectHooks()` to see all the possible hooks and
   * their default implementations.
   */
  baseStrokeShader(): p5.Shader;

  /**
   * Restores the default shaders.`resetShader()` deactivates any shaders previously applied by
   * shader(), strokeShader(),
   * or imageShader().Note: Shaders can only be used in WebGL mode.
   */
  resetShader(): void;

  /**
   * Sets the texture that will be used on shapes.A texture is like a skin that wraps around a shape. `texture()` works with
   * built-in shapes, such as square() and
   * sphere(), and custom shapes created with
   * functions such as buildGeometry(). To
   * texture a geometry created with beginShape(),
   * uv coordinates must be passed to each
   * vertex() call.The parameter, `tex`, is the texture to apply. `texture()` can use a range
   * of sources including images, videos, and offscreen renderers such as
   * p5.Graphics and
   * p5.Framebuffer objects.To texture a geometry created with beginShape(),
   * you will need to specify uv coordinates in vertex().Note: `texture()` can only be used in WebGL mode.
 *
   * @param
   */
  texture(tex: p5.Image | p5.MediaElement | p5.Graphics | p5.Texture | p5.Framebuffer | p5.FramebufferTexture): void;

  /**
   * Changes the coordinate system used for textures when they’re applied to
   * custom shapes.In order for texture() to work, a shape needs a
   * way to map the points on its surface to the pixels in an image. Built-in
   * shapes such as rect() and
   * box() already have these texture mappings based on
   * their vertices. Custom shapes created with
   * vertex() require texture mappings to be passed as
   * uv coordinates.Each call to vertex() must include 5 arguments,
   * as in `vertex(x, y, z, u, v)`, to map the vertex at coordinates `(x, y, z)`
   * to the pixel at coordinates `(u, v)` within an image. For example, the
   * corners of a rectangular image are mapped to the corners of a rectangle by default:`// Apply the image as a texture.
   * texture(img);
   * 
   * // Draw the rectangle.
   * rect(0, 0, 30, 50);`If the image in the code snippet above has dimensions of 300 x 500 pixels,
   * the same result could be achieved as follows:`// Apply the image as a texture.
   * texture(img);
   * 
   * // Draw the rectangle.
   * beginShape();
   * 
   * // Top-left.
   * // u: 0, v: 0
   * vertex(0, 0, 0, 0, 0);
   * 
   * // Top-right.
   * // u: 300, v: 0
   * vertex(30, 0, 0, 300, 0);
   * 
   * // Bottom-right.
   * // u: 300, v: 500
   * vertex(30, 50, 0, 300, 500);
   * 
   * // Bottom-left.
   * // u: 0, v: 500
   * vertex(0, 50, 0, 0, 500);
   * 
   * endShape();``textureMode()` changes the coordinate system for uv coordinates.The parameter, `mode`, accepts two possible constants. If `NORMAL` is
   * passed, as in `textureMode(NORMAL)`, then the texture’s uv coordinates can
   * be provided in the range 0 to 1 instead of the image’s dimensions. This can
   * be helpful for using the same code for multiple images of different sizes.
   * For example, the code snippet above could be rewritten as follows:`// Set the texture mode to use normalized coordinates.
   * textureMode(NORMAL);
   * 
   * // Apply the image as a texture.
   * texture(img);
   * 
   * // Draw the rectangle.
   * beginShape();
   * 
   * // Top-left.
   * // u: 0, v: 0
   * vertex(0, 0, 0, 0, 0);
   * 
   * // Top-right.
   * // u: 1, v: 0
   * vertex(30, 0, 0, 1, 0);
   * 
   * // Bottom-right.
   * // u: 1, v: 1
   * vertex(30, 50, 0, 1, 1);
   * 
   * // Bottom-left.
   * // u: 0, v: 1
   * vertex(0, 50, 0, 0, 1);
   * 
   * endShape();`By default, `mode` is `IMAGE`, which scales uv coordinates to the
   * dimensions of the image. Calling `textureMode(IMAGE)` applies the default.Note: `textureMode()` can only be used in WebGL mode.
 *
   * @param
   */
  textureMode(mode: IMAGE | NORMAL): void;

  /**
   * Changes the way textures behave when a shape’s uv coordinates go beyond the
   * texture.In order for texture() to work, a shape needs a
   * way to map the points on its surface to the pixels in an image. Built-in
   * shapes such as rect() and
   * box() already have these texture mappings based on
   * their vertices. Custom shapes created with
   * vertex() require texture mappings to be passed as
   * uv coordinates.Each call to vertex() must include 5 arguments,
   * as in `vertex(x, y, z, u, v)`, to map the vertex at coordinates `(x, y, z)`
   * to the pixel at coordinates `(u, v)` within an image. For example, the
   * corners of a rectangular image are mapped to the corners of a rectangle by default:`// Apply the image as a texture.
   * texture(img);
   * 
   * // Draw the rectangle.
   * rect(0, 0, 30, 50);`If the image in the code snippet above has dimensions of 300 x 500 pixels,
   * the same result could be achieved as follows:`// Apply the image as a texture.
   * texture(img);
   * 
   * // Draw the rectangle.
   * beginShape();
   * 
   * // Top-left.
   * // u: 0, v: 0
   * vertex(0, 0, 0, 0, 0);
   * 
   * // Top-right.
   * // u: 300, v: 0
   * vertex(30, 0, 0, 300, 0);
   * 
   * // Bottom-right.
   * // u: 300, v: 500
   * vertex(30, 50, 0, 300, 500);
   * 
   * // Bottom-left.
   * // u: 0, v: 500
   * vertex(0, 50, 0, 0, 500);
   * 
   * endShape();``textureWrap()` controls how textures behave when their uv's go beyond the
   * texture. Doing so can produce interesting visual effects such as tiling.
   * For example, the custom shape above could have u-coordinates are greater
   * than the image’s width:`// Apply the image as a texture.
   * texture(img);
   * 
   * // Draw the rectangle.
   * beginShape();
   * vertex(0, 0, 0, 0, 0);
   * 
   * // Top-right.
   * // u: 600
   * vertex(30, 0, 0, 600, 0);
   * 
   * // Bottom-right.
   * // u: 600
   * vertex(30, 50, 0, 600, 500);
   * 
   * vertex(0, 50, 0, 0, 500);
   * endShape();`The u-coordinates of 600 are greater than the texture image’s width of 300.
   * This creates interesting possibilities.The first parameter, `wrapX`, accepts three possible constants. If `CLAMP`
   * is passed, as in `textureWrap(CLAMP)`, the pixels at the edge of the
   * texture will extend to the shape’s edges. If `REPEAT` is passed, as in
   * `textureWrap(REPEAT)`, the texture will tile repeatedly until reaching the
   * shape’s edges. If `MIRROR` is passed, as in `textureWrap(MIRROR)`, the
   * texture will tile repeatedly until reaching the shape’s edges, flipping
   * its orientation between tiles. By default, textures `CLAMP`.The second parameter, `wrapY`, is optional. It accepts the same three
   * constants, `CLAMP`, `REPEAT`, and `MIRROR`. If one of these constants is
   * passed, as in `textureWRAP(MIRROR, REPEAT)`, then the texture will `MIRROR`
   * horizontally and `REPEAT` vertically. By default, `wrapY` will be set to
   * the same value as `wrapX`.Note: `textureWrap()` can only be used in WebGL mode.
 *
   * @param
   * @param
   */
  textureWrap(wrapX: CLAMP | REPEAT | MIRROR, wrapY: CLAMP | REPEAT | MIRROR): void;

  /**
   * Sets the current material as a normal material.A normal material sets surfaces facing the x-axis to red, those facing the
   * y-axis to green, and those facing the z-axis to blue. Normal material isn't
   * affected by light. It’s often used as a placeholder material when debugging.Note: `normalMaterial()` can only be used in WebGL mode.
   */
  normalMaterial(): void;

  /**
   * Sets the ambient color of shapes’ surface material.The `ambientMaterial()` color sets the components of the
   * ambientLight() color that shapes will
   * reflect. For example, calling `ambientMaterial(255, 255, 0)` would cause a
   * shape to reflect red and green light, but not blue light.`ambientMaterial()` can be called three ways with different parameters to
   * set the material’s color.The first way to call `ambientMaterial()` has one parameter, `gray`.
   * Grayscale values between 0 and 255, as in `ambientMaterial(50)`, can be
   * passed to set the material’s color. Higher grayscale values make shapes
   * appear brighter.The second way to call `ambientMaterial()` has one parameter, `color`. A
   * p5.Color object, an array of color values, or a
   * CSS color string, as in `ambientMaterial('magenta')`, can be passed to set
   * the material’s color.The third way to call `ambientMaterial()` has three parameters, `v1`, `v2`,
   * and `v3`. RGB, HSB, or HSL values, as in `ambientMaterial(255, 0, 0)`, can
   * be passed to set the material’s colors. Color values will be interpreted
   * using the current colorMode().Note: `ambientMaterial()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   */
  ambientMaterial(v1: number, v2: number, v3: number): void;

  ambientMaterial(gray: number): void;

  ambientMaterial(color: p5.Color | number[] | string): void;

  /**
   * Sets the emissive color of shapes’ surface material.The `emissiveMaterial()` color sets a color shapes display at full
   * strength, regardless of lighting. This can give the appearance that a shape
   * is glowing. However, emissive materials don’t actually emit light that
   * can affect surrounding objects.`emissiveMaterial()` can be called three ways with different parameters to
   * set the material’s color.The first way to call `emissiveMaterial()` has one parameter, `gray`.
   * Grayscale values between 0 and 255, as in `emissiveMaterial(50)`, can be
   * passed to set the material’s color. Higher grayscale values make shapes
   * appear brighter.The second way to call `emissiveMaterial()` has one parameter, `color`. A
   * p5.Color object, an array of color values, or a
   * CSS color string, as in `emissiveMaterial('magenta')`, can be passed to set
   * the material’s color.The third way to call `emissiveMaterial()` has four parameters, `v1`, `v2`,
   * `v3`, and `alpha`. `alpha` is optional. RGBA, HSBA, or HSLA values can be
   * passed to set the material’s colors, as in `emissiveMaterial(255, 0, 0)` or
   * `emissiveMaterial(255, 0, 0, 30)`. Color values will be interpreted using
   * the current colorMode().Note: `emissiveMaterial()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   */
  emissiveMaterial(v1: number, v2: number, v3: number, alpha: number): void;

  emissiveMaterial(gray: number): void;

  emissiveMaterial(color: p5.Color | number[] | string): void;

  /**
   * Sets the specular color of shapes’ surface material.The `specularMaterial()` color sets the components of light color that
   * glossy coats on shapes will reflect. For example, calling
   * `specularMaterial(255, 255, 0)` would cause a shape to reflect red and
   * green light, but not blue light.Unlike ambientMaterial(),
   * `specularMaterial()` will reflect the full color of light sources including
   * directionalLight(),
   * pointLight(),
   * and spotLight(). This is what gives it shapes
   * their "shiny" appearance. The material’s shininess can be controlled by the
   * shininess() function.`specularMaterial()` can be called three ways with different parameters to
   * set the material’s color.The first way to call `specularMaterial()` has one parameter, `gray`.
   * Grayscale values between 0 and 255, as in `specularMaterial(50)`, can be
   * passed to set the material’s color. Higher grayscale values make shapes
   * appear brighter.The second way to call `specularMaterial()` has one parameter, `color`. A
   * p5.Color> object, an array of color values, or a CSS
   * color string, as in `specularMaterial('magenta')`, can be passed to set the
   * material’s color.The third way to call `specularMaterial()` has four parameters, `v1`, `v2`,
   * `v3`, and `alpha`. `alpha` is optional. RGBA, HSBA, or HSLA values can be
   * passed to set the material’s colors, as in `specularMaterial(255, 0, 0)` or
   * `specularMaterial(255, 0, 0, 30)`. Color values will be interpreted using
   * the current colorMode().
 *
   * @param
   * @param
   */
  specularMaterial(gray: number, alpha: number): void;

  specularMaterial(v1: number, v2: number, v3: number, alpha: number): void;

  specularMaterial(color: p5.Color | number[] | string): void;

  /**
   * Sets the amount of gloss ("shininess") of a
   * specularMaterial().Shiny materials focus reflected light more than dull materials.
   * `shininess()` affects the way materials reflect light sources including
   * directionalLight(),
   * pointLight(),
   * and spotLight().The parameter, `shine`, is a number that sets the amount of shininess.
   * `shine` must be greater than 1, which is its default value.
 *
   * @param
   */
  shininess(shine: number): void;

  /**
   * Sets the amount of "metalness" of a
   * specularMaterial().`metalness()` can make materials appear more metallic. It affects the way
   * materials reflect light sources including
   * affects the way materials reflect light sources including
   * directionalLight(),
   * pointLight(),
   * spotLight(), and
   * imageLight().The parameter, `metallic`, is a number that sets the amount of metalness.
   * `metallic` must be greater than 1, which is its default value. Higher
   * values, such as `metalness(100)`, make specular materials appear more
   * metallic.
 *
   * @param
   */
  metalness(metallic: number): void;

  /**
   * Rotates the camera in a clockwise/counter-clockwise direction.Rolling rotates the camera without changing its orientation. The rotation
   * happens in the camera’s "local" space.The parameter, `angle`, is the angle the camera should rotate. Passing a
   * positive angle, as in `myCamera.roll(0.001)`, rotates the camera in counter-clockwise direction.
   * Passing a negative angle, as in `myCamera.roll(-0.001)`, rotates the
   * camera in clockwise direction.Note: Angles are interpreted based on the current
   * angleMode().
 *
   * @param
   */
  roll(angle: number): void;

  /**
   * Sets the position and orientation of the current camera in a 3D sketch.`camera()` allows objects to be viewed from different angles. It has nine
   * parameters that are all optional.The first three parameters, `x`, `y`, and `z`, are the coordinates of the
   * camera’s position. For example, calling `camera(0, 0, 0)` places the camera
   * at the origin `(0, 0, 0)`. By default, the camera is placed at
   * `(0, 0, 800)`.The next three parameters, `centerX`, `centerY`, and `centerZ` are the
   * coordinates of the point where the camera faces. For example, calling
   * `camera(0, 0, 0, 10, 20, 30)` places the camera at the origin `(0, 0, 0)`
   * and points it at `(10, 20, 30)`. By default, the camera points at the
   * origin `(0, 0, 0)`.The last three parameters, `upX`, `upY`, and `upZ` are the components of
   * the "up" vector. The "up" vector orients the camera’s y-axis. For example,
   * calling `camera(0, 0, 0, 10, 20, 30, 0, -1, 0)` places the camera at the
   * origin `(0, 0, 0)`, points it at `(10, 20, 30)`, and sets the "up" vector
   * to `(0, -1, 0)` which is like holding it upside-down. By default, the "up"
   * vector is `(0, 1, 0)`.Note: `camera()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  camera(x: number, y: number, z: number, centerX: number, centerY: number, centerZ: number, upX: number, upY: number, upZ: number): void;

  /**
   * Sets a perspective projection for the current camera in a 3D sketch.In a perspective projection, shapes that are further from the camera appear
   * smaller than shapes that are near the camera. This technique, called
   * foreshortening, creates realistic 3D scenes. It’s applied by default in
   * WebGL mode.`perspective()` changes the camera’s perspective by changing its viewing
   * frustum. The frustum is the volume of space that’s visible to the camera.
   * Its shape is a pyramid with its top cut off. The camera is placed where
   * the top of the pyramid should be and views everything between the frustum’s
   * top (near) plane and its bottom (far) plane.The first parameter, `fovy`, is the camera’s vertical field of view. It’s
   * an angle that describes how tall or narrow a view the camera has. For
   * example, calling `perspective(0.5)` sets the camera’s vertical field of
   * view to 0.5 radians. By default, `fovy` is calculated based on the sketch’s
   * height and the camera’s default z-coordinate, which is 800. The formula for
   * the default `fovy` is `2 * atan(height / 2 / 800)`.The second parameter, `aspect`, is the camera’s aspect ratio. It’s a number
   * that describes the ratio of the top plane’s width to its height. For
   * example, calling `perspective(0.5, 1.5)` sets the camera’s field of view to
   * 0.5 radians and aspect ratio to 1.5, which would make shapes appear thinner
   * on a square canvas. By default, aspect is set to `width / height`.The third parameter, `near`, is the distance from the camera to the near
   * plane. For example, calling `perspective(0.5, 1.5, 100)` sets the camera’s
   * field of view to 0.5 radians, its aspect ratio to 1.5, and places the near
   * plane 100 pixels from the camera. Any shapes drawn less than 100 pixels
   * from the camera won’t be visible. By default, near is set to `0.1 * 800`,
   * which is 1/10th the default distance between the camera and the origin.The fourth parameter, `far`, is the distance from the camera to the far
   * plane. For example, calling `perspective(0.5, 1.5, 100, 10000)` sets the
   * camera’s field of view to 0.5 radians, its aspect ratio to 1.5, places the
   * near plane 100 pixels from the camera, and places the far plane 10,000
   * pixels from the camera. Any shapes drawn more than 10,000 pixels from the
   * camera won’t be visible. By default, far is set to `10 * 800`, which is 10
   * times the default distance between the camera and the origin.Note: `perspective()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: number, aspect: number, near: number, far: number): void;

  /**
   * Enables or disables perspective for lines in 3D sketches.In WebGL mode, lines can be drawn with a thinner stroke when they’re
   * further from the camera. Doing so gives them a more realistic appearance.By default, lines are drawn differently based on the type of perspective
   * being used:`linePerspective()` can override the default line drawing mode.The parameter, `enable`, is optional. It’s a `Boolean` value that sets the
   * way lines are drawn. If `true` is passed, as in `linePerspective(true)`,
   * then lines will appear thinner when they are further from the camera. If
   * `false` is passed, as in `linePerspective(false)`, then lines will have
   * consistent stroke weights regardless of their distance from the camera. By
   * default, `linePerspective()` is enabled.Calling `linePerspective()` without passing an argument returns `true` if
   * it's enabled and `false` if not.Note: `linePerspective()` can only be used in WebGL mode.
 *
   * @param
   */
  linePerspective(enable: boolean): void;

  linePerspective(): boolean;

  /**
   * Sets an orthographic projection for the current camera in a 3D sketch.In an orthographic projection, shapes with the same size always appear the
   * same size, regardless of whether they are near or far from the camera.`ortho()` changes the camera’s perspective by changing its viewing frustum
   * from a truncated pyramid to a rectangular prism. The camera is placed in
   * front of the frustum and views everything between the frustum’s near plane
   * and its far plane. `ortho()` has six optional parameters to define the
   * frustum.The first four parameters, `left`, `right`, `bottom`, and `top`, set the
   * coordinates of the frustum’s sides, bottom, and top. For example, calling
   * `ortho(-100, 100, 200, -200)` creates a frustum that’s 200 pixels wide and
   * 400 pixels tall. By default, these coordinates are set based on the
   * sketch’s width and height, as in
   * `ortho(-width / 2, width / 2, -height / 2, height / 2)`.The last two parameters, `near` and `far`, set the distance of the
   * frustum’s near and far plane from the camera. For example, calling
   * `ortho(-100, 100, 200, 200, 50, 1000)` creates a frustum that’s 200 pixels
   * wide, 400 pixels tall, starts 50 pixels from the camera, and ends 1,000
   * pixels from the camera. By default, `near` and `far` are set to 0 and
   * `max(width, height) + 800`, respectively.Note: `ortho()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): void;

  /**
   * Sets the frustum of the current camera in a 3D sketch.In a frustum projection, shapes that are further from the camera appear
   * smaller than shapes that are near the camera. This technique, called
   * foreshortening, creates realistic 3D scenes.`frustum()` changes the default camera’s perspective by changing its
   * viewing frustum. The frustum is the volume of space that’s visible to the
   * camera. The frustum’s shape is a pyramid with its top cut off. The camera
   * is placed where the top of the pyramid should be and points towards the
   * base of the pyramid. It views everything within the frustum.The first four parameters, `left`, `right`, `bottom`, and `top`, set the
   * coordinates of the frustum’s sides, bottom, and top. For example, calling
   * `frustum(-100, 100, 200, -200)` creates a frustum that’s 200 pixels wide
   * and 400 pixels tall. By default, these coordinates are set based on the
   * sketch’s width and height, as in
   * `ortho(-width / 20, width / 20, height / 20, -height / 20)`.The last two parameters, `near` and `far`, set the distance of the
   * frustum’s near and far plane from the camera. For example, calling
   * `ortho(-100, 100, 200, -200, 50, 1000)` creates a frustum that’s 200 pixels
   * wide, 400 pixels tall, starts 50 pixels from the camera, and ends 1,000
   * pixels from the camera. By default, near is set to `0.1 * 800`, which is
   * 1/10th the default distance between the camera and the origin. `far` is set
   * to `10 * 800`, which is 10 times the default distance between the camera
   * and the origin.Note: `frustum()` can only be used in WebGL mode.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  frustum(left: number, right: number, bottom: number, top: number, near: number, far: number): void;

  /**
   * Creates a new p5.Camera object and sets it
   * as the current (active) camera.The new camera is initialized with a default position `(0, 0, 800)` and a
   * default perspective projection. Its properties can be controlled with
   * p5.Camera methods such as
   * `myCamera.lookAt(0, 0, 0)`.Note: Every 3D sketch starts with a default camera initialized.
   * This camera can be controlled with the functions
   * camera(),
   * perspective(),
   * ortho(), and
   * frustum() if it's the only camera in the scene.Note: `createCamera()` can only be used in WebGL mode.
   */
  createCamera(): p5.Camera;

  /**
   * Sets the current (active) camera of a 3D sketch.`setCamera()` allows for switching between multiple cameras created with
   * createCamera().Note: `setCamera()` can only be used in WebGL mode.
 *
   * @param
   */
  setCamera(cam: p5.Camera): void;

  /**
   * The `saveObj()` function exports `p5.Geometry` objects as
   * 3D models in the Wavefront .obj file format.
   * This way, you can use the 3D shapes you create in p5.js in other software
   * for rendering, animation, 3D printing, or more.The exported .obj file will include the faces and vertices of the `p5.Geometry`,
   * as well as its texture coordinates and normals, if it has them.
 *
   * @param
   */
  saveObj(fileName: string): void;

  /**
   * The `saveStl()` function exports `p5.Geometry` objects as
   * 3D models in the STL stereolithography file format.
   * This way, you can use the 3D shapes you create in p5.js in other software
   * for rendering, animation, 3D printing, or more.The exported .stl file will include the faces, vertices, and normals of the `p5.Geometry`.By default, this method saves a text-based .stl file. Alternatively, you can save a more compact
   * but less human-readable binary .stl file by passing `{ binary: true }` as a second parameter.
 *
   * @param
   * @param
   */
  saveStl(fileName: string, options: object): void;

  /**
   * Returns a Quaternion for the
   * axis angle representation of the rotation
 *
   * @param
   * @param
   * @param
   * @param
   */
  fromAxisAngle(angle: number, x: number, y: number, z: number): void;

  /**
   * Rotates the Quaternion by the quaternion passed
   * which contains the axis of roation and angle of rotation
 *
   * @param
   */
  rotateBy(axesQuat: p5.Quat): void;

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
   * @param
   * @param
   */
  setAttributes(key: string, value: boolean): void;

  setAttributes(obj: object): void;

  setPixel(imageInfo: object, r: number, g: number, b: number, a: number): void;

  minMax(rg: number[], min: number, max: number): void;

  clamp(v: number, min: number, max: number): void;

  cubicToQuadratics(x0: number, y0: number, cx0: number, cy0: number, cx1: number, cy1: number, x1: number, y1: number): Cubic[];

  pushLine(x0: number, y0: number, x1: number, y1: number): void;

  samePoint(x0: number, y0: number, x1: number, y1: number): boolean;

  layout(dimImageInfos: ImageInfo[], cellImageInfos: ImageInfo[]): object;

  }

/**
 * A function that's called once when the sketch begins running.Declaring the function `setup()` sets a code block to run once
 * automatically when the sketch starts running. It's used to perform
 * setup tasks such as creating the canvas and initializing variables:`function setup() {
 * // Code to run once at the start of the sketch.
 * }`Code placed in `setup()` will run once before code placed in
 * draw() begins looping.
 * If `setup()` is declared `async` (e.g. `async function setup()`),
 * execution pauses at each `await` until its promise resolves.
 * For example, `font = await loadFont(...)` waits for the font asset
 * to load because `loadFont()` function returns a promise, and the await
 * keyword means the program will wait for the promise to resolve.
 * This ensures that all assets are fully loaded before the sketch continues.loading assets.Note: `setup()` doesn’t have to be declared, but it’s common practice to do so.
 *
 * @for p5
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Draw the circle.
 * circle(50, 50, 40);
 * 
 * describe('A white circle on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Paint the background once.
 * background(200);
 * 
 * describe(
 * 'A white circle on a gray background. The circle follows the mouse as the user moves, leaving a trail.'
 * );
 * }
 * 
 * function draw() {
 * // Draw circles repeatedly.
 * circle(mouseX, mouseY, 40);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Draw the image.
 * image(img, 0, 0);
 * 
 * describe(
 * 'A white circle on a brick wall. The circle follows the mouse as the user moves, leaving a trail.'
 * );
 * }
 * 
 * function draw() {
 * // Style the circle.
 * noStroke();
 * 
 * // Draw the circle.
 * circle(mouseX, mouseY, 10);
 * }
 * </code>
 * </div>
 */
function setup(): void;

/**
 * A function that's called repeatedly while the sketch runs.Declaring the function `draw()` sets a code block to run repeatedly
 * once the sketch starts. It’s used to create animations and respond to
 * user inputs:`function draw() {
 * // Code to run repeatedly.
 * }`This is often called the "draw loop" because p5.js calls the code in
 * `draw()` in a loop behind the scenes. By default, `draw()` tries to run
 * 60 times per second. The actual rate depends on many factors. The
 * drawing rate, called the "frame rate", can be controlled by calling
 * frameRate(). The number of times `draw()`
 * has run is stored in the system variable
 * frameCount().Code placed within `draw()` begins looping after
 * setup() runs. `draw()` will run until the user
 * closes the sketch. `draw()` can be stopped by calling the
 * noLoop() function. `draw()` can be resumed by
 * calling the loop() function.
 *
 * @for p5
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Paint the background once.
 * background(200);
 * 
 * describe(
 * 'A white circle on a gray background. The circle follows the mouse as the user moves, leaving a trail.'
 * );
 * }
 * 
 * function draw() {
 * // Draw circles repeatedly.
 * circle(mouseX, mouseY, 40);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A white circle on a gray background. The circle follows the mouse as the user moves.'
 * );
 * }
 * 
 * function draw() {
 * // Paint the background repeatedly.
 * background(200);
 * 
 * // Draw circles repeatedly.
 * circle(mouseX, mouseY, 40);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Double-click the canvas to change the circle's color.
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A white circle on a gray background. The circle follows the mouse as the user moves. The circle changes color to pink when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * // Paint the background repeatedly.
 * background(200);
 * 
 * // Draw circles repeatedly.
 * circle(mouseX, mouseY, 40);
 * }
 * 
 * // Change the fill color when the user double-clicks.
 * function doubleClicked() {
 * fill('deeppink');
 * }
 * </code>
 * </div>
 */
function draw(): void;

}

export default function main(p5: any, fn: any): void;
