// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Displays text in the web browser's console.`print()` is helpful for printing values while debugging. Each call to
 * `print()` creates a new line of text.Note: Call `print('\n')` to print a blank line. Calling `print()` without
 * an argument opens the browser's dialog for printing documents.
 *
 * @param content to print to the console.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Prints "hello, world" to the console.
 * print('hello, world');
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * let name = 'ada';
 * // Prints "hello, ada" to the console.
 * print(`hello, ${name}`);
 * }
 * </code>
 * </div>
 */
function print(contents: Any): void;

/**
 * Called upon each p5 instantiation instead of module import due to the
 * possibility of the window being resized when no sketch is active.
 *
 */
function _updateWindowSize(): void;

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
 * @param Built-in: either ARROW, CROSS, HAND, MOVE, TEXT, or WAIT.
 * Native CSS properties: 'grab', 'progress', and so on.
 * Path to cursor image.
 * @param horizontal active spot of the cursor.
 * @param vertical active spot of the cursor.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A gray square. The cursor appears as crosshairs.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Set the cursor to crosshairs: +
 * cursor(CROSS);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A gray square divided into quadrants. The cursor image changes when the mouse moves to each quadrant.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Divide the canvas into quadrants.
 * line(50, 0, 50, 100);
 * line(0, 50, 100, 50);
 * 
 * // Change cursor based on mouse position.
 * if (mouseX < 50 && mouseY < 50) {
 * cursor(CROSS);
 * } else if (mouseX > 50 && mouseY < 50) {
 * cursor('progress');
 * } else if (mouseX > 50 && mouseY > 50) {
 * cursor('https://avatars0.githubusercontent.com/u/1617169?s=16');
 * } else {
 * cursor('grab');
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
 * describe('An image of three purple curves follows the mouse. The image shifts when the mouse is pressed.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Change the cursor's active spot
 * // when the mouse is pressed.
 * if (mouseIsPressed === true) {
 * cursor('https://avatars0.githubusercontent.com/u/1617169?s=16', 8, 8);
 * } else {
 * cursor('https://avatars0.githubusercontent.com/u/1617169?s=16');
 * }
 * }
 * </code>
 * </div>
 */
function cursor(type: ARROW | CROSS | HAND | MOVE | TEXT | WAIT | string, x?: number, y?: number): void;

/**
 * Sets the number of frames to draw per second.Calling `frameRate()` with one numeric argument, as in `frameRate(30)`,
 * attempts to draw 30 frames per second (FPS). The target frame rate may not
 * be achieved depending on the sketch's processing needs. Most computers
 * default to a frame rate of 60 FPS. Frame rates of 24 FPS and above are
 * fast enough for smooth animations.Calling `frameRate()` without an argument returns the current frame rate.
 * The value returned is an approximation.
 *
 * @param number of frames to draw per second.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A white circle on a gray background. The circle moves from left to right in a loop. It slows down when the mouse is pressed.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Set the x variable based
 * // on the current frameCount.
 * let x = frameCount % 100;
 * 
 * // If the mouse is pressed,
 * // decrease the frame rate.
 * if (mouseIsPressed === true) {
 * frameRate(10);
 * } else {
 * frameRate(60);
 * }
 * 
 * // Use x to set the circle's
 * // position.
 * circle(x, 50, 20);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A number written in black on a gray background. The number decreases when the mouse is pressed.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // If the mouse is pressed, do lots
 * // of math to slow down drawing.
 * if (mouseIsPressed === true) {
 * for (let i = 0; i < 1000000; i += 1) {
 * random();
 * }
 * }
 * 
 * // Get the current frame rate
 * // and display it.
 * let fps = frameRate();
 * text(fps, 50, 50);
 * }
 * </code>
 * </div>
 */
function frameRate(fps: number): void;

/**
 * @return current frame rate.
 */
function frameRate(): number;

/**
 * Returns the target frame rate.The value is either the system frame rate or the last value passed to
 * frameRate().
 *
 * @return _targetFrameRate
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('The number 20 written in black on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Set the frame rate to 20.
 * frameRate(20);
 * 
 * // Get the target frame rate and
 * // display it.
 * let fps = getTargetFrameRate();
 * text(fps, 43, 54);
 * }
 * </code>
 * </div>
 */
function getTargetFrameRate(): number;

/**
 * Hides the cursor from view.
 *
 * @example <div>
 * <code>
 * function setup() {
 * // Hide the cursor.
 * noCursor();
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * circle(mouseX, mouseY, 10);
 * 
 * describe('A white circle on a gray background. The circle follows the mouse as it moves. The cursor is hidden.');
 * }
 * </code>
 * </div>
 */
function noCursor(): void;

/**
 * A function that's called when the browser window is resized.Code placed in the body of `windowResized()` will run when the
 * browser window's size changes. It's a good place to call
 * resizeCanvas() or make other
 * adjustments to accommodate the new window size.The `event` parameter is optional. If added to the function declaration, it
 * can be used for debugging or other purposes.
 *
 * @param optional resize Event.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * createCanvas(windowWidth, windowHeight);
 * 
 * describe('A gray canvas with a white circle at its center. The canvas takes up the entire browser window. It changes size to match the browser window.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw a circle at the center.
 * circle(width / 2, height / 2, 50);
 * }
 * 
 * // Resize the canvas when the
 * // browser's size changes.
 * function windowResized() {
 * resizeCanvas(windowWidth, windowHeight);
 * }
 * </code>
 * </div>
 * @alt This example does not render anything.
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * createCanvas(windowWidth, windowHeight);
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * describe('A gray canvas that takes up the entire browser window. It changes size to match the browser window.');
 * }
 * 
 * function windowResized(event) {
 * // Resize the canvas when the
 * // browser's size changes.
 * resizeCanvas(windowWidth, windowHeight);
 * 
 * // Print the resize event to the console for debugging.
 * print(event);
 * }
 * </code>
 * </div>
 * @alt This example does not render anything.
 */
function windowResized(event?: UIEvent): void;

/**
 * Toggles full-screen mode or returns the current mode.Calling `fullscreen(true)` makes the sketch full-screen. Calling
 * `fullscreen(false)` makes the sketch its original size.Calling `fullscreen()` without an argument returns `true` if the sketch
 * is in full-screen mode and `false` if not.Note: Due to browser restrictions, `fullscreen()` can only be called with
 * user input such as a mouse press.
 *
 * @param whether the sketch should be in fullscreen mode.
 * @return current fullscreen state.
 * @example <div>
 * <code>
 * function setup() {
 * background(200);
 * 
 * describe('A gray canvas that switches between default and full-screen display when clicked.');
 * }
 * 
 * // If the mouse is pressed,
 * // toggle full-screen mode.
 * function mousePressed() {
 * if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
 * let fs = fullscreen();
 * fullscreen(!fs);
 * }
 * }
 * </code>
 * </div>
 */
function fullscreen(val?: boolean): boolean;

/**
 * Sets the pixel density or returns the current density.Computer displays are grids of little lights called pixels. A
 * display's pixel density describes how many pixels it packs into an
 * area. Displays with smaller pixels have a higher pixel density and create
 * sharper images.`pixelDensity()` sets the pixel scaling for high pixel density displays.
 * By default, the pixel density is set to match the display's density.
 * Calling `pixelDensity(1)` turn this off.Calling `pixelDensity()` without an argument returns the current pixel
 * density.
 *
 * @param desired pixel density.
 * @example <div>
 * <code>
 * function setup() {
 * // Set the pixel density to 1.
 * pixelDensity(1);
 * 
 * // Create a canvas and draw
 * // a circle.
 * createCanvas(100, 100);
 * background(200);
 * circle(50, 50, 70);
 * 
 * describe('A fuzzy white circle on a gray canvas.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * // Set the pixel density to 3.
 * pixelDensity(3);
 * 
 * // Create a canvas, paint the
 * // background, and draw a
 * // circle.
 * createCanvas(100, 100);
 * background(200);
 * circle(50, 50, 70);
 * 
 * describe('A sharp white circle on a gray canvas.');
 * }
 * </code>
 * </div>
 */
function pixelDensity(val?: number): void;

/**
 * @returns current pixel density of the sketch.
 */
function pixelDensity(): number;

/**
 * Returns the display's current pixel density.
 *
 * @returns current pixel density of the display.
 * @example <div>
 * <code>
 * function setup() {
 * // Set the pixel density to 1.
 * pixelDensity(1);
 * 
 * // Create a canvas and draw
 * // a circle.
 * createCanvas(100, 100);
 * background(200);
 * circle(50, 50, 70);
 * 
 * describe('A fuzzy white circle drawn on a gray background. The circle becomes sharper when the mouse is pressed.');
 * }
 * 
 * function mousePressed() {
 * // Get the current display density.
 * let d = displayDensity();
 * 
 * // Use the display density to set
 * // the sketch's pixel density.
 * pixelDensity(d);
 * 
 * // Paint the background and
 * // draw a circle.
 * background(200);
 * circle(50, 50, 70);
 * }
 * </code>
 * </div>
 */
function displayDensity(): number;

/**
 * Returns the sketch's current
 * URL
 * as a `String`.
 *
 * @return url
 * @example <div>
 * <code>
 * function setup() {
 * background(200);
 * 
 * // Get the sketch's URL
 * // and display it.
 * let url = getURL();
 * textWrap(CHAR);
 * text(url, 0, 40, 100);
 * 
 * describe('The URL "https://p5js.org/reference/p5/getURL" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function getURL(): string;

/**
 * Returns the current
 * URL
 * path as an `Array` of `String`s.For example, consider a sketch hosted at the URL
 * `https://example.com/sketchbook`. Calling `getURLPath()` returns
 * `['sketchbook']`. For a sketch hosted at the URL
 * `https://example.com/sketchbook/monday`, `getURLPath()` returns
 * `['sketchbook', 'monday']`.
 *
 * @return path components.
 * @example <div>
 * <code>
 * function setup() {
 * background(200);
 * 
 * // Get the sketch's URL path
 * // and display the first
 * // part.
 * let path = getURLPath();
 * text(path[0], 25, 54);
 * 
 * describe('The word "reference" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function getURLPath(): string[];

/**
 * Returns the current
 * URL parameters
 * in an `Object`.For example, calling `getURLParams()` in a sketch hosted at the URL
 * `https://p5js.org?year=2014&month=May&day=15` returns
 * `{ year: 2014, month: 'May', day: 15 }`.
 *
 * @return URL params
 * @example <div class='norender notest'>
 * <code>
 * // Imagine this sketch is hosted at the following URL:
 * // https://p5js.org?year=2014&month=May&day=15
 * 
 * function setup() {
 * background(200);
 * 
 * // Get the sketch's URL
 * // parameters and display
 * // them.
 * let params = getURLParams();
 * text(params.day, 10, 20);
 * text(params.month, 10, 40);
 * text(params.year, 10, 60);
 * 
 * describe('The text "15", "May", and "2014" written in black on separate lines.');
 * }
 * </code>
 * </div>
 * @alt This example does not render anything.
 */
function getURLParams(): object;

/**
 * Converts 3D world coordinates to 2D screen coordinates.This function takes a 3D vector and converts its coordinates
 * from the world space to screen space. This can be useful for placing
 * 2D elements in a 3D scene or for determining the screen position
 * of 3D objects.
 *
 * @param The x coordinate in world space. (Or a vector for all three coordinates.)
 * @param The y coordinate in world space.
 * @param The z coordinate in world space.
 * @return A vector containing the 2D screen coordinates.
 * @example <div>
 * <code>
 * 
 * function setup() {
 * createCanvas(150, 150);
 * let vertices = [
 * createVector(-20, -20),
 * createVector(20, -20),
 * createVector(20, 20),
 * createVector(-20, 20)
 * ];
 * 
 * push();
 * translate(75, 55);
 * rotate(PI / 4);
 * 
 * // Convert world coordinates to screen coordinates
 * let screenPos = vertices.map(v => worldToScreen(v));
 * pop();
 * 
 * background(200);
 * 
 * stroke(0);
 * fill(100, 150, 255, 100);
 * beginShape();
 * screenPos.forEach(pos => vertex(pos.x, pos.y));
 * endShape(CLOSE);
 * 
 * screenPos.forEach((pos, i) => {
 * fill(0);
 * textSize(10);
 * if (i === 0) {
 * text(i + 1, pos.x + 3, pos.y - 7);
 * } else if (i === 1) {
 * text(i + 1, pos.x + 7, pos.y + 2);
 * } else if (i === 2) {
 * text(i + 1, pos.x - 2, pos.y + 12);
 * } else if (i === 3) {
 * text(i + 1, pos.x - 12, pos.y - 2);
 * }
 * });
 * 
 * fill(0);
 * noStroke();
 * textSize(10);
 * let legendY = height - 35;
 * screenPos.forEach((pos, i) => {
 * text(`Vertex ${i + 1}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`, 5, legendY + i * 10);
 * });
 * 
 * describe('A rotating square is transformed and drawn using screen coordinates.');
 * 
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * let vertices;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * vertices = [
 * createVector(-25, -25, -25),
 * createVector(25, -25, -25),
 * createVector(25, 25, -25),
 * createVector(-25, 25, -25),
 * createVector(-25, -25, 25),
 * createVector(25, -25, 25),
 * createVector(25, 25, 25),
 * createVector(-25, 25, 25)
 * ];
 * 
 * describe('A rotating cube with points mapped to 2D screen space and displayed as ellipses.');
 * 
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Animate rotation
 * let rotationX = millis() / 1000;
 * let rotationY = millis() / 1200;
 * 
 * push();
 * 
 * rotateX(rotationX);
 * rotateY(rotationY);
 * 
 * // Convert world coordinates to screen coordinates
 * let screenPos = vertices.map(v => worldToScreen(v));
 * 
 * pop();
 * 
 * screenPos.forEach((pos, i) => {
 * 
 * let screenX = pos.x - width / 2;
 * let screenY = pos.y - height / 2;
 * fill(0);
 * noStroke();
 * ellipse(screenX, screenY, 3, 3);
 * });
 * }
 * </code>
 * </div>
 */
function worldToScreen(x: number | p5.Vector, y: number, z?: number): p5.Vector;

/**
 * Converts 2D screen coordinates to 3D world coordinates.This function takes a vector and converts its coordinates from coordinates
 * on the screen to coordinates in the currently drawn object. This can be
 * useful for determining the mouse position relative to a 2D or 3D object.If given, the Z component of the input coordinates is treated as "depth",
 * or distance from the camera.
 *
 * @param The x coordinate in screen space. (Or a vector for all three coordinates.)
 * @param The y coordinate in screen space.
 * @param The z coordinate in screen space.
 * @return A vector containing the 3D world space coordinates.
 * @example <div>
 * <code>
 * 
 * function setup() {
 * createCanvas(100, 100);
 * describe('A rotating square with a line passing through the mouse drawn across it.');
 * }
 * 
 * function draw() {
 * background(220);
 * 
 * // Move to center and rotate
 * translate(width/2, height/2);
 * rotate(millis() / 1000);
 * rect(-30, -30, 60);
 * 
 * // Compute the location of the mouse in the coordinates of the square
 * let localMouse = screenToWorld(createVector(mouseX, mouseY));
 * 
 * // Draw a line parallel to the local Y axis, passing through the mouse
 * line(localMouse.x, -30, localMouse.x, 30);
 * }
 * 
 * </code>
 * </div>
 */
function screenToWorld(x: number | p5.Vector, y: number, z?: number): p5.Vector;

}

export default function environment(p5: any, fn: any): void;
