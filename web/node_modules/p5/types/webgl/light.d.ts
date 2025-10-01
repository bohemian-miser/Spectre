// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';
import { Vector } from '../math/p5.Vector';

declare module 'p5' {
/**
 * Creates a light that shines from all directions.Ambient light does not come from one direction. Instead, 3D shapes are
 * lit evenly from all sides. Ambient lights are almost always used in
 * combination with other types of lights.There are three ways to call `ambientLight()` with optional parameters to
 * set the light’s color.The first way to call `ambientLight()` has two parameters, `gray` and
 * `alpha`. `alpha` is optional. Grayscale and alpha values between 0 and 255
 * can be passed to set the ambient light’s color, as in `ambientLight(50)` or
 * `ambientLight(50, 30)`.The second way to call `ambientLight()` has one parameter, color. A
 * p5.Color object, an array of color values, or a
 * CSS color string, as in `ambientLight('magenta')`, can be passed to set the
 * ambient light’s color.The third way to call `ambientLight()` has four parameters, `v1`, `v2`,
 * `v3`, and `alpha`. `alpha` is optional. RGBA, HSBA, or HSLA values can be
 * passed to set the ambient light’s colors, as in `ambientLight(255, 0, 0)`
 * or `ambientLight(255, 0, 0, 30)`. Color values will be interpreted using
 * the current colorMode().
 *
 * @param red or hue value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param green or saturation value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param blue, brightness, or lightness value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param alpha (transparency) value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * // Double-click the canvas to turn on the light.
 * 
 * let isLit = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A sphere drawn against a gray background. The sphere appears to change color when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Control the light.
 * if (isLit === true) {
 * // Use a grayscale value of 80.
 * ambientLight(80);
 * }
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * 
 * // Turn on the ambient light when the user double-clicks.
 * function doubleClicked() {
 * isLit = true;
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
 * describe('A faded magenta sphere drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * // Use a p5.Color object.
 * let c = color('orchid');
 * ambientLight(c);
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
 * describe('A faded magenta sphere drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * // Use a CSS color string.
 * ambientLight('#DA70D6');
 * 
 * // Draw the sphere.
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
 * describe('A faded magenta sphere drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * // Use RGB values
 * ambientLight(218, 112, 214);
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * </code>
 * </div>
 */
function ambientLight(v1: number, v2: number, v3: number, alpha?: number): void;

/**
 * @param grayscale value between 0 and 255.
 */
function ambientLight(gray: number, alpha?: number): void;

/**
 * @param color as a CSS string.
 */
function ambientLight(value: string): void;

/**
 * @param color as an array of RGBA, HSBA, or HSLA
 * values.
 */
function ambientLight(values: number[]): void;

/**
 * @param color as a <a href="#/p5.Color">p5.Color</a> object.
 */
function ambientLight(color: p5.Color): void;

/**
 * Sets the specular color for lights.`specularColor()` affects lights that bounce off a surface in a preferred
 * direction. These lights include
 * directionalLight(),
 * pointLight(), and
 * spotLight(). The function helps to create
 * highlights on p5.Geometry objects that are
 * styled with specularMaterial(). If a
 * geometry does not use
 * specularMaterial(), then
 * `specularColor()` will have no effect.Note: `specularColor()` doesn’t affect lights that bounce in all
 * directions, including ambientLight() and
 * imageLight().There are three ways to call `specularColor()` with optional parameters to
 * set the specular highlight color.The first way to call `specularColor()` has two optional parameters, `gray`
 * and `alpha`. Grayscale and alpha values between 0 and 255, as in
 * `specularColor(50)` or `specularColor(50, 80)`, can be passed to set the
 * specular highlight color.The second way to call `specularColor()` has one optional parameter,
 * `color`. A p5.Color object, an array of color
 * values, or a CSS color string can be passed to set the specular highlight
 * color.The third way to call `specularColor()` has four optional parameters, `v1`,
 * `v2`, `v3`, and `alpha`. RGBA, HSBA, or HSLA values, as in
 * `specularColor(255, 0, 0, 80)`, can be passed to set the specular highlight
 * color. Color values will be interpreted using the current
 * colorMode().
 *
 * @param red or hue value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param green or saturation value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param blue, brightness, or lightness value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white sphere drawn on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // No specular color.
 * // Draw the sphere.
 * sphere(30);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * // Double-click the canvas to add a point light.
 * 
 * let isLit = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A sphere drawn on a gray background. A spotlight starts shining when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Style the sphere.
 * noStroke();
 * specularColor(100);
 * specularMaterial(255, 255, 255);
 * 
 * // Control the light.
 * if (isLit === true) {
 * // Add a white point light from the top-right.
 * pointLight(255, 255, 255, 30, -20, 40);
 * }
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * 
 * // Turn on the point light when the user double-clicks.
 * function doubleClicked() {
 * isLit = true;
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
 * describe('A black sphere drawn on a gray background. An area on the surface of the sphere is highlighted in blue.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a specular highlight.
 * // Use a p5.Color object.
 * let c = color('dodgerblue');
 * specularColor(c);
 * 
 * // Add a white point light from the top-right.
 * pointLight(255, 255, 255, 30, -20, 40);
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Add a white specular material.
 * specularMaterial(255, 255, 255);
 * 
 * // Draw the sphere.
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
 * describe('A black sphere drawn on a gray background. An area on the surface of the sphere is highlighted in blue.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a specular highlight.
 * // Use a CSS color string.
 * specularColor('#1E90FF');
 * 
 * // Add a white point light from the top-right.
 * pointLight(255, 255, 255, 30, -20, 40);
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Add a white specular material.
 * specularMaterial(255, 255, 255);
 * 
 * // Draw the sphere.
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
 * describe('A black sphere drawn on a gray background. An area on the surface of the sphere is highlighted in blue.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a specular highlight.
 * // Use RGB values.
 * specularColor(30, 144, 255);
 * 
 * // Add a white point light from the top-right.
 * pointLight(255, 255, 255, 30, -20, 40);
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Add a white specular material.
 * specularMaterial(255, 255, 255);
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * </code>
 * </div>
 */
function specularColor(v1: number, v2: number, v3: number): void;

/**
 * @param grayscale value between 0 and 255.
 */
function specularColor(gray: number): void;

/**
 * @param color as a CSS string.
 */
function specularColor(value: string): void;

/**
 * @param color as an array of RGBA, HSBA, or HSLA
 * values.
 */
function specularColor(values: number[]): void;

/**
 * @param color as a <a href="#/p5.Color">p5.Color</a> object.
 */
function specularColor(color: p5.Color): void;

/**
 * Creates a light that shines in one direction.Directional lights don’t shine from a specific point. They’re like a sun
 * that shines from somewhere offscreen. The light’s direction is set using
 * three `(x, y, z)` values between -1 and 1. For example, setting a light’s
 * direction as `(1, 0, 0)` will light p5.Geometry
 * objects from the left since the light faces directly to the right. A
 * maximum of 5 directional lights can be active at once.There are four ways to call `directionalLight()` with parameters to set the
 * light’s color and direction.The first way to call `directionalLight()` has six parameters. The first
 * three parameters, `v1`, `v2`, and `v3`, set the light’s color using the
 * current colorMode(). The last three
 * parameters, `x`, `y`, and `z`, set the light’s direction. For example,
 * `directionalLight(255, 0, 0, 1, 0, 0)` creates a red `(255, 0, 0)` light
 * that shines to the right `(1, 0, 0)`.The second way to call `directionalLight()` has four parameters. The first
 * three parameters, `v1`, `v2`, and `v3`, set the light’s color using the
 * current colorMode(). The last parameter,
 * `direction` sets the light’s direction using a
 * p5.Vector object. For example,
 * `directionalLight(255, 0, 0, lightDir)` creates a red `(255, 0, 0)` light
 * that shines in the direction the `lightDir` vector points.The third way to call `directionalLight()` has four parameters. The first
 * parameter, `color`, sets the light’s color using a
 * p5.Color object or an array of color values. The
 * last three parameters, `x`, `y`, and `z`, set the light’s direction. For
 * example, `directionalLight(myColor, 1, 0, 0)` creates a light that shines
 * to the right `(1, 0, 0)` with the color value of `myColor`.The fourth way to call `directionalLight()` has two parameters. The first
 * parameter, `color`, sets the light’s color using a
 * p5.Color object or an array of color values. The
 * second parameter, `direction`, sets the light’s direction using a
 * p5.Vector object. For example,
 * `directionalLight(myColor, lightDir)` creates a light that shines in the
 * direction the `lightDir` vector points with the color value of `myColor`.
 *
 * @param red or hue value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param green or saturation value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param blue, brightness, or lightness value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param x-component of the light's direction between -1 and 1.
 * @param y-component of the light's direction between -1 and 1.
 * @param z-component of the light's direction between -1 and 1.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * // Double-click to turn on the directional light.
 * 
 * let isLit = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A sphere drawn on a gray background. A red light starts shining from above when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Control the light.
 * if (isLit === true) {
 * // Add a red directional light from above.
 * // Use RGB values and XYZ directions.
 * directionalLight(255, 0, 0, 0, 1, 0);
 * }
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Draw the sphere.
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
 * describe('A sphere drawn on a gray background. The top of the sphere appears bright red. The color gets darker toward the bottom.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a red directional light from above.
 * // Use a p5.Color object and XYZ directions.
 * let c = color(255, 0, 0);
 * directionalLight(c, 0, 1, 0);
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Draw the sphere.
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
 * describe('A sphere drawn on a gray background. The top of the sphere appears bright red. The color gets darker toward the bottom.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a red directional light from above.
 * // Use a p5.Color object and a p5.Vector object.
 * let c = color(255, 0, 0);
 * let lightDir = createVector(0, 1, 0);
 * directionalLight(c, lightDir);
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * </code>
 * </div>
 */
function directionalLight(v1: number, v2: number, v3: number, x: number, y: number, z: number): void;

/**
 * @param direction of the light as a
 * <a href="#/p5.Vector">p5.Vector</a> object.
 */
function directionalLight(v1: number, v2: number, v3: number, direction: p5.Vector): void;

/**
 * @param color as a <a href="#/p5.Color">p5.Color</a> object,
 * an array of color values, or as a CSS string.
 */
function directionalLight(color: p5.Color | number[] | string, x: number, y: number, z: number): void;

/**
 */
function directionalLight(color: p5.Color | number[] | string, direction: p5.Vector): void;

/**
 * Creates a light that shines from a point in all directions.Point lights are like light bulbs that shine in all directions. They can be
 * placed at different positions to achieve different lighting effects. A
 * maximum of 5 point lights can be active at once.There are four ways to call `pointLight()` with parameters to set the
 * light’s color and position.The first way to call `pointLight()` has six parameters. The first three
 * parameters, `v1`, `v2`, and `v3`, set the light’s color using the current
 * colorMode(). The last three parameters, `x`,
 * `y`, and `z`, set the light’s position. For example,
 * `pointLight(255, 0, 0, 50, 0, 0)` creates a red `(255, 0, 0)` light that
 * shines from the coordinates `(50, 0, 0)`.The second way to call `pointLight()` has four parameters. The first three
 * parameters, `v1`, `v2`, and `v3`, set the light’s color using the current
 * colorMode(). The last parameter, position sets
 * the light’s position using a p5.Vector object.
 * For example, `pointLight(255, 0, 0, lightPos)` creates a red `(255, 0, 0)`
 * light that shines from the position set by the `lightPos` vector.The third way to call `pointLight()` has four parameters. The first
 * parameter, `color`, sets the light’s color using a
 * p5.Color object or an array of color values. The
 * last three parameters, `x`, `y`, and `z`, set the light’s position. For
 * example, `directionalLight(myColor, 50, 0, 0)` creates a light that shines
 * from the coordinates `(50, 0, 0)` with the color value of `myColor`.The fourth way to call `pointLight()` has two parameters. The first
 * parameter, `color`, sets the light’s color using a
 * p5.Color object or an array of color values. The
 * second parameter, `position`, sets the light’s position using a
 * p5.Vector object. For example,
 * `directionalLight(myColor, lightPos)` creates a light that shines from the
 * position set by the `lightPos` vector with the color value of `myColor`.
 *
 * @param red or hue value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param green or saturation value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param blue, brightness, or lightness value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param x-coordinate of the light.
 * @param y-coordinate of the light.
 * @param z-coordinate of the light.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * // Double-click to turn on the point light.
 * 
 * let isLit = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A sphere drawn on a gray background. A red light starts shining from above when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Control the light.
 * if (isLit === true) {
 * // Add a red point light from above.
 * // Use RGB values and XYZ coordinates.
 * pointLight(255, 0, 0, 0, -150, 0);
 * }
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * 
 * // Turn on the point light when the user double-clicks.
 * function doubleClicked() {
 * isLit = true;
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
 * describe('A sphere drawn on a gray background. The top of the sphere appears bright red. The color gets darker toward the bottom.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a red point light from above.
 * // Use a p5.Color object and XYZ directions.
 * let c = color(255, 0, 0);
 * pointLight(c, 0, -150, 0);
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Draw the sphere.
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
 * describe('A sphere drawn on a gray background. The top of the sphere appears bright red. The color gets darker toward the bottom.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a red point light from above.
 * // Use a p5.Color object and a p5.Vector object.
 * let c = color(255, 0, 0);
 * let lightPos = createVector(0, -150, 0);
 * pointLight(c, lightPos);
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Draw the sphere.
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
 * describe('Four spheres arranged in a square and drawn on a gray background. The spheres appear bright red toward the center of the square. The color gets darker toward the corners of the square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Add a red point light that points to the center of the scene.
 * // Use a p5.Color object and a p5.Vector object.
 * let c = color(255, 0, 0);
 * let lightPos = createVector(0, 0, 65);
 * pointLight(c, lightPos);
 * 
 * // Style the spheres.
 * noStroke();
 * 
 * // Draw a sphere up and to the left.
 * push();
 * translate(-25, -25, 25);
 * sphere(10);
 * pop();
 * 
 * // Draw a box up and to the right.
 * push();
 * translate(25, -25, 25);
 * sphere(10);
 * pop();
 * 
 * // Draw a sphere down and to the left.
 * push();
 * translate(-25, 25, 25);
 * sphere(10);
 * pop();
 * 
 * // Draw a box down and to the right.
 * push();
 * translate(25, 25, 25);
 * sphere(10);
 * pop();
 * }
 * </code>
 * </div>
 */
function pointLight(v1: number, v2: number, v3: number, x: number, y: number, z: number): void;

/**
 * @param position of the light as a
 * <a href="#/p5.Vector">p5.Vector</a> object.
 */
function pointLight(v1: number, v2: number, v3: number, position: p5.Vector): void;

/**
 * @param color as a <a href="#/p5.Color">p5.Color</a> object,
 * an array of color values, or a CSS string.
 */
function pointLight(color: p5.Color | number[] | string, x: number, y: number, z: number): void;

/**
 */
function pointLight(color: p5.Color | number[] | string, position: p5.Vector): void;

/**
 * Creates an ambient light from an image.`imageLight()` simulates a light shining from all directions. The effect is
 * like placing the sketch at the center of a giant sphere that uses the image
 * as its texture. The image's diffuse light will be affected by
 * fill() and the specular reflections will be
 * affected by specularMaterial() and
 * shininess().The parameter, `img`, is the p5.Image object to
 * use as the light source.
 *
 * @param image to use as the light source.
 * @example <div class="notest">
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let img;
 * 
 * async function setup() {
 * // Load an image and create a p5.Image object.
 * img = await loadImage('assets/outdoor_spheremap.jpg');
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A sphere floating above a landscape. The surface of the sphere reflects the landscape.');
 * }
 * 
 * function draw() {
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Draw the image as a panorama (360˚ background).
 * panorama(img);
 * 
 * // Add a soft ambient light.
 * ambientLight(50);
 * 
 * // Add light from the image.
 * imageLight(img);
 * 
 * // Style the sphere.
 * specularMaterial(20);
 * shininess(100);
 * noStroke();
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * </code>
 * </div>
 */
function imageLight(img: p5.image): void;

/**
 * Creates an immersive 3D background.`panorama()` transforms images containing 360˚ content, such as maps or
 * HDRIs, into immersive 3D backgrounds that surround a sketch. Exploring the
 * space requires changing the camera's perspective with functions such as
 * orbitControl() or
 * camera().
 *
 * @param 360˚ image to use as the background.
 * @example <div class="notest">
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * let img;
 * 
 * async function setup() {
 * // Load an image and create a p5.Image object.
 * img = await loadImage('assets/outdoor_spheremap.jpg');
 * 
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A sphere floating above a landscape. The surface of the sphere reflects the landscape. The full landscape is viewable in 3D as the user drags the mouse.');
 * }
 * 
 * function draw() {
 * // Add the panorama.
 * panorama(img);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Use the image as a light source.
 * imageLight(img);
 * 
 * // Style the sphere.
 * noStroke();
 * specularMaterial(50);
 * shininess(200);
 * metalness(100);
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * </code>
 * </div>
 */
function panorama(img: p5.Image): void;

/**
 * Places an ambient and directional light in the scene.
 * The lights are set to ambientLight(128, 128, 128) and
 * directionalLight(128, 128, 128, 0, 0, -1).Note: lights need to be called (whether directly or indirectly)
 * within draw() to remain persistent in a looping program.
 * Placing them in setup() will cause them to only have an effect
 * the first time through the loop.
 *
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * // Double-click to turn on the lights.
 * 
 * let isLit = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white box drawn against a gray background. The quality of the light changes when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Control the lights.
 * if (isLit === true) {
 * lights();
 * }
 * 
 * // Draw the box.
 * box();
 * }
 * 
 * // Turn on the lights when the user double-clicks.
 * function doubleClicked() {
 * isLit = true;
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
 * describe('A white box drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Turn on the lights.
 * ambientLight(128, 128, 128);
 * directionalLight(128, 128, 128, 0, 0, -1);
 * 
 * // Draw the box.
 * box();
 * }
 * </code>
 * </div>
 */
function lights(): void;

/**
 * Sets the falloff rate for pointLight()
 * and spotLight().A light’s falloff describes the intensity of its beam at a distance. For
 * example, a lantern has a slow falloff, a flashlight has a medium falloff,
 * and a laser pointer has a sharp falloff.`lightFalloff()` has three parameters, `constant`, `linear`, and
 * `quadratic`. They’re numbers used to calculate falloff at a distance, `d`,
 * as follows:`falloff = 1 / (constant + d * linear + (d * d) * quadratic)`Note: `constant`, `linear`, and `quadratic` should always be set to values
 * greater than 0.
 *
 * @param constant value for calculating falloff.
 * @param linear value for calculating falloff.
 * @param quadratic value for calculating falloff.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * // Double-click to change the falloff rate.
 * 
 * let useFalloff = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A sphere drawn against a gray background. The intensity of the light changes when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(50);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Set the light falloff.
 * if (useFalloff === true) {
 * lightFalloff(2, 0, 0);
 * }
 * 
 * // Add a white point light from the front.
 * pointLight(255, 255, 255, 0, 0, 100);
 * 
 * // Style the sphere.
 * noStroke();
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * 
 * // Change the falloff value when the user double-clicks.
 * function doubleClicked() {
 * useFalloff = true;
 * }
 * </code>
 * </div>
 */
function lightFalloff(constant: number, linear: number, quadratic: number): void;

/**
 * Creates a light that shines from a point in one direction.Spot lights are like flashlights that shine in one direction creating a
 * cone of light. The shape of the cone can be controlled using the angle and
 * concentration parameters. A maximum of 5 spot lights can be active at once.There are eight ways to call `spotLight()` with parameters to set the
 * light’s color, position, direction. For example,
 * `spotLight(255, 0, 0, 0, 0, 0, 1, 0, 0)` creates a red `(255, 0, 0)` light
 * at the origin `(0, 0, 0)` that points to the right `(1, 0, 0)`.The `angle` parameter is optional. It sets the radius of the light cone.
 * For example, `spotLight(255, 0, 0, 0, 0, 0, 1, 0, 0, PI / 16)` creates a
 * red `(255, 0, 0)` light at the origin `(0, 0, 0)` that points to the right
 * `(1, 0, 0)` with an angle of `PI / 16` radians. By default, `angle` is
 * `PI / 3` radians.The `concentration` parameter is also optional. It focuses the light
 * towards the center of the light cone. For example,
 * `spotLight(255, 0, 0, 0, 0, 0, 1, 0, 0, PI / 16, 50)` creates a red
 * `(255, 0, 0)` light at the origin `(0, 0, 0)` that points to the right
 * `(1, 0, 0)` with an angle of `PI / 16` radians at concentration of 50. By
 * default, `concentration` is 100.
 *
 * @param red or hue value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param green or saturation value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param blue, brightness, or lightness value in the current
 * <a href="#/p5/colorMode">colorMode()</a>.
 * @param x-coordinate of the light.
 * @param y-coordinate of the light.
 * @param z-coordinate of the light.
 * @param x-component of light direction between -1 and 1.
 * @param y-component of light direction between -1 and 1.
 * @param z-component of light direction between -1 and 1.
 * @param angle of the light cone. Defaults to `PI / 3`.
 * @param concentration of the light. Defaults to 100.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * // Double-click to adjust the spotlight.
 * 
 * let isLit = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white sphere drawn on a gray background. A red spotlight starts shining when the user double-clicks.');
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
 * // Control the spotlight.
 * if (isLit === true) {
 * // Add a red spot light that shines into the screen.
 * // Set its angle to PI / 32 radians.
 * spotLight(255, 0, 0, 0, 0, 100, 0, 0, -1, PI / 32);
 * }
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * 
 * // Turn on the spotlight when the user double-clicks.
 * function doubleClicked() {
 * isLit = true;
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * // Double-click to adjust the spotlight.
 * 
 * let isLit = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white sphere drawn on a gray background. A red spotlight starts shining when the user double-clicks.');
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
 * // Control the spotlight.
 * if (isLit === true) {
 * // Add a red spot light that shines into the screen.
 * // Set its angle to PI / 3 radians (default).
 * // Set its concentration to 1000.
 * let c = color(255, 0, 0);
 * let position = createVector(0, 0, 100);
 * let direction = createVector(0, 0, -1);
 * spotLight(c, position, direction, PI / 3, 1000);
 * }
 * 
 * // Draw the sphere.
 * sphere(30);
 * }
 * 
 * // Turn on the spotlight when the user double-clicks.
 * function doubleClicked() {
 * isLit = true;
 * }
 * </code>
 * </div>
 */
function spotLight(v1: number, v2: number, v3: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, angle?: number, concentration?: number): void;

/**
 * @param color as a <a href="#/p5.Color">p5.Color</a> object,
 * an array of color values, or a CSS string.
 * @param position of the light as a <a href="#/p5.Vector">p5.Vector</a> object.
 * @param direction of light as a <a href="#/p5.Vector">p5.Vector</a> object.
 */
function spotLight(color: p5.Color | number[] | string, position: p5.Vector, direction: p5.Vector, angle?: number, concentration?: number): void;

/**
 */
function spotLight(v1: number, v2: number, v3: number, position: p5.Vector, direction: p5.Vector, angle?: number, concentration?: number): void;

/**
 */
function spotLight(color: p5.Color | number[] | string, x: number, y: number, z: number, direction: p5.Vector, angle?: number, concentration?: number): void;

/**
 */
function spotLight(color: p5.Color | number[] | string, position: p5.Vector, rx: number, ry: number, rz: number, angle?: number, concentration?: number): void;

/**
 */
function spotLight(v1: number, v2: number, v3: number, x: number, y: number, z: number, direction: p5.Vector, angle?: number, concentration?: number): void;

/**
 */
function spotLight(v1: number, v2: number, v3: number, position: p5.Vector, rx: number, ry: number, rz: number, angle?: number, concentration?: number): void;

/**
 */
function spotLight(color: p5.Color | number[] | string, x: number, y: number, z: number, rx: number, ry: number, rz: number, angle?: number, concentration?: number): void;

/**
 * Removes all lights from the sketch.Calling `noLights()` removes any lights created with
 * lights(),
 * ambientLight(),
 * directionalLight(),
 * pointLight(), or
 * spotLight(). These functions may be called
 * after `noLights()` to create a new lighting scheme.
 *
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('Two spheres drawn against a gray background. The top sphere is white and the bottom sphere is red.');
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
 * // Style the spheres.
 * noStroke();
 * 
 * // Draw the top sphere.
 * push();
 * translate(0, -25, 0);
 * sphere(20);
 * pop();
 * 
 * // Turn off the lights.
 * noLights();
 * 
 * // Add a red directional light that points into the screen.
 * directionalLight(255, 0, 0, 0, 0, -1);
 * 
 * // Draw the bottom sphere.
 * push();
 * translate(0, 25, 0);
 * sphere(20);
 * pop();
 * }
 * </code>
 * </div>
 */
function noLights(): void;

}

export default function light(p5: any, fn: any): void;
