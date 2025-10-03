// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
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
 * @param width in pixels.
 * @param height in pixels.
 * @return new <a href="#/p5.Image">p5.Image</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels into memory.
 * img.loadPixels();
 * 
 * // Set all the image's pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image's pixel values.
 * img.updatePixels();
 * 
 * // Draw the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels into memory.
 * img.loadPixels();
 * 
 * // Create a color gradient.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * // Calculate the transparency.
 * let a = map(x, 0, img.width, 0, 255);
 * 
 * // Create a p5.Color object.
 * let c = color(0, a);
 * 
 * // Set the pixel's color.
 * img.set(x, y, c);
 * }
 * }
 * 
 * // Update the image's pixels.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A square with a horizontal color gradient that transitions from gray to black.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the pixels into memory.
 * img.loadPixels();
 * // Get the current pixel density.
 * let d = pixelDensity();
 * 
 * // Calculate the pixel that is halfway through the image's pixel array.
 * let halfImage = 4 * (d * img.width) * (d * img.height / 2);
 * 
 * // Set half of the image's pixels to black.
 * for (let i = 0; i < halfImage; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image's pixels.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function createImage(width: number, height: number): p5.Image;

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
 * @param reference to a
 * specific HTML5 canvas element.
 * @param file name. Defaults to 'untitled'.
 * @param file extension, either 'png', 'webp', or 'jpg'. Defaults to 'png'.
 * @example <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(255);
 * 
 * // Save the canvas to 'untitled.png'.
 * saveCanvas();
 * 
 * describe('A white square.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(255);
 * 
 * // Save the canvas to 'myCanvas.jpg'.
 * saveCanvas('myCanvas.jpg');
 * 
 * describe('A white square.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(255);
 * 
 * // Save the canvas to 'myCanvas.jpg'.
 * saveCanvas('myCanvas', 'jpg');
 * 
 * describe('A white square.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * let cnv = createCanvas(100, 100);
 * 
 * background(255);
 * 
 * // Save the canvas to 'untitled.png'.
 * saveCanvas(cnv);
 * 
 * describe('A white square.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * let cnv = createCanvas(100, 100);
 * 
 * background(255);
 * 
 * // Save the canvas to 'myCanvas.jpg'.
 * saveCanvas(cnv, 'myCanvas.jpg');
 * 
 * describe('A white square.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * let cnv = createCanvas(100, 100);
 * 
 * background(255);
 * 
 * // Save the canvas to 'myCanvas.jpg'.
 * saveCanvas(cnv, 'myCanvas', 'jpg');
 * 
 * describe('A white square.');
 * }
 * </code>
 * </div>
 */
function saveCanvas(selectedCanvas: p5.Framebuffer | p5.Element | HTMLCanvasElement, filename?: string, extension?: string): void;

/**
 */
function saveCanvas(filename?: string, extension?: string): void;

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
 * @param prefix of file name.
 * @param file extension, either 'jpg' or 'png'.
 * @param duration in seconds to record. This parameter will be constrained to be less or equal to 15.
 * @param number of frames to save per second. This parameter will be constrained to be less or equal to 22.
 * @param callback function that will be executed
 * to handle the image data. This function
 * should accept an array as argument. The
 * array will contain the specified number of
 * frames of objects. Each object has three
 * properties: `imageData`, `filename`, and `extension`.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A square repeatedly changes color from blue to pink.');
 * }
 * 
 * function draw() {
 * let r = frameCount % 255;
 * let g = 50;
 * let b = 100;
 * background(r, g, b);
 * }
 * 
 * // Save the frames when the user presses the 's' key.
 * function keyPressed() {
 * if (key === 's') {
 * saveFrames('frame', 'png', 1, 5);
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
 * describe('A square repeatedly changes color from blue to pink.');
 * }
 * 
 * function draw() {
 * let r = frameCount % 255;
 * let g = 50;
 * let b = 100;
 * background(r, g, b);
 * }
 * 
 * // Print 5 frames when the user presses the mouse.
 * function mousePressed() {
 * saveFrames('frame', 'png', 1, 5, printFrames);
 * }
 * 
 * // Prints an array of objects containing raw image data, filenames, and extensions.
 * function printFrames(frames) {
 * for (let frame of frames) {
 * print(frame);
 * }
 * }
 * </code>
 * </div>
 */
function saveFrames(filename: string, extension: string, duration: number, framerate: number, callback?: any): void;

}

export default function image(p5: any, fn: any): void;
