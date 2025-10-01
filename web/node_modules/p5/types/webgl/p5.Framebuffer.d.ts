// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class Framebuffer {
    constructor(target: p5.Graphics | p5, settings?: object);

  /**
   * Resizes the framebuffer to a given width and height.The parameters, `width` and `height`, set the dimensions of the
   * framebuffer. For example, calling `myBuffer.resize(300, 500)` resizes
   * the framebuffer to 300×500 pixels, then sets `myBuffer.width` to 300
   * and `myBuffer.height` 500.
 *
   * @param
   * @param
   */
  resize(width: number, height: number): void;

  /**
   * Sets the framebuffer's pixel density or returns its current density.Computer displays are grids of little lights called pixels. A display's
   * pixel density describes how many pixels it packs into an area. Displays
   * with smaller pixels have a higher pixel density and create sharper
   * images.The parameter, `density`, is optional. If a number is passed, as in
   * `myBuffer.pixelDensity(1)`, it sets the framebuffer's pixel density. By
   * default, the framebuffer's pixel density will match that of the canvas
   * where it was created. All canvases default to match the display's pixel
   * density.Calling `myBuffer.pixelDensity()` without an argument returns its current
   * pixel density.
 *
   * @param
   */
  pixelDensity(density: number): number;

  /**
   * Toggles the framebuffer's autosizing mode or returns the current mode.By default, the framebuffer automatically resizes to match the canvas
   * that created it. Calling `myBuffer.autoSized(false)` disables this
   * behavior and calling `myBuffer.autoSized(true)` re-enables it.Calling `myBuffer.autoSized()` without an argument returns `true` if
   * the framebuffer automatically resizes and `false` if not.
 *
   * @param
   */
  autoSized(autoSized: boolean): boolean;

  /**
   * Creates a new
   * p5.Camera object to use with the framebuffer.The new camera is initialized with a default position `(0, 0, 800)` and a
   * default perspective projection. Its properties can be controlled with
   * p5.Camera methods such as `myCamera.lookAt(0, 0, 0)`.Framebuffer cameras should be created between calls to
   * myBuffer.begin() and
   * myBuffer.end() like so:`let myCamera;
   * 
   * myBuffer.begin();
   * 
   * // Create the camera for the framebuffer.
   * myCamera = myBuffer.createCamera();
   * 
   * myBuffer.end();`Calling setCamera() updates the
   * framebuffer's projection using the camera.
   * resetMatrix() must also be called for the
   * view to change properly:`myBuffer.begin();
   * 
   * // Set the camera for the framebuffer.
   * setCamera(myCamera);
   * 
   * // Reset all transformations.
   * resetMatrix();
   * 
   * // Draw stuff...
   * 
   * myBuffer.end();`
   */
  createCamera(): p5.Camera;

  /**
   * Deletes the framebuffer from GPU memory.Calling `myBuffer.remove()` frees the GPU memory used by the framebuffer.
   * The framebuffer also uses a bit of memory on the CPU which can be freed
   * like so:`// Delete the framebuffer from GPU memory.
   * myBuffer.remove();
   * 
   * // Delete the framebuffer from CPU memory.
   * myBuffer = undefined;`Note: All variables that reference the framebuffer must be assigned
   * the value `undefined` to delete the framebuffer from CPU memory. If any
   * variable still refers to the framebuffer, then it won't be garbage
   * collected.
   */
  remove(): void;

  /**
   * Begins drawing shapes to the framebuffer.`myBuffer.begin()` and myBuffer.end()
   * allow shapes to be drawn to the framebuffer. `myBuffer.begin()` begins
   * drawing to the framebuffer and
   * myBuffer.end() stops drawing to the
   * framebuffer. Changes won't be visible until the framebuffer is displayed
   * as an image or texture.
   */
  begin(): void;

  /**
   * Stops drawing shapes to the framebuffer.myBuffer.begin() and `myBuffer.end()`
   * allow shapes to be drawn to the framebuffer.
   * myBuffer.begin() begins drawing to
   * the framebuffer and `myBuffer.end()` stops drawing to the framebuffer.
   * Changes won't be visible until the framebuffer is displayed as an image
   * or texture.
   */
  end(): void;

  /**
   * Draws to the framebuffer by calling a function that contains drawing
   * instructions.The parameter, `callback`, is a function with the drawing instructions
   * for the framebuffer. For example, calling `myBuffer.draw(myFunction)`
   * will call a function named `myFunction()` to draw to the framebuffer.
   * Doing so has the same effect as the following:`myBuffer.begin();
   * myFunction();
   * myBuffer.end();`
 *
   * @param
   */
  draw(callback: Function): void;

  /**
   * Gets a pixel or a region of pixels from the framebuffer.`myBuffer.get()` is easy to use but it's not as fast as
   * myBuffer.pixels. Use
   * myBuffer.pixels to read many pixel
   * values.The version of `myBuffer.get()` with no parameters returns the entire
   * framebuffer as a a p5.Image object.The version of `myBuffer.get()` with two parameters interprets them as
   * coordinates. It returns an array with the `[R, G, B, A]` values of the
   * pixel at the given point.The version of `myBuffer.get()` with four parameters interprets them as
   * coordinates and dimensions. It returns a subsection of the framebuffer as
   * a p5.Image object. The first two parameters are
   * the coordinates for the upper-left corner of the subsection. The last two
   * parameters are the width and height of the subsection.
 *
   * @param
   * @param
   * @param
   * @param
   */
  get(x: number, y: number, w: number, h: number): p5.Image;

  get(x: any, y: any, w: any, h: any): p5.Image;

  get(x: number, y: number, w: any, h: any): number[];

  }

/**
 * Loads the current value of each pixel in the framebuffer into its
 * pixels array.`myBuffer.loadPixels()` must be called before reading from or writing to
 * myBuffer.pixels.
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Create a p5.Framebuffer object.
 * let myBuffer = createFramebuffer();
 * 
 * // Load the pixels array.
 * myBuffer.loadPixels();
 * 
 * // Get the number of pixels in the
 * // top half of the framebuffer.
 * let numPixels = myBuffer.pixels.length / 2;
 * 
 * // Set the framebuffer's top half to pink.
 * for (let i = 0; i < numPixels; i += 4) {
 * myBuffer.pixels[i] = 255;
 * myBuffer.pixels[i + 1] = 102;
 * myBuffer.pixels[i + 2] = 204;
 * myBuffer.pixels[i + 3] = 255;
 * }
 * 
 * // Update the pixels array.
 * myBuffer.updatePixels();
 * 
 * // Draw the p5.Framebuffer object to the canvas.
 * image(myBuffer, -50, -50);
 * 
 * describe('A pink rectangle above a gray rectangle.');
 * }
 * </code>
 * </div>
 */
function loadPixels(): void;

/**
 * Updates the framebuffer with the RGBA values in the
 * pixels array.`myBuffer.updatePixels()` only needs to be called after changing values
 * in the myBuffer.pixels array. Such
 * changes can be made directly after calling
 * myBuffer.loadPixels().
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Create a p5.Framebuffer object.
 * let myBuffer = createFramebuffer();
 * 
 * // Load the pixels array.
 * myBuffer.loadPixels();
 * 
 * // Get the number of pixels in the
 * // top half of the framebuffer.
 * let numPixels = myBuffer.pixels.length / 2;
 * 
 * // Set the framebuffer's top half to pink.
 * for (let i = 0; i < numPixels; i += 4) {
 * myBuffer.pixels[i] = 255;
 * myBuffer.pixels[i + 1] = 102;
 * myBuffer.pixels[i + 2] = 204;
 * myBuffer.pixels[i + 3] = 255;
 * }
 * 
 * // Update the pixels array.
 * myBuffer.updatePixels();
 * 
 * // Draw the p5.Framebuffer object to the canvas.
 * image(myBuffer, -50, -50);
 * 
 * describe('A pink rectangle above a gray rectangle.');
 * }
 * </code>
 * </div>
 */
function updatePixels(): void;

/**
 * Resizes the framebuffer to a given width and height.The parameters, `width` and `height`, set the dimensions of the
 * framebuffer. For example, calling `myBuffer.resize(300, 500)` resizes
 * the framebuffer to 300×500 pixels, then sets `myBuffer.width` to 300
 * and `myBuffer.height` 500.
 *
 * @param width of the framebuffer.
 * @param height of the framebuffer.
 * @example <div>
 * <code>
 * let myBuffer;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Framebuffer object.
 * myBuffer = createFramebuffer();
 * 
 * describe('A multicolor sphere on a white surface. The image grows larger or smaller when the user moves the mouse, revealing a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw to the p5.Framebuffer object.
 * myBuffer.begin();
 * background(255);
 * normalMaterial();
 * sphere(20);
 * myBuffer.end();
 * 
 * // Display the p5.Framebuffer object.
 * image(myBuffer, -50, -50);
 * }
 * 
 * // Resize the p5.Framebuffer object when the
 * // user moves the mouse.
 * function mouseMoved() {
 * myBuffer.resize(mouseX, mouseY);
 * }
 * </code>
 * </div>
 */
function resize(width: number, height: number): void;

/**
 * Sets the framebuffer's pixel density or returns its current density.Computer displays are grids of little lights called pixels. A display's
 * pixel density describes how many pixels it packs into an area. Displays
 * with smaller pixels have a higher pixel density and create sharper
 * images.The parameter, `density`, is optional. If a number is passed, as in
 * `myBuffer.pixelDensity(1)`, it sets the framebuffer's pixel density. By
 * default, the framebuffer's pixel density will match that of the canvas
 * where it was created. All canvases default to match the display's pixel
 * density.Calling `myBuffer.pixelDensity()` without an argument returns its current
 * pixel density.
 *
 * @param pixel density to set.
 * @returns current pixel density.
 * @example <div>
 * <code>
 * let myBuffer;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Framebuffer object.
 * myBuffer = createFramebuffer();
 * 
 * describe("A white circle on a gray canvas. The circle's edge become fuzzy while the user presses and holds the mouse.");
 * }
 * 
 * function draw() {
 * // Draw to the p5.Framebuffer object.
 * myBuffer.begin();
 * background(200);
 * circle(0, 0, 40);
 * myBuffer.end();
 * 
 * // Display the p5.Framebuffer object.
 * image(myBuffer, -50, -50);
 * }
 * 
 * // Decrease the pixel density when the user
 * // presses the mouse.
 * function mousePressed() {
 * myBuffer.pixelDensity(1);
 * }
 * 
 * // Increase the pixel density when the user
 * // releases the mouse.
 * function mouseReleased() {
 * myBuffer.pixelDensity(2);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myBuffer;
 * let myFont;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * myFont = await loadFont('assets/inconsolata.otf');
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Create a p5.Framebuffer object.
 * myBuffer = createFramebuffer();
 * 
 * // Get the p5.Framebuffer object's pixel density.
 * let d = myBuffer.pixelDensity();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont(myFont);
 * textSize(16);
 * fill(0);
 * 
 * // Display the pixel density.
 * text(`Density: ${d}`, 0, 0);
 * 
 * describe(`The text "Density: ${d}" written in black on a gray background.`);
 * }
 * </code>
 * </div>
 */
function pixelDensity(density?: number): number;

/**
 * Toggles the framebuffer's autosizing mode or returns the current mode.By default, the framebuffer automatically resizes to match the canvas
 * that created it. Calling `myBuffer.autoSized(false)` disables this
 * behavior and calling `myBuffer.autoSized(true)` re-enables it.Calling `myBuffer.autoSized()` without an argument returns `true` if
 * the framebuffer automatically resizes and `false` if not.
 *
 * @param whether to automatically resize the framebuffer to match the canvas.
 * @returns current autosize setting.
 * @example <div>
 * <code>
 * // Double-click to toggle the autosizing mode.
 * 
 * let myBuffer;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Framebuffer object.
 * myBuffer = createFramebuffer();
 * 
 * describe('A multicolor sphere on a gray background. The image resizes when the user moves the mouse.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Draw to the p5.Framebuffer object.
 * myBuffer.begin();
 * background(200);
 * normalMaterial();
 * sphere(width / 4);
 * myBuffer.end();
 * 
 * // Display the p5.Framebuffer object.
 * image(myBuffer, -width / 2, -height / 2);
 * }
 * 
 * // Resize the canvas when the user moves the mouse.
 * function mouseMoved() {
 * let w = constrain(mouseX, 0, 100);
 * let h = constrain(mouseY, 0, 100);
 * resizeCanvas(w, h);
 * }
 * 
 * // Toggle autoSizing when the user double-clicks.
 * // Note: opened an issue to fix(?) this.
 * function doubleClicked() {
 * let isAuto = myBuffer.autoSized();
 * myBuffer.autoSized(!isAuto);
 * }
 * </code>
 * </div>
 */
function autoSized(autoSized?: boolean): boolean;

/**
 * Creates a new
 * p5.Camera object to use with the framebuffer.The new camera is initialized with a default position `(0, 0, 800)` and a
 * default perspective projection. Its properties can be controlled with
 * p5.Camera methods such as `myCamera.lookAt(0, 0, 0)`.Framebuffer cameras should be created between calls to
 * myBuffer.begin() and
 * myBuffer.end() like so:`let myCamera;
 * 
 * myBuffer.begin();
 * 
 * // Create the camera for the framebuffer.
 * myCamera = myBuffer.createCamera();
 * 
 * myBuffer.end();`Calling setCamera() updates the
 * framebuffer's projection using the camera.
 * resetMatrix() must also be called for the
 * view to change properly:`myBuffer.begin();
 * 
 * // Set the camera for the framebuffer.
 * setCamera(myCamera);
 * 
 * // Reset all transformations.
 * resetMatrix();
 * 
 * // Draw stuff...
 * 
 * myBuffer.end();`
 *
 * @returns new camera.
 * @example <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let myBuffer;
 * let cam1;
 * let cam2;
 * let usingCam1 = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Framebuffer object.
 * myBuffer = createFramebuffer();
 * 
 * // Create the cameras between begin() and end().
 * myBuffer.begin();
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = myBuffer.createCamera();
 * 
 * // Create the second camera.
 * // Place it at the top-left.
 * // Point it at the origin.
 * cam2 = myBuffer.createCamera();
 * cam2.setPosition(400, -400, 800);
 * cam2.lookAt(0, 0, 0);
 * 
 * myBuffer.end();
 * 
 * describe(
 * 'A white cube on a gray background. The camera toggles between frontal and aerial views when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * // Draw to the p5.Framebuffer object.
 * myBuffer.begin();
 * background(200);
 * 
 * // Set the camera.
 * if (usingCam1 === true) {
 * setCamera(cam1);
 * } else {
 * setCamera(cam2);
 * }
 * 
 * // Reset all transformations.
 * resetMatrix();
 * 
 * // Draw the box.
 * box();
 * 
 * myBuffer.end();
 * 
 * // Display the p5.Framebuffer object.
 * image(myBuffer, -50, -50);
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (usingCam1 === true) {
 * usingCam1 = false;
 * } else {
 * usingCam1 = true;
 * }
 * }
 * </code>
 * </div>
 */
function createCamera(): p5.Camera;

/**
 * Deletes the framebuffer from GPU memory.Calling `myBuffer.remove()` frees the GPU memory used by the framebuffer.
 * The framebuffer also uses a bit of memory on the CPU which can be freed
 * like so:`// Delete the framebuffer from GPU memory.
 * myBuffer.remove();
 * 
 * // Delete the framebuffer from CPU memory.
 * myBuffer = undefined;`Note: All variables that reference the framebuffer must be assigned
 * the value `undefined` to delete the framebuffer from CPU memory. If any
 * variable still refers to the framebuffer, then it won't be garbage
 * collected.
 *
 * @example <div>
 * <code>
 * // Double-click to remove the p5.Framebuffer object.
 * 
 * let myBuffer;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create an options object.
 * let options = { width: 60, height: 60 };
 * 
 * // Create a p5.Framebuffer object and
 * // configure it using options.
 * myBuffer = createFramebuffer(options);
 * 
 * describe('A white circle at the center of a dark gray square disappears when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Display the p5.Framebuffer object if
 * // it's available.
 * if (myBuffer) {
 * // Draw to the p5.Framebuffer object.
 * myBuffer.begin();
 * background(100);
 * circle(0, 0, 20);
 * myBuffer.end();
 * 
 * image(myBuffer, -30, -30);
 * }
 * }
 * 
 * // Remove the p5.Framebuffer object when the
 * // the user double-clicks.
 * function doubleClicked() {
 * // Delete the framebuffer from GPU memory.
 * myBuffer.remove();
 * 
 * // Delete the framebuffer from CPU memory.
 * myBuffer = undefined;
 * }
 * </code>
 * </div>
 */
function remove(): void;

/**
 * Begins drawing shapes to the framebuffer.`myBuffer.begin()` and myBuffer.end()
 * allow shapes to be drawn to the framebuffer. `myBuffer.begin()` begins
 * drawing to the framebuffer and
 * myBuffer.end() stops drawing to the
 * framebuffer. Changes won't be visible until the framebuffer is displayed
 * as an image or texture.
 *
 * @example <div>
 * <code>
 * let myBuffer;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Framebuffer object.
 * myBuffer = createFramebuffer();
 * 
 * describe('An empty gray canvas. The canvas gets darker and a rotating, multicolor torus appears while the user presses and holds the mouse.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Start drawing to the p5.Framebuffer object.
 * myBuffer.begin();
 * 
 * background(50);
 * rotateY(frameCount * 0.01);
 * normalMaterial();
 * torus(30);
 * 
 * // Stop drawing to the p5.Framebuffer object.
 * myBuffer.end();
 * 
 * // Display the p5.Framebuffer object while
 * // the user presses the mouse.
 * if (mouseIsPressed === true) {
 * image(myBuffer, -50, -50);
 * }
 * }
 * </code>
 * </div>
 */
function begin(): void;

/**
 * Stops drawing shapes to the framebuffer.myBuffer.begin() and `myBuffer.end()`
 * allow shapes to be drawn to the framebuffer.
 * myBuffer.begin() begins drawing to
 * the framebuffer and `myBuffer.end()` stops drawing to the framebuffer.
 * Changes won't be visible until the framebuffer is displayed as an image
 * or texture.
 *
 * @example <div>
 * <code>
 * let myBuffer;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Framebuffer object.
 * myBuffer = createFramebuffer();
 * 
 * describe('An empty gray canvas. The canvas gets darker and a rotating, multicolor torus appears while the user presses and holds the mouse.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Start drawing to the p5.Framebuffer object.
 * myBuffer.begin();
 * 
 * background(50);
 * rotateY(frameCount * 0.01);
 * normalMaterial();
 * torus(30);
 * 
 * // Stop drawing to the p5.Framebuffer object.
 * myBuffer.end();
 * 
 * // Display the p5.Framebuffer object while
 * // the user presses the mouse.
 * if (mouseIsPressed === true) {
 * image(myBuffer, -50, -50);
 * }
 * }
 * </code>
 * </div>
 */
function end(): void;

/**
 * Draws to the framebuffer by calling a function that contains drawing
 * instructions.The parameter, `callback`, is a function with the drawing instructions
 * for the framebuffer. For example, calling `myBuffer.draw(myFunction)`
 * will call a function named `myFunction()` to draw to the framebuffer.
 * Doing so has the same effect as the following:`myBuffer.begin();
 * myFunction();
 * myBuffer.end();`
 *
 * @param function that draws to the framebuffer.
 * @example <div>
 * <code>
 * // Click the canvas to display the framebuffer.
 * 
 * let myBuffer;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Framebuffer object.
 * myBuffer = createFramebuffer();
 * 
 * describe('An empty gray canvas. The canvas gets darker and a rotating, multicolor torus appears while the user presses and holds the mouse.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw to the p5.Framebuffer object.
 * myBuffer.draw(bagel);
 * 
 * // Display the p5.Framebuffer object while
 * // the user presses the mouse.
 * if (mouseIsPressed === true) {
 * image(myBuffer, -50, -50);
 * }
 * }
 * 
 * // Draw a rotating, multicolor torus.
 * function bagel() {
 * background(50);
 * rotateY(frameCount * 0.01);
 * normalMaterial();
 * torus(30);
 * }
 * </code>
 * </div>
 */
function draw(callback: Function): void;

/**
 * Gets a pixel or a region of pixels from the framebuffer.`myBuffer.get()` is easy to use but it's not as fast as
 * myBuffer.pixels. Use
 * myBuffer.pixels to read many pixel
 * values.The version of `myBuffer.get()` with no parameters returns the entire
 * framebuffer as a a p5.Image object.The version of `myBuffer.get()` with two parameters interprets them as
 * coordinates. It returns an array with the `[R, G, B, A]` values of the
 * pixel at the given point.The version of `myBuffer.get()` with four parameters interprets them as
 * coordinates and dimensions. It returns a subsection of the framebuffer as
 * a p5.Image object. The first two parameters are
 * the coordinates for the upper-left corner of the subsection. The last two
 * parameters are the width and height of the subsection.
 *
 * @param x-coordinate of the pixel. Defaults to 0.
 * @param y-coordinate of the pixel. Defaults to 0.
 * @param width of the subsection to be returned.
 * @param height of the subsection to be returned.
 * @return subsection as a <a href="#/p5.Image">p5.Image</a> object.
 */
function get(x: number, y: number, w: number, h: number): p5.Image;

/**
 * @return entire framebuffer as a <a href="#/p5.Image">p5.Image</a> object.
 */
function get(x: any, y: any, w: any, h: any): p5.Image;

/**
 * @return color of the pixel at `(x, y)` as an array of color values `[R, G, B, A]`.
 */
function get(x: number, y: number, w: any, h: any): number[];

}

export default function p5_Framebuffer(p5: any, fn: any): void;
