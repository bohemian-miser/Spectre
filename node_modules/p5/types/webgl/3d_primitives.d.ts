// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Sets the stroke rendering mode to balance performance and visual features when drawing lines.`strokeMode()` offers two modes:Choose the mode that best suits your application's needs to either improve rendering speed or enhance visual quality.
 *
 * @param The stroke mode to set. Possible values are:
 * - `'SIMPLE'`: Fast rendering without caps, joins, or stroke color.
 * - `'FULL'`: Detailed rendering with caps, joins, and stroke color.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 300, WEBGL);
 * describe('A sphere with red stroke and a red, wavy line on a gray background. The wavy line have caps, joins and colors.');
 * }
 * 
 * function draw() {
 * background(128);
 * strokeMode(FULL); // Enables detailed rendering with caps, joins, and stroke color.
 * push();
 * strokeWeight(1);
 * translate(0, -50, 0);
 * sphere(50);
 * pop();
 * orbitControl();
 * 
 * noFill();
 * strokeWeight(15);
 * stroke('red');
 * beginShape();
 * bezierOrder(2); // Sets the order of the Bezier curve.
 * bezierVertex(80, 80);
 * bezierVertex(50, -40);
 * bezierVertex(-80, 80);
 * endShape();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(300, 300, WEBGL);
 * describe('A sphere with red stroke and a  wavy line without full curve decorations without caps and color on a gray background.');
 * }
 * 
 * function draw() {
 * background(128);
 * strokeMode(SIMPLE); // Simplifies stroke rendering for better performance.
 * 
 * // Draw sphere
 * push();
 * strokeWeight(1);
 * translate(0, -50, 0);
 * sphere(50);
 * pop();
 * orbitControl();
 * 
 * // Draw modified wavy red line
 * noFill();
 * strokeWeight(15);
 * stroke('red');
 * beginShape();
 * bezierOrder(2); // Sets the order of the Bezier curve.
 * bezierVertex(80, 80);
 * bezierVertex(50, -40);
 * bezierVertex(-80, 80);
 * endShape();
 * }
 * </code>
 * </div>
 */
function strokeMode(mode: string): void;

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
 * @param function that draws the shape.
 * @returns new 3D shape.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let shape;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the p5.Geometry object.
 * shape = buildGeometry(createShape);
 * 
 * describe('A white cone drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Style the p5.Geometry object.
 * noStroke();
 * 
 * // Draw the p5.Geometry object.
 * model(shape);
 * }
 * 
 * // Create p5.Geometry object from a single cone.
 * function createShape() {
 * cone();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let shape;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the arrow.
 * shape = buildGeometry(createArrow);
 * 
 * describe('A white arrow drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Style the arrow.
 * noStroke();
 * 
 * // Draw the arrow.
 * model(shape);
 * }
 * 
 * function createArrow() {
 * // Add shapes to the p5.Geometry object.
 * push();
 * rotateX(PI);
 * cone(10);
 * translate(0, -10, 0);
 * cylinder(3, 20);
 * pop();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let shape;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the p5.Geometry object.
 * shape = buildGeometry(createArrow);
 * 
 * describe('Two white arrows drawn on a gray background. The arrow on the right rotates slowly.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Style the arrows.
 * noStroke();
 * 
 * // Draw the p5.Geometry object.
 * model(shape);
 * 
 * // Translate and rotate the coordinate system.
 * translate(30, 0, 0);
 * rotateZ(frameCount * 0.01);
 * 
 * // Draw the p5.Geometry object again.
 * model(shape);
 * }
 * 
 * function createArrow() {
 * // Add shapes to the p5.Geometry object.
 * push();
 * rotateX(PI);
 * cone(10);
 * translate(0, -10, 0);
 * cylinder(3, 20);
 * pop();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let button;
 * let particles;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a button to reset the particle system.
 * button = createButton('Reset');
 * 
 * // Call resetModel() when the user presses the button.
 * button.mousePressed(resetModel);
 * 
 * // Add the original set of particles.
 * resetModel();
 * 
 * describe('A set of white spheres on a gray background. The spheres are positioned randomly. Their positions reset when the user presses the Reset button.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Style the particles.
 * noStroke();
 * 
 * // Draw the particles.
 * model(particles);
 * }
 * 
 * function resetModel() {
 * // If the p5.Geometry object has already been created,
 * // free those resources.
 * if (particles) {
 * freeGeometry(particles);
 * }
 * 
 * // Create a new p5.Geometry object with random spheres.
 * particles = buildGeometry(createParticles);
 * }
 * 
 * function createParticles() {
 * for (let i = 0; i < 60; i += 1) {
 * // Calculate random coordinates.
 * let x = randomGaussian(0, 20);
 * let y = randomGaussian(0, 20);
 * let z = randomGaussian(0, 20);
 * 
 * push();
 * // Translate to the particle's coordinates.
 * translate(x, y, z);
 * // Draw the particle.
 * sphere(5);
 * pop();
 * }
 * }
 * </code>
 * </div>
 */
function buildGeometry(callback: Function): p5.Geometry;

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
 * @param 3D shape whose resources should be freed.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Create a p5.Geometry object.
 * beginGeometry();
 * cone();
 * let shape = endGeometry();
 * 
 * // Draw the shape.
 * model(shape);
 * 
 * // Free the shape's resources.
 * freeGeometry(shape);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let button;
 * let particles;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a button to reset the particle system.
 * button = createButton('Reset');
 * 
 * // Call resetModel() when the user presses the button.
 * button.mousePressed(resetModel);
 * 
 * // Add the original set of particles.
 * resetModel();
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Style the particles.
 * noStroke();
 * 
 * // Draw the particles.
 * model(particles);
 * }
 * 
 * function resetModel() {
 * // If the p5.Geometry object has already been created,
 * // free those resources.
 * if (particles) {
 * freeGeometry(particles);
 * }
 * 
 * // Create a new p5.Geometry object with random spheres.
 * particles = buildGeometry(createParticles);
 * }
 * 
 * function createParticles() {
 * for (let i = 0; i < 60; i += 1) {
 * // Calculate random coordinates.
 * let x = randomGaussian(0, 20);
 * let y = randomGaussian(0, 20);
 * let z = randomGaussian(0, 20);
 * 
 * push();
 * // Translate to the particle's coordinates.
 * translate(x, y, z);
 * // Draw the particle.
 * sphere(5);
 * pop();
 * }
 * }
 * </code>
 * </div>
 */
function freeGeometry(geometry: p5.Geometry): void;

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
 * @param width of the plane.
 * @param height of the plane.
 * @param number of triangle subdivisions along the x-axis.
 * @param number of triangle subdivisions along the y-axis.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white plane on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the plane.
 * plane();
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
 * describe('A white plane on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the plane.
 * // Set its width and height to 30.
 * plane(30);
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
 * describe('A white plane on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the plane.
 * // Set its width to 30 and height to 50.
 * plane(30, 50);
 * }
 * </code>
 * </div>
 */
function plane(width?: number, height?: number, detailX?: number, detailY?: number): void;

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
 * @param width of the box.
 * @param height of the box.
 * @param depth of the box.
 * @param number of triangle subdivisions along the x-axis.
 * @param number of triangle subdivisions along the y-axis.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white box on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the box.
 * box();
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
 * describe('A white box on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the box.
 * // Set its width and height to 30.
 * box(30);
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
 * describe('A white box on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the box.
 * // Set its width to 30 and height to 50.
 * box(30, 50);
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
 * describe('A white box on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the box.
 * // Set its width to 30, height to 50, and depth to 10.
 * box(30, 50, 10);
 * }
 * </code>
 * </div>
 */
function box(width?: number, height?: number, depth?: number, detailX?: number, detailY?: number): void;

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
 * @param radius of the sphere. Defaults to 50.
 * @param number of triangle subdivisions along the x-axis. Defaults to 24.
 * @param number of triangle subdivisions along the y-axis. Defaults to 16.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white sphere on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the sphere.
 * sphere();
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
 * describe('A white sphere on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the sphere.
 * // Set its radius to 30.
 * sphere(30);
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
 * describe('A white sphere on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the sphere.
 * // Set its radius to 30.
 * // Set its detailX to 6.
 * sphere(30, 6);
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
 * describe('A white sphere on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the sphere.
 * // Set its radius to 30.
 * // Set its detailX to 24.
 * // Set its detailY to 4.
 * sphere(30, 24, 4);
 * }
 * </code>
 * </div>
 */
function sphere(radius?: number, detailX?: number, detailY?: number): void;

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
 * @param radius of the cylinder. Defaults to 50.
 * @param height of the cylinder. Defaults to the value of `radius`.
 * @param number of edges along the top and bottom. Defaults to 24.
 * @param number of triangle subdivisions along the y-axis. Defaults to 1.
 * @param whether to draw the cylinder's bottom. Defaults to `true`.
 * @param whether to draw the cylinder's top. Defaults to `true`.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white cylinder on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cylinder.
 * cylinder();
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
 * describe('A white cylinder on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cylinder.
 * // Set its radius and height to 30.
 * cylinder(30);
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
 * describe('A white cylinder on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cylinder.
 * // Set its radius to 30 and height to 50.
 * cylinder(30, 50);
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
 * describe('A white box on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cylinder.
 * // Set its radius to 30 and height to 50.
 * // Set its detailX to 5.
 * cylinder(30, 50, 5);
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
 * describe('A white cylinder on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cylinder.
 * // Set its radius to 30 and height to 50.
 * // Set its detailX to 24 and detailY to 2.
 * cylinder(30, 50, 24, 2);
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
 * describe('A white cylinder on a gray background. Its top is missing.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cylinder.
 * // Set its radius to 30 and height to 50.
 * // Set its detailX to 24 and detailY to 1.
 * // Don't draw its bottom.
 * cylinder(30, 50, 24, 1, false);
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
 * describe('A white cylinder on a gray background. Its top and bottom are missing.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cylinder.
 * // Set its radius to 30 and height to 50.
 * // Set its detailX to 24 and detailY to 1.
 * // Don't draw its bottom or top.
 * cylinder(30, 50, 24, 1, false, false);
 * }
 * </code>
 * </div>
 */
function cylinder(radius?: number, height?: number, detailX?: number, detailY?: number, bottomCap?: boolean, topCap?: boolean): void;

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
 * @param radius of the cone's base. Defaults to 50.
 * @param height of the cone. Defaults to the value of `radius`.
 * @param number of edges used to draw the base. Defaults to 24.
 * @param number of triangle subdivisions along the y-axis. Defaults to 1.
 * @param whether to draw the cone's base.  Defaults to `true`.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white cone on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cone.
 * cone();
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
 * describe('A white cone on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cone.
 * // Set its radius and height to 30.
 * cone(30);
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
 * describe('A white cone on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cone.
 * // Set its radius to 30 and height to 50.
 * cone(30, 50);
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
 * describe('A white cone on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cone.
 * // Set its radius to 30 and height to 50.
 * // Set its detailX to 5.
 * cone(30, 50, 5);
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
 * describe('A white pyramid on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cone.
 * // Set its radius to 30 and height to 50.
 * // Set its detailX to 5.
 * cone(30, 50, 5);
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
 * describe('A white cone on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cone.
 * // Set its radius to 30 and height to 50.
 * // Set its detailX to 24 and detailY to 2.
 * cone(30, 50, 24, 2);
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
 * describe('A white cone on a gray background. Its base is missing.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the cone.
 * // Set its radius to 30 and height to 50.
 * // Set its detailX to 24 and detailY to 1.
 * // Don't draw its base.
 * cone(30, 50, 24, 1, false);
 * }
 * </code>
 * </div>
 */
function cone(radius?: number, height?: number, detailX?: number, detailY?: number, cap?: boolean): void;

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
 * @param radius of the ellipsoid along the x-axis. Defaults to 50.
 * @param radius of the ellipsoid along the y-axis. Defaults to `radiusX`.
 * @param radius of the ellipsoid along the z-axis. Defaults to `radiusY`.
 * @param number of triangle subdivisions along the x-axis. Defaults to 24.
 * @param number of triangle subdivisions along the y-axis. Defaults to 16.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white sphere on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the ellipsoid.
 * // Set its radiusX to 30.
 * ellipsoid(30);
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
 * describe('A white ellipsoid on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the ellipsoid.
 * // Set its radiusX to 30.
 * // Set its radiusY to 40.
 * ellipsoid(30, 40);
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
 * describe('A white ellipsoid on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the ellipsoid.
 * // Set its radiusX to 30.
 * // Set its radiusY to 40.
 * // Set its radiusZ to 50.
 * ellipsoid(30, 40, 50);
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
 * describe('A white ellipsoid on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the ellipsoid.
 * // Set its radiusX to 30.
 * // Set its radiusY to 40.
 * // Set its radiusZ to 50.
 * // Set its detailX to 4.
 * ellipsoid(30, 40, 50, 4);
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
 * describe('A white ellipsoid on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the ellipsoid.
 * // Set its radiusX to 30.
 * // Set its radiusY to 40.
 * // Set its radiusZ to 50.
 * // Set its detailX to 4.
 * // Set its detailY to 3.
 * ellipsoid(30, 40, 50, 4, 3);
 * }
 * </code>
 * </div>
 */
function ellipsoid(radiusX?: number, radiusY?: number, radiusZ?: number, detailX?: number, detailY?: number): void;

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
 * @param radius of the torus. Defaults to 50.
 * @param radius of the tube. Defaults to 10.
 * @param number of edges that form the hole. Defaults to 24.
 * @param number of triangle subdivisions along the y-axis. Defaults to 16.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white torus on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the torus.
 * torus();
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
 * describe('A white torus on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the torus.
 * // Set its radius to 30.
 * torus(30);
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
 * describe('A white torus on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the torus.
 * // Set its radius to 30 and tubeRadius to 15.
 * torus(30, 15);
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
 * describe('A white torus on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the torus.
 * // Set its radius to 30 and tubeRadius to 15.
 * // Set its detailX to 5.
 * torus(30, 15, 5);
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
 * describe('A white torus on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the torus.
 * // Set its radius to 30 and tubeRadius to 15.
 * // Set its detailX to 5.
 * // Set its detailY to 3.
 * torus(30, 15, 5, 3);
 * }
 * </code>
 * </div>
 */
function torus(radius?: number, tubeRadius?: number, detailX?: number, detailY?: number): void;

/**
 * Sets the number of segments used to draw spline curves in WebGL mode.In WebGL mode, smooth shapes are drawn using many flat segments. Adding
 * more flat segments makes shapes appear smoother.The parameter, `detail`, is the density of segments to use while drawing a
 * spline curve.Note: `curveDetail()` has no effect in 2D mode.
 *
 * @param number of segments to use. Default is 1/4
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Set the curveDetail() to 0.5
 * curveDetail(0.5);
 * 
 * // Do not show all the vertices
 * splineProperty('ends', EXCLUDE)
 * 
 * // Draw a black spline curve.
 * noFill();
 * strokeWeight(1);
 * stroke(0);
 * spline(-45, -24, 0, 23, -26, 0, 23, 11, 0, -35, 15, 0);
 * 
 * // Draw red spline curves from the anchor points to the control points.
 * spline(255, 0, 0);
 * spline(-45, -24, 0, -45, -24, 0, 23, -26, 0, 23, 11, 0);
 * spline(23, -26, 0, 23, 11, 0, -35, 15, 0, -35, 15, 0);
 * 
 * // Draw the anchor points in black.
 * strokeWeight(5);
 * stroke(0);
 * point(23, -26);
 * point(23, 11);
 * 
 * // Draw the control points in red.
 * stroke(255, 0, 0);
 * point(-45, -24);
 * point(-35, 15);
 * 
 * describe(
 * 'A gray square with a jagged curve drawn in three segments. The curve is a sideways U shape with red segments on top and bottom, and a black segment on the right. The endpoints of all the segments are marked with dots.'
 * );
 * }
 * </code>
 * </div>
 */
function curveDetail(resolution: number): void;

}

export default function 3d_primitives(p5: any, fn: any): void;
