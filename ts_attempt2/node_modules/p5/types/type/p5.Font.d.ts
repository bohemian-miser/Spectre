// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class Font {
  /**
   * Returns a flat array of path commands that describe the outlines of a string of text.Each command is represented as an array of the form `[type, ...coords]`, where:`'M'` indicates a "move to" (starting a new contour),
   * `'L'` a line segment,
   * `'Q'` a quadratic bezier,
   * `'C'` a cubic bezier, and
   * `'Z'` closes the current path.The first two parameters, `x` and `y`, specify the baseline origin for the text.
   * Optionally, you can provide a `width` and `height` for text wrapping; if you don't need
   * wrapping, you can omit them and directly pass `options` as the fourth parameter.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  textToPaths(str: string, x: number, y: number, width: number, height: number, options: object): Array[];

  /**
   * Returns an array of points outlining a string of text written using the
   * font.Each point object in the array has three properties that describe the
   * point's location and orientation, called its path angle. For example,
   * `{ x: 10, y: 20, alpha: 450 }`.The first parameter, `str`, is a string of text. The second and third
   * parameters, `x` and `y`, are the text's position. By default, they set the
   * coordinates of the bounding box's bottom-left corner. See
   * textAlign() for more ways to align text.The fourth parameter, `options`, is also optional. `font.textToPoints()`
   * expects an object with the following properties:`sampleFactor` is the ratio of the text's path length to the number of
   * samples. It defaults to 0.1. Higher values produce more points along the
   * path and are more precise.`simplifyThreshold` removes collinear points if it's set to a number other
   * than 0. The value represents the threshold angle to use when determining
   * whether two edges are collinear.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  textToPoints(str: string, x: number, y: number, width: any, height: any, options: object): object[];

  /**
   * Returns an array of arrays of points outlining a string of text written using the
   * font. Each array represents a contour, so the letter O will have two outer arrays:
   * one for the outer edge of the shape, and one for the inner edge of the hole.Each point object in a contour array has three properties that describe the
   * point's location and orientation, called its path angle. For example,
   * `{ x: 10, y: 20, alpha: 450 }`.The first parameter, `str`, is a string of text. The second and third
   * parameters, `x` and `y`, are the text's position. By default, they set the
   * coordinates of the bounding box's bottom-left corner. See
   * textAlign() for more ways to align text.The fourth parameter, `options`, is also optional. `font.textToPoints()`
   * expects an object with the following properties:`sampleFactor` is the ratio of the text's path length to the number of
   * samples. It defaults to 0.1. Higher values produce more points along the
   * path and are more precise.`simplifyThreshold` removes collinear points if it's set to a number other
   * than 0. The value represents the threshold angle to use when determining
   * whether two edges are collinear.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  textToContours(str: string, x: number, y: number, width: any, height: any, options: object): object[][];

  /**
   * Converts text into a 3D model that can be rendered in WebGL mode.This method transforms flat text into extruded 3D geometry, allowing
   * for dynamic effects like depth, warping, and custom shading.It works by taking the outlines (contours) of each character in the
   * provided text string and constructing a 3D shape from them.Once your 3D text is ready, you can rotate it in 3D space using orbitControl()
   * — just click and drag with your mouse to see it from all angles!Use the extrude slider to give your letters depth: slide it up, and your
   * flat text turns into a solid, multi-dimensional object.You can also choose from various fonts such as "Anton", "Montserrat", or "Source Serif",
   * much like selecting fancy fonts in a word processor,The generated model (a Geometry object) can be manipulated further—rotated, scaled,
   * or styled with shaders—to create engaging, interactive visual art.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  textToModel(str: string, x: number, y: number, width: number, height: number, options: object): p5.Geometry;

  }

/**
 * Returns a flat array of path commands that describe the outlines of a string of text.Each command is represented as an array of the form `[type, ...coords]`, where:`'M'` indicates a "move to" (starting a new contour),
 * `'L'` a line segment,
 * `'Q'` a quadratic bezier,
 * `'C'` a cubic bezier, and
 * `'Z'` closes the current path.The first two parameters, `x` and `y`, specify the baseline origin for the text.
 * Optionally, you can provide a `width` and `height` for text wrapping; if you don't need
 * wrapping, you can omit them and directly pass `options` as the fourth parameter.
 *
 * @param The text to convert into path commands.
 * @param x‐coordinate of the text baseline.
 * @param y‐coordinate of the text baseline.
 * @param Optional width for text wrapping.
 * @param Optional height for text wrapping.
 * @param Configuration object for rendering text.
 * @return A flat array of path commands.
 * @example <div>
 * <code>
 * let font;
 * 
 * async function setup() {
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(200, 200);
 * background(220);
 * noLoop();
 * }
 * 
 * function draw() {
 * background(220);
 * stroke(0);
 * noFill();
 * textSize(60);
 * 
 * // Get path commands for "Hello" (drawn at baseline x=50, y=100):
 * const pathCommands = font.textToPaths('Hello', 30, 110);
 * 
 * beginShape();
 * for (let i = 0; i < pathCommands.length; i++) {
 * const cmd = pathCommands[i];
 * const type = cmd[0];
 * 
 * switch (type) {
 * case 'M': {
 * // Move to (start a new contour)
 * const x = cmd[1];
 * const y = cmd[2];
 * endContour(); // In case we were already drawing
 * beginContour();
 * vertex(x, y);
 * break;
 * }
 * case 'L': {
 * // Line to
 * const x = cmd[1];
 * const y = cmd[2];
 * vertex(x, y);
 * break;
 * }
 * case 'Q': {
 * // Quadratic bezier
 * const cx = cmd[1];
 * const cy = cmd[2];
 * const x = cmd[3];
 * const y = cmd[4];
 * bezierOrder(2);
 * bezierVertex(cx, cy);
 * bezierVertex(x, y);
 * break;
 * }
 * case 'C': {
 * // Cubic bezier
 * const cx1 = cmd[1];
 * const cy1 = cmd[2];
 * const cx2 = cmd[3];
 * const cy2 = cmd[4];
 * const x = cmd[5];
 * const y = cmd[6];
 * bezierOrder(3);
 * bezierVertex(cx1, cy1);
 * bezierVertex(cx2, cy2);
 * bezierVertex(x, y);
 * break;
 * }
 * case 'Z': {
 * // Close path
 * endContour(CLOSE);
 * beginContour();
 * break;
 * }
 * }
 * }
 * endContour();
 * endShape();
 * }
 * </code>
 * </div>
 */
function textToPaths(str: string, x: number, y: number, width?: number, height?: number, options?: object): Array[];

/**
 * Returns an array of points outlining a string of text written using the
 * font.Each point object in the array has three properties that describe the
 * point's location and orientation, called its path angle. For example,
 * `{ x: 10, y: 20, alpha: 450 }`.The first parameter, `str`, is a string of text. The second and third
 * parameters, `x` and `y`, are the text's position. By default, they set the
 * coordinates of the bounding box's bottom-left corner. See
 * textAlign() for more ways to align text.The fourth parameter, `options`, is also optional. `font.textToPoints()`
 * expects an object with the following properties:`sampleFactor` is the ratio of the text's path length to the number of
 * samples. It defaults to 0.1. Higher values produce more points along the
 * path and are more precise.`simplifyThreshold` removes collinear points if it's set to a number other
 * than 0. The value represents the threshold angle to use when determining
 * whether two edges are collinear.
 *
 * @param string of text.
 * @param x-coordinate of the text.
 * @param y-coordinate of the text.
 * @param object with sampleFactor and simplifyThreshold
 * properties.
 * @return array of point objects, each with `x`, `y`, and `alpha` (path angle) properties.
 * @example <div>
 * <code>
 * let font;
 * 
 * async function setup() {
 * createCanvas(100, 100);
 * font = await loadFont('assets/inconsolata.otf');
 * 
 * background(200);
 * textSize(35);
 * 
 * // Get the point array.
 * let points = font.textToPoints('p5*js', 6, 60, { sampleFactor: 0.5 });
 * 
 * // Draw a dot at each point.
 * for (let p of points) {
 * point(p.x, p.y);
 * }
 * 
 * describe('A set of black dots outlining the text "p5*js" on a gray background.');
 * }
 * </code>
 * </div>
 */
function textToPoints(str: string, x: number, y: number, width: any, height: any, options?: object): object[];

/**
 * Returns an array of arrays of points outlining a string of text written using the
 * font. Each array represents a contour, so the letter O will have two outer arrays:
 * one for the outer edge of the shape, and one for the inner edge of the hole.Each point object in a contour array has three properties that describe the
 * point's location and orientation, called its path angle. For example,
 * `{ x: 10, y: 20, alpha: 450 }`.The first parameter, `str`, is a string of text. The second and third
 * parameters, `x` and `y`, are the text's position. By default, they set the
 * coordinates of the bounding box's bottom-left corner. See
 * textAlign() for more ways to align text.The fourth parameter, `options`, is also optional. `font.textToPoints()`
 * expects an object with the following properties:`sampleFactor` is the ratio of the text's path length to the number of
 * samples. It defaults to 0.1. Higher values produce more points along the
 * path and are more precise.`simplifyThreshold` removes collinear points if it's set to a number other
 * than 0. The value represents the threshold angle to use when determining
 * whether two edges are collinear.
 *
 * @param string of text.
 * @param x-coordinate of the text.
 * @param y-coordinate of the text.
 * @param object with sampleFactor and simplifyThreshold
 * properties.
 * @return array of point objects, each with `x`, `y`, and `alpha` (path angle) properties.
 * @example <div>
 * <code>
 * let font;
 * 
 * async function setup() {
 * createCanvas(100, 100);
 * font = await loadFont('/assets/inconsolata.otf');
 * }
 * 
 * function draw() {
 * background(200);
 * textAlign(CENTER, CENTER);
 * textSize(30);
 * 
 * // Get the point array.
 * let contours = font.textToContours('p5*js', width/2, height/2, { sampleFactor: 0.5 });
 * 
 * beginShape();
 * for (const pts of contours) {
 * beginContour();
 * for (const pt of pts) {
 * vertex(pt.x + 5*sin(pt.y*0.1 + millis()*0.01), pt.y);
 * }
 * endContour(CLOSE);
 * }
 * endShape();
 * 
 * describe('The text p5*js wobbling over time');
 * }
 * </code>
 * </div>
 */
function textToContours(str: string, x: number, y: number, width: any, height: any, options?: object): object[][];

/**
 * Converts text into a 3D model that can be rendered in WebGL mode.This method transforms flat text into extruded 3D geometry, allowing
 * for dynamic effects like depth, warping, and custom shading.It works by taking the outlines (contours) of each character in the
 * provided text string and constructing a 3D shape from them.Once your 3D text is ready, you can rotate it in 3D space using orbitControl()
 * — just click and drag with your mouse to see it from all angles!Use the extrude slider to give your letters depth: slide it up, and your
 * flat text turns into a solid, multi-dimensional object.You can also choose from various fonts such as "Anton", "Montserrat", or "Source Serif",
 * much like selecting fancy fonts in a word processor,The generated model (a Geometry object) can be manipulated further—rotated, scaled,
 * or styled with shaders—to create engaging, interactive visual art.
 *
 * @param The text string to convert into a 3D model.
 * @param The x-coordinate for the starting position of the text.
 * @param The y-coordinate for the starting position of the text.
 * @param Maximum width of the text block (wraps text if exceeded).
 * @param Maximum height of the text block.
 * @param Configuration options for the 3D text:
 * @param The depth to extrude the text. A value of 0 produces
 * flat text; higher values create thicker, 3D models.
 * @param A factor controlling the level of detail for the text contours.
 * Higher values result in smoother curves.
 * @return A geometry object representing the 3D model of the text.
 * @example <div modernizr='webgl'>
 * <code>
 * let font;
 * let geom;
 * 
 * async function setup() {
 * createCanvas(200, 200, WEBGL);
 * font = await loadFont('https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm0K08i4gS7lu.ttf');
 * 
 * geom = font.textToModel("Hello", 50, 0, { sampleFactor: 2 });
 * geom.clearColors();
 * geom.normalize();
 * }
 * 
 * function draw() {
 * background(255);
 * orbitControl();
 * fill("red");
 * strokeWeight(4);
 * scale(min(width, height) / 300);
 * model(geom);
 * describe('A red non-extruded "Hello" in Anton on white canvas, rotatable via mouse.');
 * }
 * </code>
 * </div>
 * @example <div modernizr='webgl'>
 * <code>
 * let font;
 * let geom;
 * 
 * async function setup() {
 * createCanvas(200, 200, WEBGL);
 * 
 * // Alternative fonts:
 * // Anton: 'https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm0K08i4gS7lu.ttf'
 * // Montserrat: 'https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-Y3tcoqK5.ttf'
 * // Source Serif: 'https://fonts.gstatic.com/s/sourceserif4/v8/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjihdqrhxXD-wGvjU.ttf'
 * 
 * // Using Source Serif for this example:
 * font = await loadFont('https://fonts.gstatic.com/s/sourceserif4/v8/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjihdqrhxXD-wGvjU.ttf');
 * 
 * geom = font.textToModel("Hello", 50, 0, { sampleFactor: 2, extrude: 5 });
 * geom.clearColors();
 * geom.normalize();
 * }
 * 
 * function draw() {
 * background(255);
 * orbitControl();
 * fill("red");
 * strokeWeight(4);
 * scale(min(width, height) / 300);
 * model(geom);
 * describe('3D red extruded "Hello" in Source Serif on white, rotatable via mouse.');
 * }
 * </code>
 * </div>
 * @example <div modernizr='webgl'>
 * <code>
 * let geom;
 * let activeFont;
 * let artShader;
 * let lineShader;
 * 
 * // Define parameters as simple variables
 * let words = 'HELLO';
 * let warp = 1;
 * let extrude = 5;
 * let palette = ["#ffe03d", "#fe4830", "#d33033", "#6d358a", "#1c509e", "#00953c"];
 * 
 * async function setup() {
 * createCanvas(200, 200, WEBGL);
 * 
 * // Using Anton as the default font for this example:
 * 
 * // Alternative fonts:
 * // Anton: 'https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm0K08i4gS7lu.ttf'
 * // Montserrat: 'https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-Y3tcoqK5.ttf'
 * // Source Serif: 'https://fonts.gstatic.com/s/sourceserif4/v8/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjihdqrhxXD-wGvjU.ttf'
 * activeFont = await loadFont('https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm0K08i4gS7lu.ttf');
 * 
 * geom = activeFont.textToModel(words, 0, 50, { sampleFactor: 2, extrude });
 * geom.clearColors();
 * geom.normalize();
 * 
 * artShader = baseMaterialShader().modify({
 * uniforms: {
 * 'float time': () => millis(),
 * 'float warp': () => warp,
 * 'float numColors': () => palette.length,
 * 'vec3[6] colors': () => palette.flatMap((c) => [red(c)/255, green(c)/255, blue(c)/255]),
 * },
 * vertexDeclarations: 'out vec3 vPos;',
 * fragmentDeclarations: 'in vec3 vPos;',
 * 'Vertex getObjectInputs': `(Vertex inputs) {
 * vPos = inputs.position;
 * inputs.position.x += 5. * warp * sin(inputs.position.y * 0.1 + time * 0.001) / (1. + warp);
 * inputs.position.y += 5. * warp * sin(inputs.position.x * 0.1 + time * 0.0009) / (1. + warp);
 * return inputs;
 * }`,
 * 'vec4 getFinalColor': `(vec4 _c) {
 * float x = vPos.x * 0.005;
 * float a = floor(fract(x) * numColors);
 * float b = a == numColors - 1. ? 0. : a + 1.;
 * float t = fract(x * numColors);
 * vec3 c = mix(colors[int(a)], colors[int(b)], t);
 * return vec4(c, 1.);
 * }`
 * });
 * 
 * lineShader = baseStrokeShader().modify({
 * uniforms: {
 * 'float time': () => millis(),
 * 'float warp': () => warp,
 * },
 * 'StrokeVertex getObjectInputs': `(StrokeVertex inputs) {
 * inputs.position.x += 5. * warp * sin(inputs.position.y * 0.1 + time * 0.001) / (1. + warp);
 * inputs.position.y += 5. * warp * sin(inputs.position.x * 0.1 + time * 0.0009) / (1. + warp);
 * return inputs;
 * }`,
 * });
 * }
 * 
 * function draw() {
 * background(255);
 * orbitControl();
 * shader(artShader);
 * strokeShader(lineShader);
 * strokeWeight(4);
 * scale(min(width, height) / 210);
 * model(geom);
 * describe('3D wavy with different color sets "Hello" in Anton on white canvas, rotatable via mouse.');
 * }
 * </code>
 * </div>
 */
function textToModel(str: string, x: number, y: number, width: number, height: number, options?: object): p5.Geometry;

/**
 * Loads a font and creates a p5.Font object.
 * `loadFont()` can load fonts in either .otf or .ttf format. Loaded fonts can
 * be used to style text on the canvas and in HTML elements.The first parameter, `path`, is the path to a font file.
 * Paths to local files should be relative. For example,
 * `'assets/inconsolata.otf'`. The Inconsolata font used in the following
 * examples can be downloaded for free
 * here.
 * Paths to remote files should be URLs. For example,
 * `'https://example.com/inconsolata.otf'`. URLs may be blocked due to browser
 * security.In 2D mode, `path` can take on a few other forms. It could be a path to a CSS file,
 * such as one from Google Fonts. It could also
 * be a string with a CSS `@font-face` declaration.The second parameter, `successCallback`, is optional. If a function is
 * passed, it will be called once the font has loaded. The callback function
 * may use the new p5.Font object if needed.The third parameter, `failureCallback`, is also optional. If a function is
 * passed, it will be called if the font fails to load. The callback function
 * may use the error
 * Event
 * object if needed.Fonts can take time to load. `await` the result of `loadFont()` in
 * setup() before using the result.
 *
 * @for p5
 * @param path of the font or CSS file to be loaded, or a CSS `@font-face` string.
 * @param An alias that can be used for this font in `textFont()`. Defaults to the name in the font's metadata.
 * @param An optional object with extra CSS font face descriptors, or p5.js font settings.
 * @param (Experimental) An optional string of list of strings with Unicode character set names that should be included. When a CSS file is used as the font, it may contain multiple font files. The font best matching the requested character sets will be picked.
 * @param function called with the
 * <a href="#/p5.Font">p5.Font</a> object after it
 * loads.
 * @param function called with the error
 * <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event" target="_blank">Event</a>
 * object if the font fails to load.
 * @return <a href="#/p5.Font">p5.Font</a> object.
 * @example <div>
 * <code>
 * let font;
 * 
 * async function setup() {
 * createCanvas(100, 100);
 * font = await loadFont('assets/inconsolata.otf');
 * fill('deeppink');
 * textFont(font);
 * textSize(36);
 * text('p5*js', 10, 50);
 * 
 * describe('The text "p5*js" written in pink on a white background.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * loadFont('assets/inconsolata.otf', font => {
 * fill('deeppink');
 * textFont(font);
 * textSize(36);
 * text('p5*js', 10, 50);
 * 
 * describe('The text "p5*js" written in pink on a white background.');
 * });
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * loadFont('assets/inconsolata.otf', success, failure);
 * }
 * 
 * function success(font) {
 * fill('deeppink');
 * textFont(font);
 * textSize(36);
 * text('p5*js', 10, 50);
 * 
 * describe('The text "p5*js" written in pink on a white background.');
 * }
 * 
 * function failure(event) {
 * console.error('Oops!', event);
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * async function setup() {
 * createCanvas(100, 100);
 * await loadFont('assets/inconsolata.otf');
 * let p = createP('p5*js');
 * p.style('color', 'deeppink');
 * p.style('font-family', 'Inconsolata');
 * p.style('font-size', '36px');
 * p.position(10, 50);
 * 
 * describe('The text "p5*js" written in pink on a white background.');
 * }
 * </code>
 * </div>
 * @example <div class="norender">
 * <code>
 * // Some other forms of loading fonts:
 * loadFont("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap");
 * loadFont(`@font-face { font-family: "Bricolage Grotesque", serif; font-optical-sizing: auto; font-weight: 400; font-style: normal; font-variation-settings: "wdth" 100; }`);
 * </code>
 * </div>
 */
function loadFont(path: string, name?: string, options?: object, successCallback?: Function, failureCallback?: Function): Promise<p5.Font>;

/**
 * @for p5
 * @param path of the font to be loaded.
 * @param function called with the
 * <a href="#/p5.Font">p5.Font</a> object after it
 * loads.
 * @param function called with the error
 * <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event" target="_blank">Event</a>
 * object if the font fails to load.
 * @returns The font.
 */
function loadFont(path: string, successCallback?: Function, failureCallback?: Function): Promise<p5.Font>;

}

export default function p5_Font(p5: any, fn: any): void;
