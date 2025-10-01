// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';

declare module 'p5' {
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
 * @param path of the image to be loaded or base64 encoded image.
 * @param function called with
 * <a href="#/p5.Image">p5.Image</a> once it
 * loads.
 * @param function called with event
 * error if the image fails to load.
 * @return the <a href="#/p5.Image">p5.Image</a> object.
 * @example <div>
 * <code>
 * let img;
 * 
 * // Load the image and create a p5.Image object.
 * async function setup() {
 * img = await loadImage('assets/laDefense.jpg');
 * createCanvas(100, 100);
 * 
 * // Draw the image.
 * image(img, 0, 0);
 * 
 * describe('Image of the underside of a white umbrella and a gridded ceiling.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * async function setup() {
 * // Call handleImage() once the image loads.
 * await loadImage('assets/laDefense.jpg', handleImage);
 * 
 * describe('Image of the underside of a white umbrella and a gridded ceiling.');
 * }
 * 
 * // Display the image.
 * function handleImage(img) {
 * image(img, 0, 0);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * async function setup() {
 * // Call handleImage() once the image loads or
 * // call handleError() if an error occurs.
 * await loadImage('assets/laDefense.jpg', handleImage, handleError);
 * }
 * 
 * // Display the image.
 * function handleImage(img) {
 * image(img, 0, 0);
 * 
 * describe('Image of the underside of a white umbrella and a gridded ceiling.');
 * }
 * 
 * // Log the error.
 * function handleError(event) {
 * console.error('Oops!', event);
 * }
 * </code>
 * </div>
 */
function loadImage(path: string | Request, successCallback?: any, failureCallback?: any): Promise<p5.Image>;

/**
 * Generates a gif from a sketch and saves it to a file.`saveGif()` may be called in setup() or at any
 * point while a sketch is running.The first parameter, `fileName`, sets the gif's file name.The second parameter, `duration`, sets the gif's duration in seconds.The third parameter, `options`, is optional. If an object is passed,
 * `saveGif()` will use its properties to customize the gif. `saveGif()`
 * recognizes the properties `delay`, `units`, `silent`,
 * `notificationDuration`, and `notificationID`.
 *
 * @param file name of gif.
 * @param duration in seconds to capture from the sketch.
 * @param an object that can contain five more properties:
 * `delay`, a Number specifying how much time to wait before recording;
 * `units`, a String that can be either 'seconds' or 'frames'. By default it's 'seconds’;
 * `silent`, a Boolean that defines presence of progress notifications. By default it’s `false`;
 * `notificationDuration`, a Number that defines how long in seconds the final notification
 * will live. By default it's `0`, meaning the notification will never be removed;
 * `notificationID`, a String that specifies the id of the notification's DOM element. By default it’s `'progressBar’`.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A circle drawn in the middle of a gray square. The circle changes color from black to white, then repeats.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the circle.
 * let c = frameCount % 255;
 * fill(c);
 * 
 * // Display the circle.
 * circle(50, 50, 25);
 * }
 * 
 * // Save a 5-second gif when the user presses the 's' key.
 * function keyPressed() {
 * if (key === 's') {
 * saveGif('mySketch', 5);
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A circle drawn in the middle of a gray square. The circle changes color from black to white, then repeats.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the circle.
 * let c = frameCount % 255;
 * fill(c);
 * 
 * // Display the circle.
 * circle(50, 50, 25);
 * }
 * 
 * // Save a 5-second gif when the user presses the 's' key.
 * // Wait 1 second after the key press before recording.
 * function keyPressed() {
 * if (key === 's') {
 * saveGif('mySketch', 5, { delay: 1 });
 * }
 * }
 * </code>
 * </div>
 */
function saveGif(filename: string, duration: number, options?: object): void;

/**
 * Helper function for loading GIF-based images
 *
 */
function _createGif(arrayBuffer: any, pImg: any): void;

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
 * @param image to display.
 * @param x-coordinate of the top-left corner of the image.
 * @param y-coordinate of the top-left corner of the image.
 * @param width to draw the image.
 * @param height to draw the image.
 * @example <div>
 * <code>
 * let img;
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
 * image(img, 10, 10);
 * 
 * describe('An image of the underside of a white umbrella with a gridded ceiling above. The image has dark gray borders on its left and top.');
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
 * img = await loadImage('assets/laDefense.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Draw the image 50x50.
 * image(img, 0, 0, 50, 50);
 * 
 * describe('An image of the underside of a white umbrella with a gridded ceiling above. The image is drawn in the top left corner of a dark gray square.');
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
 * img = await loadImage('assets/laDefense.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Draw the center of the image.
 * image(img, 25, 25, 50, 50, 25, 25, 50, 50);
 * 
 * describe('An image of a gridded ceiling drawn in the center of a dark gray square.');
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
 * img = await loadImage('assets/moonwalk.jpg');
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Draw the image and scale it to fit within the canvas.
 * image(img, 0, 0, width, height, 0, 0, img.width, img.height, CONTAIN);
 * 
 * describe('An image of an astronaut on the moon. The top and bottom borders of the image are dark gray.');
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
 * img = await loadImage('assets/laDefense50.png');
 * 
 * createCanvas(100, 100);
 * 
 * background(50);
 * 
 * // Draw the image and scale it to cover the canvas.
 * image(img, 0, 0, width, height, 0, 0, img.width, img.height, COVER);
 * 
 * describe('A pixelated image of the underside of a white umbrella with a gridded ceiling above.');
 * }
 * </code>
 * </div>
 */
function image(img: p5.Image | p5.Element | p5.Texture | p5.Framebuffer | p5.FramebufferTexture | p5.Renderer | p5.Graphics, x: number, y: number, width?: number, height?: number): void;

/**
 * @param the x-coordinate of the destination
 * rectangle in which to draw the source image
 * @param the y-coordinate of the destination
 * rectangle in which to draw the source image
 * @param the width of the destination rectangle
 * @param the height of the destination rectangle
 * @param the x-coordinate of the subsection of the source
 * image to draw into the destination rectangle
 * @param the y-coordinate of the subsection of the source
 * image to draw into the destination rectangle
 * @param the width of the subsection of the
 * source image to draw into the destination
 * rectangle
 * @param the height of the subsection of the
 * source image to draw into the destination rectangle
 * @param either CONTAIN or COVER
 * @param either LEFT, RIGHT or CENTER default is CENTER
 * @param either TOP, BOTTOM or CENTER default is CENTER
 */
function image(img: p5.Image | p5.Element | p5.Texture | p5.Framebuffer | p5.FramebufferTexture, dx: number, dy: number, dWidth: number, dHeight: number, sx: number, sy: number, sWidth?: number, sHeight?: number, fit?: CONTAIN | COVER, xAlign: LEFT | RIGHT | CENTER, yAlign: TOP | BOTTOM | CENTER): void;

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
 * @param red or hue value.
 * @param green or saturation value.
 * @param blue or brightness.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/laDefense.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Left image.
 * image(img, 0, 0);
 * 
 * // Right image.
 * // Tint with a CSS color string.
 * tint('red');
 * image(img, 50, 0);
 * 
 * describe('Two images of an umbrella and a ceiling side-by-side. The image on the right has a red tint.');
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
 * img = await loadImage('assets/laDefense.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Left image.
 * image(img, 0, 0);
 * 
 * // Right image.
 * // Tint with RGB values.
 * tint(255, 0, 0);
 * image(img, 50, 0);
 * 
 * describe('Two images of an umbrella and a ceiling side-by-side. The image on the right has a red tint.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * *
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/laDefense.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Left.
 * image(img, 0, 0);
 * 
 * // Right.
 * // Tint with RGBA values.
 * tint(255, 0, 0, 100);
 * image(img, 50, 0);
 * 
 * describe('Two images of an umbrella and a ceiling side-by-side. The image on the right has a transparent red tint.');
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
 * img = await loadImage('assets/laDefense.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Left.
 * image(img, 0, 0);
 * 
 * // Right.
 * // Tint with grayscale and alpha values.
 * tint(255, 180);
 * image(img, 50, 0);
 * 
 * describe('Two images of an umbrella and a ceiling side-by-side. The image on the right is transparent.');
 * }
 * </code>
 * </div>
 */
function tint(v1: number, v2: number, v3: number, alpha?: number): void;

/**
 * @param CSS color string.
 */
function tint(value: string): void;

/**
 * @param grayscale value.
 */
function tint(gray: number, alpha?: number): void;

/**
 * @param array containing the red, green, blue &
 * alpha components of the color.
 */
function tint(values: number[]): void;

/**
 * @param the tint color
 */
function tint(color: p5.Color): void;

/**
 * Removes the current tint set by tint().`noTint()` restores images to their original colors.
 *
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/laDefense.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Left.
 * // Tint with a CSS color string.
 * tint('red');
 * image(img, 0, 0);
 * 
 * // Right.
 * // Remove the tint.
 * noTint();
 * image(img, 50, 0);
 * 
 * describe('Two images of an umbrella and a ceiling side-by-side. The image on the left has a red tint.');
 * }
 * </code>
 * </div>
 */
function noTint(): void;

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
 * @param either CORNER, CORNERS, or CENTER.
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
 * background(200);
 * 
 * // Use CORNER mode.
 * imageMode(CORNER);
 * 
 * // Display the image.
 * image(img, 10, 10, 50, 50);
 * 
 * describe('A square image of a brick wall is drawn at the top left of a gray square.');
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
 * background(200);
 * 
 * // Use CORNERS mode.
 * imageMode(CORNERS);
 * 
 * // Display the image.
 * image(img, 10, 10, 90, 40);
 * 
 * describe('An image of a brick wall is drawn on a gray square. The image is squeezed into a small rectangular area.');
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
 * background(200);
 * 
 * // Use CENTER mode.
 * imageMode(CENTER);
 * 
 * // Display the image.
 * image(img, 50, 50, 80, 80);
 * 
 * describe('A square image of a brick wall is drawn on a gray square.');
 * }
 * </code>
 * </div>
 */
function imageMode(mode: CORNER | CORNERS | CENTER): void;

}

export default function loading_displaying(p5: any, fn: any): void;
