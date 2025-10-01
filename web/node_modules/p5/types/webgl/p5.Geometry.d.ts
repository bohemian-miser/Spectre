// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';
import { Vector } from '../math/p5.Vector';

declare module 'p5' {
  class Geometry {
    constructor(
        detailX?: number,
        detailY?: number,
        callback?: (this: {
            detailY: number,
            detailX: number,
            vertices: p5.Vector[],
            uvs: number[]
        }) => void);

  /**
   * Calculates the position and size of the smallest box that contains the geometry.A bounding box is the smallest rectangular prism that contains the entire
   * geometry. It's defined by the box's minimum and maximum coordinates along
   * each axis, as well as the size (length) and offset (center).Calling `myGeometry.calculateBoundingBox()` returns an object with four
   * properties that describe the bounding box:`// Get myGeometry's bounding box.
   * let bbox = myGeometry.calculateBoundingBox();
   * 
   * // Print the bounding box to the console.
   * console.log(bbox);
   * 
   * // {
   * //  // The minimum coordinate along each axis.
   * //  min: { x: -1, y: -2, z: -3 },
   * //
   * //  // The maximum coordinate along each axis.
   * //  max: { x: 1, y: 2, z: 3},
   * //
   * //  // The size (length) along each axis.
   * //  size: { x: 2, y: 4, z: 6},
   * //
   * //  // The offset (center) along each axis.
   * //  offset: { x: 0, y: 0, z: 0}
   * // }`
   */
  calculateBoundingBox(): object;

  /**
   * Removes the geometry’s internal colors.`p5.Geometry` objects can be created with "internal colors" assigned to
   * vertices or the entire shape. When a geometry has internal colors,
   * fill() has no effect. Calling
   * `myGeometry.clearColors()` allows the
   * fill() function to apply color to the geometry.
   */
  clearColors(): void;

  /**
   * Flips the geometry’s texture u-coordinates.In order for texture() to work, the geometry
   * needs a way to map the points on its surface to the pixels in a rectangular
   * image that's used as a texture. The geometry's vertex at coordinates
   * `(x, y, z)` maps to the texture image's pixel at coordinates `(u, v)`.The myGeometry.uvs array stores the
   * `(u, v)` coordinates for each vertex in the order it was added to the
   * geometry. Calling `myGeometry.flipU()` flips a geometry's u-coordinates
   * so that the texture appears mirrored horizontally.For example, a plane's four vertices are added clockwise starting from the
   * top-left corner. Here's how calling `myGeometry.flipU()` would change a
   * plane's texture coordinates:`// Print the original texture coordinates.
   * // Output: [0, 0, 1, 0, 0, 1, 1, 1]
   * console.log(myGeometry.uvs);
   * 
   * // Flip the u-coordinates.
   * myGeometry.flipU();
   * 
   * // Print the flipped texture coordinates.
   * // Output: [1, 0, 0, 0, 1, 1, 0, 1]
   * console.log(myGeometry.uvs);
   * 
   * // Notice the swaps:
   * // Top vertices: [0, 0, 1, 0] --> [1, 0, 0, 0]
   * // Bottom vertices: [0, 1, 1, 1] --> [1, 1, 0, 1]`
   */
  flipU(): void;

  /**
   * Computes the geometry's faces using its vertices.All 3D shapes are made by connecting sets of points called . A
   * geometry's surface is formed by connecting vertices to form triangles that
   * are stitched together. Each triangular patch on the geometry's surface is
   * called a . `myGeometry.computeFaces()` performs the math needed to
   * define each face based on the distances between vertices.The geometry's vertices are stored as p5.Vector
   * objects in the myGeometry.vertices
   * array. The geometry's first vertex is the
   * p5.Vector object at `myGeometry.vertices[0]`,
   * its second vertex is `myGeometry.vertices[1]`, its third vertex is
   * `myGeometry.vertices[2]`, and so on.Calling `myGeometry.computeFaces()` fills the
   * myGeometry.faces array with three-element
   * arrays that list the vertices that form each face. For example, a geometry
   * made from a rectangle has two faces because a rectangle is made by joining
   * two triangles. myGeometry.faces for a
   * rectangle would be the two-dimensional array
   * `[[0, 1, 2], [2, 1, 3]]`. The first face, `myGeometry.faces[0]`, is the
   * array `[0, 1, 2]` because it's formed by connecting
   * `myGeometry.vertices[0]`, `myGeometry.vertices[1]`,and
   * `myGeometry.vertices[2]`. The second face, `myGeometry.faces[1]`, is the
   * array `[2, 1, 3]` because it's formed by connecting
   * `myGeometry.vertices[2]`, `myGeometry.vertices[1]`, and
   * `myGeometry.vertices[3]`.Note: `myGeometry.computeFaces()` only works when geometries have four or more vertices.
   */
  computeFaces(): void;

  /**
   * Calculates the normal vector for each vertex on the geometry.All 3D shapes are made by connecting sets of points called . A
   * geometry's surface is formed by connecting vertices to create triangles
   * that are stitched together. Each triangular patch on the geometry's
   * surface is called a . `myGeometry.computeNormals()` performs the
   * math needed to orient each face. Orientation is important for lighting
   * and other effects.A face's orientation is defined by its  which points out
   * of the face and is normal (perpendicular) to the surface. Calling
   * `myGeometry.computeNormals()` first calculates each face's normal vector.
   * Then it calculates the normal vector for each vertex by averaging the
   * normal vectors of the faces surrounding the vertex. The vertex normals
   * are stored as p5.Vector objects in the
   * myGeometry.vertexNormals array.The first parameter, `shadingType`, is optional. Passing the constant
   * `FLAT`, as in `myGeometry.computeNormals(FLAT)`, provides neighboring
   * faces with their own copies of the vertices they share. Surfaces appear
   * tiled with flat shading. Passing the constant `SMOOTH`, as in
   * `myGeometry.computeNormals(SMOOTH)`, makes neighboring faces reuse their
   * shared vertices. Surfaces appear smoother with smooth shading. By
   * default, `shadingType` is `FLAT`.The second parameter, `options`, is also optional. If an object with a
   * `roundToPrecision` property is passed, as in
   * `myGeometry.computeNormals(SMOOTH, { roundToPrecision: 5 })`, it sets the
   * number of decimal places to use for calculations. By default,
   * `roundToPrecision` uses 3 decimal places.
 *
   * @param
   * @param
   */
  computeNormals(shadingType: FLAT | SMOOTH, options: object): void;

  makeEdgesFromFaces(): void;

  /**
   * Transforms the geometry's vertices to fit snugly within a 100×100×100 box
   * centered at the origin.Calling `myGeometry.normalize()` translates the geometry's vertices so that
   * they're centered at the origin `(0, 0, 0)`. Then it scales the vertices so
   * that they fill a 100×100×100 box. As a result, small geometries will grow
   * and large geometries will shrink.Note: `myGeometry.normalize()` only works when called in the
   * setup() function.
   */
  normalize(): void;

  /**
   * Sets the shader's vertex property or attribute variables.A vertex property, or vertex attribute, is a variable belonging to a vertex in a shader. p5.js provides some
   * default properties, such as `aPosition`, `aNormal`, `aVertexColor`, etc. These are
   * set using vertex(), normal()
   * and fill() respectively. Custom properties can also
   * be defined within beginShape() and
   * endShape().The first parameter, `propertyName`, is a string with the property's name.
   * This is the same variable name which should be declared in the shader, as in
   * `in vec3 aProperty`, similar to .`setUniform()`.The second parameter, `data`, is the value assigned to the shader variable. This value
   * will be pushed directly onto the Geometry object. There should be the same number
   * of custom property values as vertices, this method should be invoked once for each
   * vertex.The `data` can be a Number or an array of numbers. Tn the shader program the type
   * can be declared according to the WebGL specification. Common types include `float`,
   * `vec2`, `vec3`, `vec4` or matrices.See also the global vertexProperty() function.
 *
   * @param
   * @param
   * @param
   */
  vertexProperty(propertyName: string, data: number | number[], size: number): void;

  /**
   * Flips the geometry’s texture v-coordinates.In order for texture() to work, the geometry
   * needs a way to map the points on its surface to the pixels in a rectangular
   * image that's used as a texture. The geometry's vertex at coordinates
   * `(x, y, z)` maps to the texture image's pixel at coordinates `(u, v)`.The myGeometry.uvs array stores the
   * `(u, v)` coordinates for each vertex in the order it was added to the
   * geometry. Calling `myGeometry.flipV()` flips a geometry's v-coordinates
   * so that the texture appears mirrored vertically.For example, a plane's four vertices are added clockwise starting from the
   * top-left corner. Here's how calling `myGeometry.flipV()` would change a
   * plane's texture coordinates:`// Print the original texture coordinates.
   * // Output: [0, 0, 1, 0, 0, 1, 1, 1]
   * console.log(myGeometry.uvs);
   * 
   * // Flip the v-coordinates.
   * myGeometry.flipV();
   * 
   * // Print the flipped texture coordinates.
   * // Output: [0, 1, 1, 1, 0, 0, 1, 0]
   * console.log(myGeometry.uvs);
   * 
   * // Notice the swaps:
   * // Left vertices: [0, 0] <--> [1, 0]
   * // Right vertices: [1, 0] <--> [1, 1]`
   */
  flipV(): void;

  }

/**
 * Calculates the position and size of the smallest box that contains the geometry.A bounding box is the smallest rectangular prism that contains the entire
 * geometry. It's defined by the box's minimum and maximum coordinates along
 * each axis, as well as the size (length) and offset (center).Calling `myGeometry.calculateBoundingBox()` returns an object with four
 * properties that describe the bounding box:`// Get myGeometry's bounding box.
 * let bbox = myGeometry.calculateBoundingBox();
 * 
 * // Print the bounding box to the console.
 * console.log(bbox);
 * 
 * // {
 * //  // The minimum coordinate along each axis.
 * //  min: { x: -1, y: -2, z: -3 },
 * //
 * //  // The maximum coordinate along each axis.
 * //  max: { x: 1, y: 2, z: 3},
 * //
 * //  // The size (length) along each axis.
 * //  size: { x: 2, y: 4, z: 6},
 * //
 * //  // The offset (center) along each axis.
 * //  offset: { x: 0, y: 0, z: 0}
 * // }`
 *
 * @returns bounding box of the geometry.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let particles;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a new p5.Geometry object with random spheres.
 * particles = buildGeometry(createParticles);
 * 
 * describe('Ten white spheres placed randomly against a gray background. A box encloses the spheres.');
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
 * fill(255);
 * 
 * // Draw the particles.
 * model(particles);
 * 
 * // Calculate the bounding box.
 * let bbox = particles.calculateBoundingBox();
 * 
 * // Translate to the bounding box's center.
 * translate(bbox.offset.x, bbox.offset.y, bbox.offset.z);
 * 
 * // Style the bounding box.
 * stroke(255);
 * noFill();
 * 
 * // Draw the bounding box.
 * box(bbox.size.x, bbox.size.y, bbox.size.z);
 * }
 * 
 * function createParticles() {
 * for (let i = 0; i < 10; i += 1) {
 * // Calculate random coordinates.
 * let x = randomGaussian(0, 15);
 * let y = randomGaussian(0, 15);
 * let z = randomGaussian(0, 15);
 * 
 * push();
 * // Translate to the particle's coordinates.
 * translate(x, y, z);
 * // Draw the particle.
 * sphere(3);
 * pop();
 * }
 * }
 * </code>
 * </div>
 */
function calculateBoundingBox(): object;

/**
 * Removes the geometry’s internal colors.`p5.Geometry` objects can be created with "internal colors" assigned to
 * vertices or the entire shape. When a geometry has internal colors,
 * fill() has no effect. Calling
 * `myGeometry.clearColors()` allows the
 * fill() function to apply color to the geometry.
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Create a p5.Geometry object.
 * // Set its internal color to red.
 * let myGeometry = buildGeometry(function() {
 * fill(255, 0, 0);
 * plane(20);
 * });
 * 
 * // Style the shape.
 * noStroke();
 * 
 * // Draw the p5.Geometry object (center).
 * model(myGeometry);
 * 
 * // Translate the origin to the bottom-right.
 * translate(25, 25, 0);
 * 
 * // Try to fill the geometry with green.
 * fill(0, 255, 0);
 * 
 * // Draw the geometry again (bottom-right).
 * model(myGeometry);
 * 
 * // Clear the geometry's colors.
 * myGeometry.clearColors();
 * 
 * // Fill the geometry with blue.
 * fill(0, 0, 255);
 * 
 * // Translate the origin up.
 * translate(0, -50, 0);
 * 
 * // Draw the geometry again (top-right).
 * model(myGeometry);
 * 
 * describe(
 * 'Three squares drawn against a gray background. Red squares are at the center and the bottom-right. A blue square is at the top-right.'
 * );
 * }
 * </code>
 * </div>
 */
function clearColors(): void;

/**
 * Flips the geometry’s texture u-coordinates.In order for texture() to work, the geometry
 * needs a way to map the points on its surface to the pixels in a rectangular
 * image that's used as a texture. The geometry's vertex at coordinates
 * `(x, y, z)` maps to the texture image's pixel at coordinates `(u, v)`.The myGeometry.uvs array stores the
 * `(u, v)` coordinates for each vertex in the order it was added to the
 * geometry. Calling `myGeometry.flipU()` flips a geometry's u-coordinates
 * so that the texture appears mirrored horizontally.For example, a plane's four vertices are added clockwise starting from the
 * top-left corner. Here's how calling `myGeometry.flipU()` would change a
 * plane's texture coordinates:`// Print the original texture coordinates.
 * // Output: [0, 0, 1, 0, 0, 1, 1, 1]
 * console.log(myGeometry.uvs);
 * 
 * // Flip the u-coordinates.
 * myGeometry.flipU();
 * 
 * // Print the flipped texture coordinates.
 * // Output: [1, 0, 0, 0, 1, 1, 0, 1]
 * console.log(myGeometry.uvs);
 * 
 * // Notice the swaps:
 * // Top vertices: [0, 0, 1, 0] --> [1, 0, 0, 0]
 * // Bottom vertices: [0, 1, 1, 1] --> [1, 1, 0, 1]`
 *
 * @for p5.Geometry
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * img = await loadImage('assets/laDefense.jpg');
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Create p5.Geometry objects.
 * let geom1 = buildGeometry(createShape);
 * let geom2 = buildGeometry(createShape);
 * 
 * // Flip geom2's U texture coordinates.
 * geom2.flipU();
 * 
 * // Left (original).
 * push();
 * translate(-25, 0, 0);
 * texture(img);
 * noStroke();
 * model(geom1);
 * pop();
 * 
 * // Right (flipped).
 * push();
 * translate(25, 0, 0);
 * texture(img);
 * noStroke();
 * model(geom2);
 * pop();
 * 
 * describe(
 * 'Two photos of a ceiling on a gray background. The photos are mirror images of each other.'
 * );
 * }
 * 
 * function createShape() {
 * plane(40);
 * }
 * </code>
 * </div>
 */
function flipU(): void;

/**
 * Computes the geometry's faces using its vertices.All 3D shapes are made by connecting sets of points called . A
 * geometry's surface is formed by connecting vertices to form triangles that
 * are stitched together. Each triangular patch on the geometry's surface is
 * called a . `myGeometry.computeFaces()` performs the math needed to
 * define each face based on the distances between vertices.The geometry's vertices are stored as p5.Vector
 * objects in the myGeometry.vertices
 * array. The geometry's first vertex is the
 * p5.Vector object at `myGeometry.vertices[0]`,
 * its second vertex is `myGeometry.vertices[1]`, its third vertex is
 * `myGeometry.vertices[2]`, and so on.Calling `myGeometry.computeFaces()` fills the
 * myGeometry.faces array with three-element
 * arrays that list the vertices that form each face. For example, a geometry
 * made from a rectangle has two faces because a rectangle is made by joining
 * two triangles. myGeometry.faces for a
 * rectangle would be the two-dimensional array
 * `[[0, 1, 2], [2, 1, 3]]`. The first face, `myGeometry.faces[0]`, is the
 * array `[0, 1, 2]` because it's formed by connecting
 * `myGeometry.vertices[0]`, `myGeometry.vertices[1]`,and
 * `myGeometry.vertices[2]`. The second face, `myGeometry.faces[1]`, is the
 * array `[2, 1, 3]` because it's formed by connecting
 * `myGeometry.vertices[2]`, `myGeometry.vertices[1]`, and
 * `myGeometry.vertices[3]`.Note: `myGeometry.computeFaces()` only works when geometries have four or more vertices.
 *
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let myGeometry;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Geometry object.
 * myGeometry = new p5.Geometry();
 * 
 * // Create p5.Vector objects to position the vertices.
 * let v0 = createVector(-40, 0, 0);
 * let v1 = createVector(0, -40, 0);
 * let v2 = createVector(0, 40, 0);
 * let v3 = createVector(40, 0, 0);
 * 
 * // Add the vertices to myGeometry's vertices array.
 * myGeometry.vertices.push(v0, v1, v2, v3);
 * 
 * // Compute myGeometry's faces array.
 * myGeometry.computeFaces();
 * 
 * describe('A red square drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Style the shape.
 * noStroke();
 * fill(255, 0, 0);
 * 
 * // Draw the p5.Geometry object.
 * model(myGeometry);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let myGeometry;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Geometry object using a callback function.
 * myGeometry = new p5.Geometry(1, 1, createShape);
 * 
 * describe('A red square drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Style the shape.
 * noStroke();
 * fill(255, 0, 0);
 * 
 * // Draw the p5.Geometry object.
 * model(myGeometry);
 * }
 * 
 * function createShape() {
 * // Create p5.Vector objects to position the vertices.
 * let v0 = createVector(-40, 0, 0);
 * let v1 = createVector(0, -40, 0);
 * let v2 = createVector(0, 40, 0);
 * let v3 = createVector(40, 0, 0);
 * 
 * // Add the vertices to the p5.Geometry object's vertices array.
 * this.vertices.push(v0, v1, v2, v3);
 * 
 * // Compute the faces array.
 * this.computeFaces();
 * }
 * </code>
 * </div>
 */
function computeFaces(): void;

/**
 * Calculates the normal vector for each vertex on the geometry.All 3D shapes are made by connecting sets of points called . A
 * geometry's surface is formed by connecting vertices to create triangles
 * that are stitched together. Each triangular patch on the geometry's
 * surface is called a . `myGeometry.computeNormals()` performs the
 * math needed to orient each face. Orientation is important for lighting
 * and other effects.A face's orientation is defined by its  which points out
 * of the face and is normal (perpendicular) to the surface. Calling
 * `myGeometry.computeNormals()` first calculates each face's normal vector.
 * Then it calculates the normal vector for each vertex by averaging the
 * normal vectors of the faces surrounding the vertex. The vertex normals
 * are stored as p5.Vector objects in the
 * myGeometry.vertexNormals array.The first parameter, `shadingType`, is optional. Passing the constant
 * `FLAT`, as in `myGeometry.computeNormals(FLAT)`, provides neighboring
 * faces with their own copies of the vertices they share. Surfaces appear
 * tiled with flat shading. Passing the constant `SMOOTH`, as in
 * `myGeometry.computeNormals(SMOOTH)`, makes neighboring faces reuse their
 * shared vertices. Surfaces appear smoother with smooth shading. By
 * default, `shadingType` is `FLAT`.The second parameter, `options`, is also optional. If an object with a
 * `roundToPrecision` property is passed, as in
 * `myGeometry.computeNormals(SMOOTH, { roundToPrecision: 5 })`, it sets the
 * number of decimal places to use for calculations. By default,
 * `roundToPrecision` uses 3 decimal places.
 *
 * @param shading type. either FLAT or SMOOTH. Defaults to `FLAT`.
 * @param shading options.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let myGeometry;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Geometry object.
 * myGeometry = buildGeometry(function() {
 * torus();
 * });
 * 
 * // Compute the vertex normals.
 * myGeometry.computeNormals();
 * 
 * describe(
 * "A white torus drawn on a dark gray background. Red lines extend outward from the torus' vertices."
 * );
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
 * // Rotate the coordinate system.
 * rotateX(1);
 * 
 * // Style the helix.
 * stroke(0);
 * 
 * // Display the helix.
 * model(myGeometry);
 * 
 * // Style the normal vectors.
 * stroke(255, 0, 0);
 * 
 * // Iterate over the vertices and vertexNormals arrays.
 * for (let i = 0; i < myGeometry.vertices.length; i += 1) {
 * 
 * // Get the vertex p5.Vector object.
 * let v = myGeometry.vertices[i];
 * 
 * // Get the vertex normal p5.Vector object.
 * let n = myGeometry.vertexNormals[i];
 * 
 * // Calculate a point along the vertex normal.
 * let p = p5.Vector.mult(n, 5);
 * 
 * // Draw the vertex normal as a red line.
 * push();
 * translate(v);
 * line(0, 0, 0, p.x, p.y, p.z);
 * pop();
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let myGeometry;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Geometry object using a callback function.
 * myGeometry = new p5.Geometry();
 * 
 * // Create p5.Vector objects to position the vertices.
 * let v0 = createVector(-40, 0, 0);
 * let v1 = createVector(0, -40, 0);
 * let v2 = createVector(0, 40, 0);
 * let v3 = createVector(40, 0, 0);
 * 
 * // Add the vertices to the p5.Geometry object's vertices array.
 * myGeometry.vertices.push(v0, v1, v2, v3);
 * 
 * // Compute the faces array.
 * myGeometry.computeFaces();
 * 
 * // Compute the surface normals.
 * myGeometry.computeNormals();
 * 
 * describe('A red square drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a white point light.
 * pointLight(255, 255, 255, 0, 0, 10);
 * 
 * // Style the p5.Geometry object.
 * noStroke();
 * fill(255, 0, 0);
 * 
 * // Draw the p5.Geometry object.
 * model(myGeometry);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let myGeometry;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Geometry object.
 * myGeometry = buildGeometry(createShape);
 * 
 * // Compute normals using default (FLAT) shading.
 * myGeometry.computeNormals(FLAT);
 * 
 * describe('A white, helical structure drawn on a dark gray background. Its faces appear faceted.');
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
 * // Rotate the coordinate system.
 * rotateX(1);
 * 
 * // Style the helix.
 * noStroke();
 * 
 * // Display the helix.
 * model(myGeometry);
 * }
 * 
 * function createShape() {
 * // Create a helical shape.
 * beginShape();
 * for (let i = 0; i < TWO_PI * 3; i += 0.5) {
 * let x = 30 * cos(i);
 * let y = 30 * sin(i);
 * let z = map(i, 0, TWO_PI * 3, -40, 40);
 * vertex(x, y, z);
 * }
 * endShape();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let myGeometry;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Geometry object.
 * myGeometry = buildGeometry(createShape);
 * 
 * // Compute normals using smooth shading.
 * myGeometry.computeNormals(SMOOTH);
 * 
 * describe('A white, helical structure drawn on a dark gray background.');
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
 * // Rotate the coordinate system.
 * rotateX(1);
 * 
 * // Style the helix.
 * noStroke();
 * 
 * // Display the helix.
 * model(myGeometry);
 * }
 * 
 * function createShape() {
 * // Create a helical shape.
 * beginShape();
 * for (let i = 0; i < TWO_PI * 3; i += 0.5) {
 * let x = 30 * cos(i);
 * let y = 30 * sin(i);
 * let z = map(i, 0, TWO_PI * 3, -40, 40);
 * vertex(x, y, z);
 * }
 * endShape();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let myGeometry;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Geometry object.
 * myGeometry = buildGeometry(createShape);
 * 
 * // Create an options object.
 * let options = { roundToPrecision: 5 };
 * 
 * // Compute normals using smooth shading.
 * myGeometry.computeNormals(SMOOTH, options);
 * 
 * describe('A white, helical structure drawn on a dark gray background.');
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
 * // Rotate the coordinate system.
 * rotateX(1);
 * 
 * // Style the helix.
 * noStroke();
 * 
 * // Display the helix.
 * model(myGeometry);
 * }
 * 
 * function createShape() {
 * // Create a helical shape.
 * beginShape();
 * for (let i = 0; i < TWO_PI * 3; i += 0.5) {
 * let x = 30 * cos(i);
 * let y = 30 * sin(i);
 * let z = map(i, 0, TWO_PI * 3, -40, 40);
 * vertex(x, y, z);
 * }
 * endShape();
 * }
 * </code>
 * </div>
 */
function computeNormals(shadingType: FLAT | SMOOTH, options?: object): void;

/**
 * @example <div>
 * <code>
 * let tetrahedron;
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * describe('A rotating tetrahedron');
 * 
 * tetrahedron = new p5.Geometry();
 * 
 * // Give each geometry a unique gid
 * tetrahedron.gid = 'tetrahedron';
 * 
 * // Add four points of the tetrahedron
 * 
 * let radius = 50;
 * // A 2D triangle:
 * tetrahedron.vertices.push(createVector(radius, 0, 0));
 * tetrahedron.vertices.push(createVector(radius, 0, 0).rotate(TWO_PI / 3));
 * tetrahedron.vertices.push(createVector(radius, 0, 0).rotate(TWO_PI * 2 / 3));
 * // Add a tip in the z axis:
 * tetrahedron.vertices.push(createVector(0, 0, radius));
 * 
 * // Create the four faces by connecting the sets of three points
 * tetrahedron.faces.push([0, 1, 2]);
 * tetrahedron.faces.push([0, 1, 3]);
 * tetrahedron.faces.push([0, 2, 3]);
 * tetrahedron.faces.push([1, 2, 3]);
 * tetrahedron.makeEdgesFromFaces();
 * }
 * function draw() {
 * background(200);
 * strokeWeight(2);
 * orbitControl();
 * rotateY(millis() * 0.001);
 * model(tetrahedron);
 * }
 * </code>
 * </div>
 */
function makeEdgesFromFaces(): void;

/**
 * Transforms the geometry's vertices to fit snugly within a 100×100×100 box
 * centered at the origin.Calling `myGeometry.normalize()` translates the geometry's vertices so that
 * they're centered at the origin `(0, 0, 0)`. Then it scales the vertices so
 * that they fill a 100×100×100 box. As a result, small geometries will grow
 * and large geometries will shrink.Note: `myGeometry.normalize()` only works when called in the
 * setup() function.
 *
 * @example <div>
 * <code>
 * let myGeometry;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a very small torus.
 * myGeometry = buildGeometry(function() {;
 * torus(1, 0.25);
 * });
 * 
 * // Normalize the torus so its vertices fill
 * // the range [-100, 100].
 * myGeometry.normalize();
 * 
 * describe('A white torus rotates slowly against a dark gray background.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Turn on the lights.
 * lights();
 * 
 * // Rotate around the y-axis.
 * rotateY(frameCount * 0.01);
 * 
 * // Style the torus.
 * noStroke();
 * 
 * // Draw the torus.
 * model(myGeometry);
 * }
 * </code>
 * </div>
 */
function normalize(): void;

/**
 * Sets the shader's vertex property or attribute variables.A vertex property, or vertex attribute, is a variable belonging to a vertex in a shader. p5.js provides some
 * default properties, such as `aPosition`, `aNormal`, `aVertexColor`, etc. These are
 * set using vertex(), normal()
 * and fill() respectively. Custom properties can also
 * be defined within beginShape() and
 * endShape().The first parameter, `propertyName`, is a string with the property's name.
 * This is the same variable name which should be declared in the shader, as in
 * `in vec3 aProperty`, similar to .`setUniform()`.The second parameter, `data`, is the value assigned to the shader variable. This value
 * will be pushed directly onto the Geometry object. There should be the same number
 * of custom property values as vertices, this method should be invoked once for each
 * vertex.The `data` can be a Number or an array of numbers. Tn the shader program the type
 * can be declared according to the WebGL specification. Common types include `float`,
 * `vec2`, `vec3`, `vec4` or matrices.See also the global vertexProperty() function.
 *
 * @example <div>
 * <code>
 * let geo;
 * 
 * function cartesianToSpherical(x, y, z) {
 * let r = sqrt(pow(x, 2) + pow(y, 2) + pow(z, 2));
 * let theta = acos(z / r);
 * let phi = atan2(y, x);
 * return { theta, phi };
 * }
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Modify the material shader to display roughness.
 * const myShader = baseMaterialShader().modify({
 * vertexDeclarations:`in float aRoughness;
 * out float vRoughness;`,
 * fragmentDeclarations: 'in float vRoughness;',
 * 'void afterVertex': `() {
 * vRoughness = aRoughness;
 * }`,
 * 'vec4 combineColors': `(ColorComponents components) {
 * vec4 color = vec4(0.);
 * color.rgb += components.diffuse * components.baseColor * (1.0-vRoughness);
 * color.rgb += components.ambient * components.ambientColor;
 * color.rgb += components.specular * components.specularColor * (1.0-vRoughness);
 * color.a = components.opacity;
 * return color;
 * }`
 * });
 * 
 * // Create the Geometry object.
 * geo = buildGeometry(function() {
 * fill('hotpink');
 * sphere(45, 50, 50);
 * });
 * 
 * // Set the roughness value for every vertex.
 * for (let v of geo.vertices){
 * 
 * // convert coordinates to spherical coordinates
 * let spherical = cartesianToSpherical(v.x, v.y, v.z);
 * 
 * // Set the custom roughness vertex property.
 * let roughness = noise(spherical.theta*5, spherical.phi*5);
 * geo.vertexProperty('aRoughness', roughness);
 * }
 * 
 * // Use the custom shader.
 * shader(myShader);
 * 
 * describe('A rough pink sphere rotating on a blue background.');
 * }
 * 
 * function draw() {
 * // Set some styles and lighting
 * background('lightblue');
 * noStroke();
 * 
 * specularMaterial(255,125,100);
 * shininess(2);
 * 
 * directionalLight('white', -1, 1, -1);
 * ambientLight(320);
 * 
 * rotateY(millis()*0.001);
 * 
 * // Draw the geometry
 * model(geo);
 * }
 * </code>
 * </div>
 * @param the name of the vertex property.
 * @param the data tied to the vertex property.
 * @param optional size of each unit of data.
 */
function vertexProperty(propertyName: string, data: number | number[], size?: number): void;

/**
 * The `saveObj()` function exports `p5.Geometry` objects as
 * 3D models in the Wavefront .obj file format.
 * This way, you can use the 3D shapes you create in p5.js in other software
 * for rendering, animation, 3D printing, or more.The exported .obj file will include the faces and vertices of the `p5.Geometry`,
 * as well as its texture coordinates and normals, if it has them.
 *
 * @param The name of the file to save the model as.
 * If not specified, the default file name will be 'model.obj'.
 * @example <div>
 * <code>
 * let myModel;
 * let saveBtn;
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * myModel = buildGeometry(function()) {
 * for (let i = 0; i < 5; i++) {
 * push();
 * translate(
 * random(-75, 75),
 * random(-75, 75),
 * random(-75, 75)
 * );
 * sphere(random(5, 50));
 * pop();
 * }
 * });
 * 
 * saveBtn = createButton('Save .obj');
 * saveBtn.mousePressed(() => myModel.saveObj());
 * 
 * describe('A few spheres rotating in space');
 * }
 * 
 * function draw() {
 * background(0);
 * noStroke();
 * lights();
 * rotateX(millis() * 0.001);
 * rotateY(millis() * 0.002);
 * model(myModel);
 * }
 * </code>
 * </div>
 */
function saveObj(fileName: string): void;

/**
 * The `saveStl()` function exports `p5.Geometry` objects as
 * 3D models in the STL stereolithography file format.
 * This way, you can use the 3D shapes you create in p5.js in other software
 * for rendering, animation, 3D printing, or more.The exported .stl file will include the faces, vertices, and normals of the `p5.Geometry`.By default, this method saves a text-based .stl file. Alternatively, you can save a more compact
 * but less human-readable binary .stl file by passing `{ binary: true }` as a second parameter.
 *
 * @param The name of the file to save the model as.
 * If not specified, the default file name will be 'model.stl'.
 * @param Optional settings. Options can include a boolean `binary` property, which
 * controls whether or not a binary .stl file is saved. It defaults to false.
 * @example <div>
 * <code>
 * let myModel;
 * let saveBtn1;
 * let saveBtn2;
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * myModel = buildGeometry(function() {
 * for (let i = 0; i < 5; i++) {
 * push();
 * translate(
 * random(-75, 75),
 * random(-75, 75),
 * random(-75, 75)
 * );
 * sphere(random(5, 50));
 * pop();
 * }
 * });
 * 
 * saveBtn1 = createButton('Save .stl');
 * saveBtn1.mousePressed(function() {
 * myModel.saveStl();
 * });
 * saveBtn2 = createButton('Save binary .stl');
 * saveBtn2.mousePressed(function() {
 * myModel.saveStl('model.stl', { binary: true });
 * });
 * 
 * describe('A few spheres rotating in space');
 * }
 * 
 * function draw() {
 * background(0);
 * noStroke();
 * lights();
 * rotateX(millis() * 0.001);
 * rotateY(millis() * 0.002);
 * model(myModel);
 * }
 * </code>
 * </div>
 */
function saveStl(fileName: string, options?: object): void;

/**
 * Flips the geometry’s texture v-coordinates.In order for texture() to work, the geometry
 * needs a way to map the points on its surface to the pixels in a rectangular
 * image that's used as a texture. The geometry's vertex at coordinates
 * `(x, y, z)` maps to the texture image's pixel at coordinates `(u, v)`.The myGeometry.uvs array stores the
 * `(u, v)` coordinates for each vertex in the order it was added to the
 * geometry. Calling `myGeometry.flipV()` flips a geometry's v-coordinates
 * so that the texture appears mirrored vertically.For example, a plane's four vertices are added clockwise starting from the
 * top-left corner. Here's how calling `myGeometry.flipV()` would change a
 * plane's texture coordinates:`// Print the original texture coordinates.
 * // Output: [0, 0, 1, 0, 0, 1, 1, 1]
 * console.log(myGeometry.uvs);
 * 
 * // Flip the v-coordinates.
 * myGeometry.flipV();
 * 
 * // Print the flipped texture coordinates.
 * // Output: [0, 1, 1, 1, 0, 0, 1, 0]
 * console.log(myGeometry.uvs);
 * 
 * // Notice the swaps:
 * // Left vertices: [0, 0] <--> [1, 0]
 * // Right vertices: [1, 0] <--> [1, 1]`
 *
 * @for p5.Geometry
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * img = await loadImage('assets/laDefense.jpg');
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Create p5.Geometry objects.
 * let geom1 = buildGeometry(createShape);
 * let geom2 = buildGeometry(createShape);
 * 
 * // Flip geom2's V texture coordinates.
 * geom2.flipV();
 * 
 * // Left (original).
 * push();
 * translate(-25, 0, 0);
 * texture(img);
 * noStroke();
 * model(geom1);
 * pop();
 * 
 * // Right (flipped).
 * push();
 * translate(25, 0, 0);
 * texture(img);
 * noStroke();
 * model(geom2);
 * pop();
 * 
 * describe(
 * 'Two photos of a ceiling on a gray background. The photos are mirror images of each other.'
 * );
 * }
 * 
 * function createShape() {
 * plane(40);
 * }
 * </code>
 * </div>
 */
function flipV(): void;

}

export default function p5_Geometry(p5: any, fn: any): void;
