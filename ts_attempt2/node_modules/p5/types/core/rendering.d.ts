// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
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
 * @param width of the canvas. Defaults to 100.
 * @param height of the canvas. Defaults to 100.
 * @param either P2D or WEBGL. Defaults to `P2D`.
 * @param existing canvas element that should be used for the sketch.
 * @return new `p5.Renderer` that holds the canvas.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Draw a diagonal line.
 * line(0, 0, width, height);
 * 
 * describe('A diagonal line drawn from top-left to bottom-right on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 50);
 * 
 * background(200);
 * 
 * // Draw a diagonal line.
 * line(0, 0, width, height);
 * 
 * describe('A diagonal line drawn from top-left to bottom-right on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Use WebGL mode.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Draw a diagonal line.
 * line(-width / 2, -height / 2, width / 2, height / 2);
 * 
 * describe('A diagonal line drawn from top-left to bottom-right on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * // Create a p5.Render object.
 * let cnv = createCanvas(50, 50);
 * 
 * // Position the canvas.
 * cnv.position(10, 20);
 * 
 * background(200);
 * 
 * // Draw a diagonal line.
 * line(0, 0, width, height);
 * 
 * describe('A diagonal line drawn from top-left to bottom-right on a gray background.');
 * }
 * </code>
 * </div>
 */
function createCanvas(width?: number, height?: number, renderer?: P2D | WEBGL | P2DHDR, canvas?: HTMLCanvasElement): p5.Renderer;

/**
 */
function createCanvas(width?: number, height?: number, canvas?: HTMLCanvasElement): p5.Renderer;

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
 * @param width of the canvas.
 * @param height of the canvas.
 * @param whether to delay calling
 * <a href="#/p5/redraw">redraw()</a>. Defaults
 * to `false`.
 * @example <div>
 * <code>
 * // Double-click to resize the canvas.
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A white circle drawn on a gray background. The canvas shrinks by half the first time the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw a circle at the center of the canvas.
 * circle(width / 2, height / 2, 20);
 * }
 * 
 * // Resize the canvas when the user double-clicks.
 * function doubleClicked() {
 * resizeCanvas(50, 50);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Resize the web browser to change the canvas size.
 * 
 * function setup() {
 * createCanvas(windowWidth, windowHeight);
 * 
 * describe('A white circle drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw a circle at the center of the canvas.
 * circle(width / 2, height / 2, 20);
 * }
 * 
 * // Always resize the canvas to fill the browser window.
 * function windowResized() {
 * resizeCanvas(windowWidth, windowHeight);
 * }
 * </code>
 * </div>
 */
function resizeCanvas(width: number, height: number, noRedraw?: boolean): void;

/**
 * Removes the default canvas.By default, a 100×100 pixels canvas is created without needing to call
 * createCanvas(). `noCanvas()` removes the
 * default canvas for sketches that don't need it.
 *
 * @example <div>
 * <code>
 * function setup() {
 * noCanvas();
 * }
 * </code>
 * </div>
 */
function noCanvas(): void;

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
 * @param width of the graphics buffer.
 * @param height of the graphics buffer.
 * @param either P2D or WEBGL. Defaults to P2D.
 * @param existing canvas element that should be
 * used for the graphics buffer..
 * @return new graphics buffer.
 * @example <div>
 * <code>
 * //  Double-click to draw the contents of the graphics buffer.
 * 
 * let pg;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create the p5.Graphics object.
 * pg = createGraphics(50, 50);
 * 
 * // Draw to the graphics buffer.
 * pg.background(100);
 * pg.circle(pg.width / 2, pg.height / 2, 20);
 * 
 * describe('A gray square. A smaller, darker square with a white circle at its center appears when the user double-clicks.');
 * }
 * 
 * // Display the graphics buffer when the user double-clicks.
 * function doubleClicked() {
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * image(pg, 25, 25);
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * //  Double-click to draw the contents of the graphics buffer.
 * 
 * let pg;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create the p5.Graphics object in WebGL mode.
 * pg = createGraphics(50, 50, WEBGL);
 * 
 * // Draw to the graphics buffer.
 * pg.background(100);
 * pg.lights();
 * pg.noStroke();
 * pg.rotateX(QUARTER_PI);
 * pg.rotateY(QUARTER_PI);
 * pg.torus(15, 5);
 * 
 * describe('A gray square. A smaller, darker square with a white torus at its center appears when the user double-clicks.');
 * }
 * 
 * // Display the graphics buffer when the user double-clicks.
 * function doubleClicked() {
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * image(pg, 25, 25);
 * }
 * }
 * </code>
 * </div>
 */
function createGraphics(width: number, height: number, renderer?: P2D | WEBGL, canvas?: HTMLCanvasElement): p5.Graphics;

/**
 */
function createGraphics(width: number, height: number, canvas?: HTMLCanvasElement): p5.Graphics;

/**
 * Creates and a new p5.Framebuffer object.p5.Framebuffer objects are separate drawing
 * surfaces that can be used as textures in WebGL mode. They're similar to
 * p5.Graphics objects and generally run much
 * faster when used as textures.The parameter, `options`, is optional. An object can be passed to configure
 * the p5.Framebuffer object. The available
 * properties are:If the `width`, `height`, or `density` attributes are set, they won't automatically match the main canvas and must be changed manually.Note: `createFramebuffer()` can only be used in WebGL mode.
 *
 * @param configuration options.
 * @return new framebuffer.
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
 * describe('A grid of white toruses rotating against a dark gray background.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Start drawing to the p5.Framebuffer object.
 * myBuffer.begin();
 * 
 * // Clear the drawing surface.
 * clear();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Rotate the coordinate system.
 * rotateX(frameCount * 0.01);
 * rotateY(frameCount * 0.01);
 * 
 * // Style the torus.
 * noStroke();
 * 
 * // Draw the torus.
 * torus(20);
 * 
 * // Stop drawing to the p5.Framebuffer object.
 * myBuffer.end();
 * 
 * // Iterate from left to right.
 * for (let x = -50; x < 50; x += 25) {
 * // Iterate from top to bottom.
 * for (let y = -50; y < 50; y += 25) {
 * // Draw the p5.Framebuffer object to the canvas.
 * image(myBuffer, x, y, 25, 25);
 * }
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myBuffer;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create an options object.
 * let options = { width: 25, height: 25 };
 * 
 * // Create a p5.Framebuffer object.
 * // Use options for configuration.
 * myBuffer = createFramebuffer(options);
 * 
 * describe('A grid of white toruses rotating against a dark gray background.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Start drawing to the p5.Framebuffer object.
 * myBuffer.begin();
 * 
 * // Clear the drawing surface.
 * clear();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Rotate the coordinate system.
 * rotateX(frameCount * 0.01);
 * rotateY(frameCount * 0.01);
 * 
 * // Style the torus.
 * noStroke();
 * 
 * // Draw the torus.
 * torus(5, 2.5);
 * 
 * // Stop drawing to the p5.Framebuffer object.
 * myBuffer.end();
 * 
 * // Iterate from left to right.
 * for (let x = -50; x < 50; x += 25) {
 * // Iterate from top to bottom.
 * for (let y = -50; y < 50; y += 25) {
 * // Draw the p5.Framebuffer object to the canvas.
 * image(myBuffer, x, y);
 * }
 * }
 * }
 * </code>
 * </div>
 */
function createFramebuffer(options?: object): p5.Framebuffer;

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
 * @param amount of the depth buffer to clear between 0
 * (none) and 1 (far clipping plane). Defaults to 1.
 * @example <div>
 * <code>
 * let previous;
 * let current;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the p5.Framebuffer objects.
 * previous = createFramebuffer({ format: FLOAT });
 * current = createFramebuffer({ format: FLOAT });
 * 
 * describe(
 * 'A multicolor box drifts from side to side on a white background. It leaves a trail that fades over time.'
 * );
 * }
 * 
 * function draw() {
 * // Swap the previous p5.Framebuffer and the
 * // current one so it can be used as a texture.
 * [previous, current] = [current, previous];
 * 
 * // Start drawing to the current p5.Framebuffer.
 * current.begin();
 * 
 * // Paint the background.
 * background(255);
 * 
 * // Draw the previous p5.Framebuffer.
 * // Clear the depth buffer so the previous
 * // frame doesn't block the current one.
 * push();
 * tint(255, 250);
 * image(previous, -50, -50);
 * clearDepth();
 * pop();
 * 
 * // Draw the box on top of the previous frame.
 * push();
 * let x = 25 * sin(frameCount * 0.01);
 * let y = 25 * sin(frameCount * 0.02);
 * translate(x, y, 0);
 * rotateX(frameCount * 0.01);
 * rotateY(frameCount * 0.01);
 * normalMaterial();
 * box(12);
 * pop();
 * 
 * // Stop drawing to the current p5.Framebuffer.
 * current.end();
 * 
 * // Display the current p5.Framebuffer.
 * image(current, -50, -50);
 * }
 * </code>
 * </div>
 */
function clearDepth(depth?: number): void;

}

export default function rendering(p5: any, fn: any): void;
