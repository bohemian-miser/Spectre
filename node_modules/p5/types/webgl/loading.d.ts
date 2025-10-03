// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Loads a 3D model to create a
 * p5.Geometry object.`loadModel()` can load 3D models from OBJ and STL files. Once the model is
 * loaded, it can be displayed with the
 * model() function, as in `model(shape)`.There are three ways to call `loadModel()` with optional parameters to help
 * process the model.The first parameter, `path`, is a `String` with the path to the file. Paths
 * to local files should be relative, as in `loadModel('assets/model.obj')`.
 * URLs such as `'https://example.com/model.obj'` may be blocked due to browser
 * security. The `path` parameter can also be defined as a
 * object for more advanced usage.
 * Note: When loading a `.obj` file that references materials stored in
 * `.mtl` files, p5.js will attempt to load and apply those materials.
 * To ensure that the `.obj` file reads the `.mtl` file correctly include the
 * `.mtl` file alongside it.The first way to call `loadModel()` has three optional parameters after the
 * file path. The first optional parameter, `successCallback`, is a function
 * to call once the model loads. For example,
 * `loadModel('assets/model.obj', handleModel)` will call the `handleModel()`
 * function once the model loads. The second optional parameter,
 * `failureCallback`, is a function to call if the model fails to load. For
 * example, `loadModel('assets/model.obj', handleModel, handleFailure)` will
 * call the `handleFailure()` function if an error occurs while loading. The
 * third optional parameter, `fileType`, is the model’s file extension as a
 * string. For example,
 * `loadModel('assets/model', handleModel, handleFailure, '.obj')` will try to
 * load the file model as a `.obj` file.The second way to call `loadModel()` has four optional parameters after the
 * file path. The first optional parameter is a `Boolean` value. If `true` is
 * passed, as in `loadModel('assets/model.obj', true)`, then the model will be
 * resized to ensure it fits the canvas. The next three parameters are
 * `successCallback`, `failureCallback`, and `fileType` as described above.The third way to call `loadModel()` has one optional parameter after the
 * file path. The optional parameter, `options`, is an `Object` with options,
 * as in `loadModel('assets/model.obj', options)`. The `options` object can
 * have the following properties:`let options = {
 * // Enables standardized size scaling during loading if set to true.
 * normalize: true,
 * 
 * // Function to call once the model loads.
 * successCallback: handleModel,
 * 
 * // Function to call if an error occurs while loading.
 * failureCallback: handleError,
 * 
 * // Model's file extension.
 * fileType: '.stl',
 * 
 * // Flips the U texture coordinates of the model.
 * flipU: false,
 * 
 * // Flips the V texture coordinates of the model.
 * flipV: false
 * };
 * 
 * // Pass the options object to loadModel().
 * loadModel('assets/model.obj', options);`This function returns a `Promise` and should be used in an `async` setup with
 * `await`. See the examples for the usage syntax.Note: There’s no support for colored STL files. STL files with color will
 * be rendered without color.
 *
 * @param path of the model to be loaded.
 * @param model’s file extension. Either `'.obj'` or `'.stl'`.
 * @param if `true`, scale the model to fit the canvas.
 * @param function to call once the model is loaded. Will be passed
 * the <a href="#/p5.Geometry">p5.Geometry</a> object.
 * @param function to call if the model fails to load. Will be passed an `Error` event object.
 * @return the <a href="#/p5.Geometry">p5.Geometry</a> object
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let shape;
 * 
 * // Load the file and create a p5.Geometry object.
 * async function setup() {
 * shape = await loadModel('assets/teapot.obj');
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white teapot drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the shape.
 * model(shape);
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
 * // Load the file and create a p5.Geometry object.
 * // Normalize the geometry's size to fit the canvas.
 * async function setup() {
 * shape = await loadModel('assets/teapot.obj', true);
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white teapot drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the shape.
 * model(shape);
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
 * // Load the file and create a p5.Geometry object.
 * async function setup() {
 * await loadModel('assets/teapot.obj', true, handleModel);
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white teapot drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the shape.
 * model(shape);
 * }
 * 
 * // Set the shape variable and log the geometry's
 * // ID to the console.
 * function handleModel(data) {
 * shape = data;
 * console.log(shape.gid);
 * }
 * </code>
 * </div>
 * 
 * <div class='notest'>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let shape;
 * 
 * // Load the file and create a p5.Geometry object.
 * async function setup() {
 * await loadModel('assets/teapot.obj', true, handleModel, handleError);
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white teapot drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the shape.
 * model(shape);
 * }
 * 
 * // Set the shape variable and print the geometry's
 * // ID to the console.
 * function handleModel(data) {
 * shape = data;
 * console.log(shape.gid);
 * }
 * 
 * // Print an error message if the file doesn't load.
 * function handleError(error) {
 * console.error('Oops!', error);
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
 * // Load the file and create a p5.Geometry object.
 * async function setup() {
 * await loadModel('assets/teapot.obj', '.obj', true, handleModel, handleError);
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white teapot drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the shape.
 * model(shape);
 * }
 * 
 * // Set the shape variable and print the geometry's
 * // ID to the console.
 * function handleModel(data) {
 * shape = data;
 * console.log(shape.gid);
 * }
 * 
 * // Print an error message if the file doesn't load.
 * function handleError(error) {
 * console.error('Oops!', error);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let shape;
 * let options = {
 * fileType: '.obj',
 * normalize: true,
 * successCallback: handleModel,
 * failureCallback: handleError
 * };
 * 
 * // Load the file and create a p5.Geometry object.
 * async function setup() {
 * await loadModel('assets/teapot.obj', options);
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white teapot drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the shape.
 * model(shape);
 * }
 * 
 * // Set the shape variable and print the geometry's
 * // ID to the console.
 * function handleModel(data) {
 * shape = data;
 * console.log(shape.gid);
 * }
 * 
 * // Print an error message if the file doesn't load.
 * function handleError(error) {
 * console.error('Oops!', error);
 * }
 * </code>
 * </div>
 */
function loadModel(path: string | Request, fileType?: string, normalize: boolean, successCallback?: any, failureCallback?: any): Promise<p5.Geometry>;

/**
 * @return new <a href="#/p5.Geometry">p5.Geometry</a> object.
 */
function loadModel(path: string | Request, fileType?: string, successCallback?: any, failureCallback?: any): Promise<p5.Geometry>;

/**
 * @param loading options.
 * @return new <a href="#/p5.Geometry">p5.Geometry</a> object.
 */
function loadModel(path: string | Request, options?: object): Promise<p5.Geometry>;

/**
 * Draws a p5.Geometry object to the canvas.The parameter, `model`, is the
 * p5.Geometry object to draw.
 * p5.Geometry objects can be built with
 * buildGeometry(), or
 * beginGeometry() and
 * endGeometry(). They can also be loaded from
 * a file with loadGeometry().Note: `model()` can only be used in WebGL mode.
 *
 * @param 3D shape to be drawn.
 * @param number of instances to draw.
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
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
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
 * let shape;
 * 
 * async function setup() {
 * shape = await loadModel('assets/octahedron.obj');
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white octahedron drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the shape.
 * model(shape);
 * }
 * </code>
 * </div>
 */
function model(model: p5.Geometry, count: number): void;

/**
 * Load a 3d model from an OBJ or STL string.OBJ and STL files lack a built-in sense of scale, causing models exported from different programs to vary in size.
 * If your model doesn't display correctly, consider using `loadModel()` with `normalize` set to `true` to standardize its size.
 * Further adjustments can be made using the `scale()` function.Also, the support for colored STL files is not present. STL files with color will be
 * rendered without color properties.
 *
 * @param String of the object to be loaded
 * @param The file extension of the model
 * (<code>.stl</code>, <code>.obj</code>).
 * @param If true, scale the model to a
 * standardized size when loading
 * @param Function to be called
 * once the model is loaded. Will be passed
 * the 3D model object.
 * @param called with event error if
 * the model fails to load.
 * @return the <a href="#/p5.Geometry">p5.Geometry</a> object
 * @example <div>
 * <code>
 * const octahedron_model = `
 * v 0.000000E+00 0.000000E+00 40.0000
 * v 22.5000 22.5000 0.000000E+00
 * v 22.5000 -22.5000 0.000000E+00
 * v -22.5000 -22.5000 0.000000E+00
 * v -22.5000 22.5000 0.000000E+00
 * v 0.000000E+00 0.000000E+00 -40.0000
 * f     1 2 3
 * f     1 3 4
 * f     1 4 5
 * f     1 5 2
 * f     6 5 4
 * f     6 4 3
 * f     6 3 2
 * f     6 2 5
 * `;
 * //draw a spinning octahedron
 * let octahedron;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * octahedron = createModel(octahedron_model, '.obj');
 * describe('Vertically rotating 3D octahedron.');
 * }
 * 
 * function draw() {
 * background(200);
 * rotateX(frameCount * 0.01);
 * rotateY(frameCount * 0.01);
 * model(octahedron);
 * }
 * </code>
 * </div>
 */
function createModel(modelString: string, fileType?: string, normalize: boolean, successCallback?: any, failureCallback?: any): p5.Geometry;

/**
 * @return the <a href="#/p5.Geometry">p5.Geometry</a> object
 */
function createModel(modelString: string, fileType?: string, successCallback?: any, failureCallback?: any): p5.Geometry;

/**
 * @return the <a href="#/p5.Geometry">p5.Geometry</a> object
 */
function createModel(modelString: string, fileType?: string, options?: object): p5.Geometry;

}

export default function loading(p5: any, fn: any): void;
