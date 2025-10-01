// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class Graphics extends Element {
    constructor(w: number, h: number, renderer: P2D | WEBGL | P2DHDR, pInst?: p5, canvas?: HTMLCanvasElement);

  /**
   * Resets the graphics buffer's transformations and lighting.By default, the main canvas resets certain transformation and lighting
   * values each time draw() executes. `p5.Graphics`
   * objects must reset these values manually by calling `myGraphics.reset()`.
   */
  reset(): void;

  /**
   * Removes the graphics buffer from the web page.Calling `myGraphics.remove()` removes the graphics buffer's
   * `&lt;canvas&gt;` element from the web page. The graphics buffer also uses
   * a bit of memory on the CPU that can be freed like so:`// Remove the graphics buffer from the web page.
   * myGraphics.remove();
   * 
   * // Delete the graphics buffer from CPU memory.
   * myGraphics = undefined;`Note: All variables that reference the graphics buffer must be assigned
   * the value `undefined` to delete the graphics buffer from CPU memory. If any
   * variable still refers to the graphics buffer, then it won't be garbage
   * collected.
   */
  remove(): void;

  /**
   * Creates a new p5.Framebuffer object with
   * the same WebGL context as the graphics buffer.p5.Framebuffer objects are separate drawing
   * surfaces that can be used as textures in WebGL mode. They're similar to
   * p5.Graphics objects and generally run much
   * faster when used as textures. Creating a
   * p5.Framebuffer object in the same context
   * as the graphics buffer makes this speedup possible.The parameter, `options`, is optional. An object can be passed to configure
   * the p5.Framebuffer object. The available
   * properties are:If the `width`, `height`, or `density` attributes are set, they won't
   * automatically match the graphics buffer and must be changed manually.
 *
   * @param
   */
  createFramebuffer(options: object): p5.Framebuffer;

  }

/**
 * Resets the graphics buffer's transformations and lighting.By default, the main canvas resets certain transformation and lighting
 * values each time draw() executes. `p5.Graphics`
 * objects must reset these values manually by calling `myGraphics.reset()`.
 *
 * @example <div>
 * <code>
 * let pg;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Graphics object.
 * pg = createGraphics(60, 60);
 * 
 * describe('A white circle moves downward slowly within a dark square. The circle resets at the top of the dark square when the user presses the mouse.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the p5.Graphics object's coordinate system.
 * // The translation accumulates; the white circle moves.
 * pg.translate(0, 0.1);
 * 
 * // Draw to the p5.Graphics object.
 * pg.background(100);
 * pg.circle(30, 0, 10);
 * 
 * // Display the p5.Graphics object.
 * image(pg, 20, 20);
 * 
 * // Translate the main canvas' coordinate system.
 * // The translation doesn't accumulate; the dark
 * // square is always in the same place.
 * translate(0, 0.1);
 * 
 * // Reset the p5.Graphics object when the
 * // user presses the mouse.
 * if (mouseIsPressed === true) {
 * pg.reset();
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let pg;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Graphics object.
 * pg = createGraphics(60, 60);
 * 
 * describe('A white circle at the center of a dark gray square. The image is drawn on a light gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the p5.Graphics object's coordinate system.
 * pg.translate(30, 30);
 * 
 * // Draw to the p5.Graphics object.
 * pg.background(100);
 * pg.circle(0, 0, 10);
 * 
 * // Display the p5.Graphics object.
 * image(pg, 20, 20);
 * 
 * // Reset the p5.Graphics object automatically.
 * pg.reset();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let pg;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Graphics object using WebGL mode.
 * pg = createGraphics(100, 100, WEBGL);
 * 
 * describe("A sphere lit from above with a red light. The sphere's surface becomes glossy while the user clicks and holds the mouse.");
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Add a red point light from the top-right.
 * pg.pointLight(255, 0, 0, 50, -100, 50);
 * 
 * // Style the sphere.
 * // It should appear glossy when the
 * // lighting values are reset.
 * pg.noStroke();
 * pg.specularMaterial(255);
 * pg.shininess(100);
 * 
 * // Draw the sphere.
 * pg.sphere(30);
 * 
 * // Display the p5.Graphics object.
 * image(pg, -50, -50);
 * 
 * // Reset the p5.Graphics object when
 * // the user presses the mouse.
 * if (mouseIsPressed === true) {
 * pg.reset();
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let pg;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Graphics object using WebGL mode.
 * pg = createGraphics(100, 100, WEBGL);
 * 
 * describe('A sphere with a glossy surface is lit from the top-right by a red light.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Add a red point light from the top-right.
 * pg.pointLight(255, 0, 0, 50, -100, 50);
 * 
 * // Style the sphere.
 * pg.noStroke();
 * pg.specularMaterial(255);
 * pg.shininess(100);
 * 
 * // Draw the sphere.
 * pg.sphere(30);
 * 
 * // Display the p5.Graphics object.
 * image(pg, 0, 0);
 * 
 * // Reset the p5.Graphics object automatically.
 * pg.reset();
 * }
 * </code>
 * </div>
 */
function reset(): void;

/**
 * Removes the graphics buffer from the web page.Calling `myGraphics.remove()` removes the graphics buffer's
 * `&lt;canvas&gt;` element from the web page. The graphics buffer also uses
 * a bit of memory on the CPU that can be freed like so:`// Remove the graphics buffer from the web page.
 * myGraphics.remove();
 * 
 * // Delete the graphics buffer from CPU memory.
 * myGraphics = undefined;`Note: All variables that reference the graphics buffer must be assigned
 * the value `undefined` to delete the graphics buffer from CPU memory. If any
 * variable still refers to the graphics buffer, then it won't be garbage
 * collected.
 *
 * @example <div>
 * <code>
 * // Double-click to remove the p5.Graphics object.
 * 
 * let pg;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Graphics object.
 * pg = createGraphics(60, 60);
 * 
 * // Draw to the p5.Graphics object.
 * pg.background(100);
 * pg.circle(30, 30, 20);
 * 
 * describe('A white circle at the center of a dark gray square disappears when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Display the p5.Graphics object if
 * // it's available.
 * if (pg) {
 * image(pg, 20, 20);
 * }
 * }
 * 
 * // Remove the p5.Graphics object when the
 * // the user double-clicks.
 * function doubleClicked() {
 * // Remove the p5.Graphics object from the web page.
 * pg.remove();
 * pg = undefined;
 * }
 * </code>
 * </div>
 */
function remove(): void;

/**
 * Creates a new p5.Framebuffer object with
 * the same WebGL context as the graphics buffer.p5.Framebuffer objects are separate drawing
 * surfaces that can be used as textures in WebGL mode. They're similar to
 * p5.Graphics objects and generally run much
 * faster when used as textures. Creating a
 * p5.Framebuffer object in the same context
 * as the graphics buffer makes this speedup possible.The parameter, `options`, is optional. An object can be passed to configure
 * the p5.Framebuffer object. The available
 * properties are:If the `width`, `height`, or `density` attributes are set, they won't
 * automatically match the graphics buffer and must be changed manually.
 *
 * @param configuration options.
 * @return new framebuffer.
 * @example <div>
 * <code>
 * // Click and hold a mouse button to change shapes.
 * 
 * let pg;
 * let torusLayer;
 * let boxLayer;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Graphics object using WebGL mode.
 * pg = createGraphics(100, 100, WEBGL);
 * 
 * // Create the p5.Framebuffer objects.
 * torusLayer = pg.createFramebuffer();
 * boxLayer = pg.createFramebuffer();
 * 
 * describe('A grid of white toruses rotating against a dark gray background. The shapes become boxes while the user holds a mouse button.');
 * }
 * 
 * function draw() {
 * // Update and draw the layers offscreen.
 * drawTorus();
 * drawBox();
 * 
 * // Choose the layer to display.
 * let layer;
 * if (mouseIsPressed === true) {
 * layer = boxLayer;
 * } else {
 * layer = torusLayer;
 * }
 * 
 * // Draw to the p5.Graphics object.
 * pg.background(50);
 * 
 * // Iterate from left to right.
 * for (let x = -50; x < 50; x += 25) {
 * // Iterate from top to bottom.
 * for (let y = -50; y < 50; y += 25) {
 * // Draw the layer to the p5.Graphics object
 * pg.image(layer, x, y, 25, 25);
 * }
 * }
 * 
 * // Display the p5.Graphics object.
 * image(pg, 0, 0);
 * }
 * 
 * // Update and draw the torus layer offscreen.
 * function drawTorus() {
 * // Start drawing to the torus p5.Framebuffer.
 * torusLayer.begin();
 * 
 * // Clear the drawing surface.
 * pg.clear();
 * 
 * // Turn on the lights.
 * pg.lights();
 * 
 * // Rotate the coordinate system.
 * pg.rotateX(frameCount * 0.01);
 * pg.rotateY(frameCount * 0.01);
 * 
 * // Style the torus.
 * pg.noStroke();
 * 
 * // Draw the torus.
 * pg.torus(20);
 * 
 * // Start drawing to the torus p5.Framebuffer.
 * torusLayer.end();
 * }
 * 
 * // Update and draw the box layer offscreen.
 * function drawBox() {
 * // Start drawing to the box p5.Framebuffer.
 * boxLayer.begin();
 * 
 * // Clear the drawing surface.
 * pg.clear();
 * 
 * // Turn on the lights.
 * pg.lights();
 * 
 * // Rotate the coordinate system.
 * pg.rotateX(frameCount * 0.01);
 * pg.rotateY(frameCount * 0.01);
 * 
 * // Style the box.
 * pg.noStroke();
 * 
 * // Draw the box.
 * pg.box(30);
 * 
 * // Start drawing to the box p5.Framebuffer.
 * boxLayer.end();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and hold a mouse button to change shapes.
 * 
 * let pg;
 * let torusLayer;
 * let boxLayer;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create an options object.
 * let options = { width: 25, height: 25 };
 * 
 * // Create a p5.Graphics object using WebGL mode.
 * pg = createGraphics(100, 100, WEBGL);
 * 
 * // Create the p5.Framebuffer objects.
 * // Use options for configuration.
 * torusLayer = pg.createFramebuffer(options);
 * boxLayer = pg.createFramebuffer(options);
 * 
 * describe('A grid of white toruses rotating against a dark gray background. The shapes become boxes while the user holds a mouse button.');
 * }
 * 
 * function draw() {
 * // Update and draw the layers offscreen.
 * drawTorus();
 * drawBox();
 * 
 * // Choose the layer to display.
 * let layer;
 * if (mouseIsPressed === true) {
 * layer = boxLayer;
 * } else {
 * layer = torusLayer;
 * }
 * 
 * // Draw to the p5.Graphics object.
 * pg.background(50);
 * 
 * // Iterate from left to right.
 * for (let x = -50; x < 50; x += 25) {
 * // Iterate from top to bottom.
 * for (let y = -50; y < 50; y += 25) {
 * // Draw the layer to the p5.Graphics object
 * pg.image(layer, x, y);
 * }
 * }
 * 
 * // Display the p5.Graphics object.
 * image(pg, 0, 0);
 * }
 * 
 * // Update and draw the torus layer offscreen.
 * function drawTorus() {
 * // Start drawing to the torus p5.Framebuffer.
 * torusLayer.begin();
 * 
 * // Clear the drawing surface.
 * pg.clear();
 * 
 * // Turn on the lights.
 * pg.lights();
 * 
 * // Rotate the coordinate system.
 * pg.rotateX(frameCount * 0.01);
 * pg.rotateY(frameCount * 0.01);
 * 
 * // Style the torus.
 * pg.noStroke();
 * 
 * // Draw the torus.
 * pg.torus(5, 2.5);
 * 
 * // Start drawing to the torus p5.Framebuffer.
 * torusLayer.end();
 * }
 * 
 * // Update and draw the box layer offscreen.
 * function drawBox() {
 * // Start drawing to the box p5.Framebuffer.
 * boxLayer.begin();
 * 
 * // Clear the drawing surface.
 * pg.clear();
 * 
 * // Turn on the lights.
 * pg.lights();
 * 
 * // Rotate the coordinate system.
 * pg.rotateX(frameCount * 0.01);
 * pg.rotateY(frameCount * 0.01);
 * 
 * // Style the box.
 * pg.noStroke();
 * 
 * // Draw the box.
 * pg.box(7.5);
 * 
 * // Start drawing to the box p5.Framebuffer.
 * boxLayer.end();
 * }
 * </code>
 * </div>
 */
function createFramebuffer(options?: object): p5.Framebuffer;

}

export default function p5_Graphics(p5: any, fn: any): void;
