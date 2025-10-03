// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';

declare module 'p5' {
/**
 * An array containing the color of each pixel on the canvas.Colors are stored as numbers representing red, green, blue, and alpha
 * (RGBA) values. `pixels` is a one-dimensional array for performance reasons.Each pixel occupies four elements in the `pixels` array, one for each RGBA
 * value. For example, the pixel at coordinates (0, 0) stores its RGBA values
 * at `pixels[0]`, `pixels[1]`, `pixels[2]`, and `pixels[3]`, respectively.
 * The next pixel at coordinates (1, 0) stores its RGBA values at `pixels[4]`,
 * `pixels[5]`, `pixels[6]`, and `pixels[7]`. And so on. The `pixels` array
 * for a 100×100 canvas has 100 × 100 × 4 = 40,000 elements.Some displays use several smaller pixels to set the color at a single
 * point. The pixelDensity() function returns
 * the pixel density of the canvas. High density displays often have a
 * pixelDensity() of 2. On such a display, the
 * `pixels` array for a 100×100 canvas has 200 × 200 × 4 =
 * 160,000 elements.Accessing the RGBA values for a point on the canvas requires a little math
 * as shown below. The loadPixels() function
 * must be called before accessing the `pixels` array. The
 * updatePixels() function must be called
 * after any changes are made.
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(128);
 * 
 * // Load the pixels array.
 * loadPixels();
 * 
 * // Set the dot's coordinates.
 * let x = 50;
 * let y = 50;
 * 
 * // Get the pixel density.
 * let d = pixelDensity();
 * 
 * // Set the pixel(s) at the center of the canvas black.
 * for (let i = 0; i < d; i += 1) {
 * for (let j = 0; j < d; j += 1) {
 * let index = 4 * ((y * d + j) * width * d + (x * d + i));
 * // Red.
 * pixels[index] = 0;
 * // Green.
 * pixels[index + 1] = 0;
 * // Blue.
 * pixels[index + 2] = 0;
 * // Alpha.
 * pixels[index + 3] = 255;
 * }
 * }
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('A black dot in the middle of a gray rectangle.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Load the pixels array.
 * loadPixels();
 * 
 * // Get the pixel density.
 * let d = pixelDensity();
 * 
 * // Calculate the halfway index in the pixels array.
 * let halfImage = 4 * (d * width) * (d * height / 2);
 * 
 * // Make the top half of the canvas red.
 * for (let i = 0; i < halfImage; i += 4) {
 * // Red.
 * pixels[i] = 255;
 * // Green.
 * pixels[i + 1] = 0;
 * // Blue.
 * pixels[i + 2] = 0;
 * // Alpha.
 * pixels[i + 3] = 255;
 * }
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('A red rectangle drawn above a gray rectangle.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Color object.
 * let pink = color(255, 102, 204);
 * 
 * // Load the pixels array.
 * loadPixels();
 * 
 * // Get the pixel density.
 * let d = pixelDensity();
 * 
 * // Calculate the halfway index in the pixels array.
 * let halfImage = 4 * (d * width) * (d * height / 2);
 * 
 * // Make the top half of the canvas red.
 * for (let i = 0; i < halfImage; i += 4) {
 * pixels[i] = red(pink);
 * pixels[i + 1] = green(pink);
 * pixels[i + 2] = blue(pink);
 * pixels[i + 3] = alpha(pink);
 * }
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('A pink rectangle drawn above a gray rectangle.');
 * }
 * </code>
 * </div>
 */
function blend(...args: any[]): void;

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
 * @param source image.
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @param the blend mode. either
 * BLEND, DARKEST, LIGHTEST, DIFFERENCE,
 * MULTIPLY, EXCLUSION, SCREEN, REPLACE, OVERLAY, HARD_LIGHT,
 * SOFT_LIGHT, DODGE, BURN, ADD or NORMAL.
 * @example <div>
 * <code>
 * let img0;
 * let img1;
 * 
 * async function setup() {
 * // Load the images.
 * img0 = await loadImage('assets/rockies.jpg');
 * img1 = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Use the mountains as the background.
 * background(img0);
 * 
 * // Display the bricks.
 * image(img1, 0, 0);
 * 
 * // Display the bricks faded into the landscape.
 * blend(img1, 0, 0, 33, 100, 67, 0, 33, 100, LIGHTEST);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears faded on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img0;
 * let img1;
 * 
 * async function setup() {
 * // Load the images.
 * img0 = await loadImage('assets/rockies.jpg');
 * img1 = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Use the mountains as the background.
 * background(img0);
 * 
 * // Display the bricks.
 * image(img1, 0, 0);
 * 
 * // Display the bricks partially transparent.
 * blend(img1, 0, 0, 33, 100, 67, 0, 33, 100, DARKEST);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears transparent on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img0;
 * let img1;
 * 
 * async function setup() {
 * // Load the images.
 * img0 = await loadImage('assets/rockies.jpg');
 * img1 = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Use the mountains as the background.
 * background(img0);
 * 
 * // Display the bricks.
 * image(img1, 0, 0);
 * 
 * // Display the bricks washed out into the landscape.
 * blend(img1, 0, 0, 33, 100, 67, 0, 33, 100, ADD);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears washed out on the right of the image.');
 * }
 * </code>
 * </div>
 */
function blend(srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 */
function blend(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

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
 * @param source image.
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Use the mountains as the background.
 * background(img);
 * 
 * // Copy a region of pixels to another spot.
 * copy(img, 7, 22, 10, 10, 35, 25, 50, 50);
 * 
 * // Outline the copied region.
 * stroke(255);
 * noFill();
 * square(7, 22, 10);
 * 
 * describe('An image of a mountain landscape. A square region is outlined in white. A larger square contains a pixelated view of the outlined region.');
 * }
 * </code>
 * </div>
 */
function copy(srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 */
function copy(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

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
 * @param either THRESHOLD, GRAY, OPAQUE, INVERT,
 * POSTERIZE, BLUR, ERODE, DILATE or BLUR.
 * @param parameter unique to each filter.
 * @param flag to control whether to use fast
 * WebGL filters (GPU) or original image
 * filters (CPU); defaults to `true`.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the INVERT filter.
 * filter(INVERT);
 * 
 * describe('A blue brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the GRAY filter.
 * filter(GRAY);
 * 
 * describe('A brick wall drawn in grayscale.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the THRESHOLD filter.
 * filter(THRESHOLD);
 * 
 * describe('A brick wall drawn in black and white.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the OPAQUE filter.
 * filter(OPAQUE);
 * 
 * describe('A red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the POSTERIZE filter.
 * filter(POSTERIZE, 3);
 * 
 * describe('An image of a red brick wall drawn with limited color palette.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the BLUR filter.
 * filter(BLUR, 3);
 * 
 * describe('A blurry image of a red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the DILATE filter.
 * filter(DILATE);
 * 
 * describe('A red brick wall with bright lines between each brick.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the ERODE filter.
 * filter(ERODE);
 * 
 * describe('A red brick wall with faint lines between each brick.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Apply the BLUR filter.
 * // Don't use WebGL.
 * filter(BLUR, 3, false);
 * 
 * describe('A blurry image of a red brick wall.');
 * }
 * </code>
 * </div>
 */
function filter(filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | BLUR | ERODE | DILATE | BLUR, filterParam?: number, useWebGL: boolean): void;

/**
 */
function filter(filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | BLUR | ERODE | DILATE | BLUR, filterParam?: number, useWebGL: boolean): void;

/**
 * @param shader that's been loaded, with the
 * frag shader using a `tex0` uniform.
 */
function filter(shaderFilter: p5.Shader): void;

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
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param width of the subsection to be returned.
 * @param height of the subsection to be returned.
 * @return subsection as a <a href="#/p5.Image">p5.Image</a> object.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Get the entire canvas.
 * let c = get();
 * 
 * // Display half the canvas.
 * image(c, 50, 0);
 * 
 * describe('Two identical mountain landscapes shown side-by-side.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Get the color of a pixel.
 * let c = get(50, 90);
 * 
 * // Style the square with the pixel's color.
 * fill(c);
 * noStroke();
 * 
 * // Display the square.
 * square(25, 25, 50);
 * 
 * describe('A mountain landscape with an olive green square in its center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Get a region of the image.
 * let c = get(0, 0, 50, 50);
 * 
 * // Display the region.
 * image(c, 50, 50);
 * 
 * describe('A mountain landscape drawn on top of another mountain landscape.');
 * }
 * </code>
 * </div>
 */
function get(x: number, y: number, w: number, h: number): p5.Image;

/**
 * @return whole canvas as a <a href="#/p5.Image">p5.Image</a>.
 */
function get(): p5.Image;

/**
 * @return color of the pixel at (x, y) in array format `[R, G, B, A]`.
 */
function get(x: number, y: number): number[];

/**
 * Loads the current value of each pixel on the canvas into the
 * pixels array.`loadPixels()` must be called before reading from or writing to
 * pixels.
 *
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0, 100, 100);
 * 
 * // Get the pixel density.
 * let d = pixelDensity();
 * 
 * // Calculate the halfway index in the pixels array.
 * let halfImage = 4 * (d * width) * (d * height / 2);
 * 
 * // Load the pixels array.
 * loadPixels();
 * 
 * // Copy the top half of the canvas to the bottom.
 * for (let i = 0; i < halfImage; i += 1) {
 * pixels[i + halfImage] = pixels[i];
 * }
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('Two identical images of mountain landscapes, one on top of the other.');
 * }
 * </code>
 * </div>
 */
function loadPixels(): void;

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
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param grayscale value | pixel array |
 * <a href="#/p5.Color">p5.Color</a> object | <a href="#/p5.Image">p5.Image</a> to copy.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Set four pixels to black.
 * set(30, 20, 0);
 * set(85, 20, 0);
 * set(85, 75, 0);
 * set(30, 75, 0);
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Color object.
 * let black = color(0);
 * 
 * // Set four pixels to black.
 * set(30, 20, black);
 * set(85, 20, black);
 * set(85, 75, black);
 * set(30, 75, black);
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(255);
 * 
 * // Draw a horizontal color gradient.
 * for (let x = 0; x < 100; x += 1) {
 * for (let y = 0; y < 100; y += 1) {
 * // Calculate the grayscale value.
 * let c = map(x, 0, 100, 0, 255);
 * 
 * // Set the pixel using the grayscale value.
 * set(x, y, c);
 * }
 * }
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('A horiztonal color gradient from black to white.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Use the image to set all pixels.
 * set(0, 0, img);
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('An image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function set(x: number, y: number, c: number | number[] | object): void;

/**
 * Updates the canvas with the RGBA values in the
 * pixels array.`updatePixels()` only needs to be called after changing values in the
 * pixels array. Such changes can be made directly
 * after calling loadPixels() or by calling
 * set().
 *
 * @param x-coordinate of the upper-left corner of region
 * to update.
 * @param y-coordinate of the upper-left corner of region
 * to update.
 * @param width of region to update.
 * @param height of region to update.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0, 100, 100);
 * 
 * // Get the pixel density.
 * let d = pixelDensity();
 * 
 * // Calculate the halfway index in the pixels array.
 * let halfImage = 4 * (d * width) * (d * height / 2);
 * 
 * // Load the pixels array.
 * loadPixels();
 * 
 * // Copy the top half of the canvas to the bottom.
 * for (let i = 0; i < halfImage; i += 1) {
 * pixels[i + halfImage] = pixels[i];
 * }
 * 
 * // Update the canvas.
 * updatePixels();
 * 
 * describe('Two identical images of mountain landscapes, one on top of the other.');
 * }
 * </code>
 * </div>
 */
function updatePixels(x?: number, y?: number, w?: number, h?: number): void;

}

export default function pixels(p5: any, fn: any): void;
