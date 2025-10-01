// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
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
 * @param The new order to set. Can be either 2 or 3, by default 3
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the shape.
 * noFill();
 * 
 * // Start drawing the shape.
 * beginShape();
 * 
 * // set the order to 2 for a quadratic Bézier curve
 * bezierOrder(2);
 * 
 * // Add the first anchor point.
 * bezierVertex(30, 20);
 * 
 * // Add the Bézier vertex.
 * bezierVertex(80, 20);
 * bezierVertex(50, 50);
 * 
 * // Stop drawing the shape.
 * endShape();
 * 
 * describe('A black curve drawn on a gray square. The curve starts at the top-left corner and ends at the center.');
 * }
 * </code>
 * </div>
 */
function bezierOrder(order: number): void;

/**
 * @returns The current Bézier order.
 */
function bezierOrder(): number;

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
 * @param x-coordinate of the vertex
 * @param y-coordinate of the vertex
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(220);
 * noFill();
 * strokeWeight(1);
 * 
 * beginShape();
 * splineVertex(25, 80);
 * splineVertex(20, 30);
 * splineVertex(85, 60);
 * endShape();
 * 
 * strokeWeight(5);
 * stroke(0);
 * 
 * point(25, 80);
 * point(20, 30);
 * point(85, 60);
 * 
 * describe(
 * 'On a gray background, a black spline passes through three marked points.'
 * );
 * }
 * 
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(220);
 * 
 * beginShape();
 * splineVertex(25, 80);
 * splineVertex(20, 30);
 * splineVertex(85, 60);
 * endShape(CLOSE);
 * 
 * describe(
 * 'On a gray background, a closed black spline with a white interior forms a triangular shape with smooth corners.'
 * );
 * }
 * 
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let ringInnerRadius, ringWidth;
 * let radius, dRadius;
 * let theta, dTheta;
 * let time, dTime;
 * let vertexCount, unit, offset;
 * 
 * function setup() {
 * createCanvas(400, 400);
 * 
 * vertexCount = 15;
 * unit = createVector(1, 0);
 * dTheta = TAU / vertexCount;
 * dTime = 0.004;
 * 
 * ringInnerRadius = 25;
 * ringWidth = 5 * ringInnerRadius;
 * 
 * offset = width;
 * 
 * describe(
 * 'A white blob with a black outline changes its shape over time.'
 * );
 * }
 * 
 * function draw() {
 * background(220);
 * strokeWeight(2);
 * translate(width / 2, height / 2);
 * 
 * time = dTime * frameCount;
 * 
 * beginShape();
 * for (let i = 0; i < vertexCount; i++) {
 * unit.rotate(dTheta);
 * dRadius = noise(offset + unit.x, offset + unit.y, time) * ringWidth;
 * radius = ringInnerRadius + dRadius;
 * splineVertex(radius * unit.x, radius * unit.y);
 * }
 * endShape(CLOSE);
 * }
 * </code>
 * </div>
 */
function splineVertex(x: number, y: number): void;

/**
 * @param z-coordinate of the vertex.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A ghost shape drawn in white on a blue background. When the user drags the mouse, the scene rotates to reveal the outline of a second ghost.');
 * }
 * 
 * function draw() {
 * background('midnightblue');
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the first ghost.
 * noStroke();
 * fill('ghostwhite');
 * 
 * beginShape();
 * splineVertex(-28, 41, 0);
 * splineVertex(-28, 41, 0);
 * splineVertex(-29, -33, 0);
 * splineVertex(18, -31, 0);
 * splineVertex(34, 41, 0);
 * splineVertex(34, 41, 0);
 * endShape();
 * 
 * // Draw the second ghost.
 * noFill();
 * stroke('ghostwhite');
 * 
 * beginShape();
 * splineVertex(-28, 41, -20);
 * splineVertex(-28, 41, -20);
 * splineVertex(-29, -33, -20);
 * splineVertex(18, -31, -20);
 * splineVertex(34, 41, -20);
 * splineVertex(34, 41, -20);
 * endShape();
 * }
 * </code>
 * </div>
 */
function splineVertex(x: number, y: number, z?: number): void;

/**
 */
function splineVertex(x: number, y: number, u: number, v: number): void;

/**
 */
function splineVertex(x: number, y: number, z: number, u: number, v: number): void;

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
 * @param Value to set the given property to.
 * @example <div>
 * <code>
 * // Move the mouse left and right to see the curve change.
 * 
 * let t;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * }
 * 
 * function draw() {
 * background(240);
 * 
 * t = map(mouseX, 0, width, -5, 5, true);
 * splineProperty('tightness', t);
 * 
 * noFill();
 * stroke(0);
 * strokeWeight(2);
 * 
 * beginShape();
 * splineVertex(10, 26);
 * splineVertex(83, 24);
 * 
 * splineVertex(83, 61);
 * splineVertex(25, 65);
 * endShape();
 * 
 * push();
 * strokeWeight(5);
 * point(10, 26);
 * point(83, 24);
 * point(83, 61);
 * point(25, 65);
 * pop();
 * 
 * fill(0);
 * noStroke();
 * textSize(10);
 * text(`tightness: ${round(t, 1)}`, 15, 90);
 * describe('A black spline forms a sideways U shape through four points. The spline passes through the points more loosely as the mouse moves left of center (negative tightness), and more tightly as it moves right of center (positive tightness). The tightness is displayed at the bottom.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(360, 140);
 * background(240);
 * noFill();
 * 
 * // Right panel: ends = INCLUDE (all spans).
 * push();
 * translate(10, 10);
 * stroke(220);
 * rect(0, 0, 160, 120);
 * fill(30);
 * textSize(11);
 * text('ends: INCLUDE (all spans)', 8, 16);
 * noFill();
 * 
 * splineProperty('ends', INCLUDE);
 * stroke(0);
 * strokeWeight(2);
 * spline(25, 46, 93, 44, 93, 81, 35, 85);
 * 
 * // vertices
 * strokeWeight(5);
 * stroke(0);
 * point(25, 46);
 * point(93, 44);
 * point(93, 81);
 * point(35, 85);
 * pop();
 * 
 * // Right panel: ends = EXCLUDE (middle only).
 * push();
 * translate(190, 10);
 * stroke(220);
 * rect(0, 0, 160, 120);
 * noStroke();
 * fill(30);
 * text('ends: EXCLUDE ', 18, 16);
 * noFill();
 * 
 * splineProperty('ends', EXCLUDE);
 * stroke(0);
 * strokeWeight(2);
 * spline(25, 46, 93, 44, 93, 81, 35, 85);
 * 
 * // vertices
 * strokeWeight(5);
 * stroke(0);
 * point(25, 46);
 * point(93, 44);
 * point(93, 81);
 * point(35, 85);
 * pop();
 * 
 * describe('Left panel shows spline with ends INCLUDE (three spans). Right panel shows EXCLUDE (only the middle span). Four black points mark the vertices.');
 * }
 * </code>
 * </div>
 */
function splineProperty(property: string, value: any): void;

/**
 * @returns The current value for the given property.
 */
function splineProperty(property: string): void;

/**
 * Get or set multiple spline properties at once.Similar to splineProperty():
 * `splineProperty('tightness', t)` is the same as
 * `splineProperties({'tightness': t})`
 *
 * @param An object containing key-value pairs to set.
 */
function splineProperties(properties: object): void;

/**
 * @returns The current spline properties.
 */
function splineProperties(): object;

/**
 * Adds a vertex to a custom shape.`vertex()` sets the coordinates of vertices drawn between the
 * beginShape() and
 * endShape() functions.The first two parameters, `x` and `y`, set the x- and y-coordinates of the
 * vertex.The third parameter, `z`, is optional. It sets the z-coordinate of the
 * vertex in WebGL mode. By default, `z` is 0.The fourth and fifth parameters, `u` and `v`, are also optional. They set
 * the u- and v-coordinates for the vertex’s texture when used with
 * endShape(). By default, `u` and `v` are both 0.
 *
 * @param x-coordinate of the vertex.
 * @param y-coordinate of the vertex.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the shape.
 * strokeWeight(3);
 * 
 * // Start drawing the shape.
 * // Only draw the vertices.
 * beginShape(POINTS);
 * 
 * // Add the vertices.
 * vertex(30, 20);
 * vertex(85, 20);
 * vertex(85, 75);
 * vertex(30, 75);
 * 
 * // Stop drawing the shape.
 * endShape();
 * 
 * describe('Four black dots that form a square are drawn on a gray background.');
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
 * // Start drawing the shape.
 * beginShape();
 * 
 * // Add vertices.
 * vertex(30, 20);
 * vertex(85, 20);
 * vertex(85, 75);
 * vertex(30, 75);
 * 
 * // Stop drawing the shape.
 * endShape(CLOSE);
 * 
 * describe('A white square on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Start drawing the shape.
 * beginShape();
 * 
 * // Add vertices.
 * vertex(-20, -30, 0);
 * vertex(35, -30, 0);
 * vertex(35, 25, 0);
 * vertex(-20, 25, 0);
 * 
 * // Stop drawing the shape.
 * endShape(CLOSE);
 * 
 * describe('A white square on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white square spins around slowly on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Start drawing the shape.
 * beginShape();
 * 
 * // Add vertices.
 * vertex(-20, -30, 0);
 * vertex(35, -30, 0);
 * vertex(35, 25, 0);
 * vertex(-20, 25, 0);
 * 
 * // Stop drawing the shape.
 * endShape(CLOSE);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load an image to apply as a texture.
 * img = await loadImage('assets/laDefense.jpg');
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A photograph of a ceiling rotates slowly against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Style the shape.
 * noStroke();
 * 
 * // Apply the texture.
 * texture(img);
 * textureMode(NORMAL);
 * 
 * // Start drawing the shape
 * beginShape();
 * 
 * // Add vertices.
 * vertex(-20, -30, 0, 0, 0);
 * vertex(35, -30, 0, 1, 0);
 * vertex(35, 25, 0, 1, 1);
 * vertex(-20, 25, 0, 0, 1);
 * 
 * // Stop drawing the shape.
 * endShape();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let vid;
 * function setup() {
 * // Load a video and create a p5.MediaElement object.
 * vid = createVideo('/assets/fingers.mov');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Hide the video.
 * vid.hide();
 * 
 * // Set the video to loop.
 * vid.loop();
 * 
 * describe('A rectangle with video as texture');
 * }
 * 
 * function draw() {
 * background(0);
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Set the texture mode.
 * textureMode(NORMAL);
 * 
 * // Apply the video as a texture.
 * texture(vid);
 * 
 * // Draw a custom shape using uv coordinates.
 * beginShape();
 * vertex(-40, -40, 0, 0);
 * vertex(40, -40, 1, 0);
 * vertex(40, 40, 1, 1);
 * vertex(-40, 40, 0, 1);
 * endShape();
 * }
 * </code>
 * </div>
 */
function vertex(x: number, y: number): void;

/**
 * @param u-coordinate of the vertex's texture.
 * @param v-coordinate of the vertex's texture.
 */
function vertex(x: number, y: number, u: number, v: number): void;

/**
 * @param u-coordinate of the vertex's texture.
 * @param v-coordinate of the vertex's texture.
 */
function vertex(x: number, y: number, z: number, u: number, v: number): void;

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
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Start drawing the shape.
 * beginShape();
 * 
 * // Exterior vertices, clockwise winding.
 * vertex(10, 10);
 * vertex(90, 10);
 * vertex(90, 90);
 * vertex(10, 90);
 * 
 * // Interior vertices, counter-clockwise winding.
 * beginContour();
 * vertex(30, 30);
 * vertex(30, 70);
 * vertex(70, 70);
 * vertex(70, 30);
 * endContour(CLOSE);
 * 
 * // Stop drawing the shape.
 * endShape(CLOSE);
 * 
 * describe('A white square with a square hole in its center drawn on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white square with a square hole in its center drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Start drawing the shape.
 * beginShape();
 * 
 * // Exterior vertices, clockwise winding.
 * vertex(-40, -40);
 * vertex(40, -40);
 * vertex(40, 40);
 * vertex(-40, 40);
 * 
 * // Interior vertices, counter-clockwise winding.
 * beginContour();
 * vertex(-20, -20);
 * vertex(-20, 20);
 * vertex(20, 20);
 * vertex(20, -20);
 * endContour(CLOSE);
 * 
 * // Stop drawing the shape.
 * endShape(CLOSE);
 * }
 * </code>
 * </div>
 */
function beginContour(): void;

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
 * @param By default, the value is OPEN
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Start drawing the shape.
 * beginShape();
 * 
 * // Exterior vertices, clockwise winding.
 * vertex(10, 10);
 * vertex(90, 10);
 * vertex(90, 90);
 * vertex(10, 90);
 * 
 * // Interior vertices, counter-clockwise winding.
 * beginContour();
 * vertex(30, 30);
 * vertex(30, 70);
 * vertex(70, 70);
 * vertex(70, 30);
 * endContour(CLOSE);
 * 
 * // Stop drawing the shape.
 * endShape(CLOSE);
 * 
 * describe('A white square with a square hole in its center drawn on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white square with a square hole in its center drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Start drawing the shape.
 * beginShape();
 * 
 * // Exterior vertices, clockwise winding.
 * vertex(-40, -40);
 * vertex(40, -40);
 * vertex(40, 40);
 * vertex(-40, 40);
 * 
 * // Interior vertices, counter-clockwise winding.
 * beginContour();
 * vertex(-20, -20);
 * vertex(-20, 20);
 * vertex(20, 20);
 * vertex(20, -20);
 * endContour(CLOSE);
 * 
 * // Stop drawing the shape.
 * endShape(CLOSE);
 * }
 * </code>
 * </div>
 */
function endContour(mode: OPEN | CLOSE): void;

}

export default function custom_shapes(p5: any, fn: any): void;
