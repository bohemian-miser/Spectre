// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';
import { Vector } from '../math/p5.Vector';

declare module 'p5' {
  class Shader {
    constructor(renderer: p5.RendererGL, vertSrc: string, fragSrc: string, options?: object);

  /**
   * Shaders are written in GLSL, but
   * there are different versions of GLSL that it might be written in.Calling this method on a `p5.Shader` will return the GLSL version it uses, either `100 es` or `300 es`.
   * WebGL 1 shaders will only use `100 es`, and WebGL 2 shaders may use either.
   */
  version(): string;

  /**
   * Logs the hooks available in this shader, and their current implementation.Each shader may let you override bits of its behavior. Each bit is called
   * a  A hook is either for the  shader, if it affects the
   * position of vertices, or in the  shader, if it affects the pixel
   * color. This method logs those values to the console, letting you know what
   * you are able to use in a call to
   * `modify()`.For example, this shader will produce the following output:`myShader = baseMaterialShader().modify({
   * declarations: 'uniform float time;',
   * 'vec3 getWorldPosition': `(vec3 pos) {
   * pos.y += 20. * sin(time * 0.001 + pos.x * 0.05);
   * return pos;
   * }`
   * });
   * myShader.inspectHooks();``==== Vertex shader hooks: ====
   * void beforeVertex() {}
   * vec3 getLocalPosition(vec3 position) { return position; }
   * [MODIFIED] vec3 getWorldPosition(vec3 pos) {
   * pos.y += 20. * sin(time * 0.001 + pos.x * 0.05);
   * return pos;
   * }
   * vec3 getLocalNormal(vec3 normal) { return normal; }
   * vec3 getWorldNormal(vec3 normal) { return normal; }
   * vec2 getUV(vec2 uv) { return uv; }
   * vec4 getVertexColor(vec4 color) { return color; }
   * void afterVertex() {}
   * 
   * ==== Fragment shader hooks: ====
   * void beforeFragment() {}
   * Inputs getPixelInputs(Inputs inputs) { return inputs; }
   * vec4 combineColors(ColorComponents components) {
   * vec4 color = vec4(0.);
   * color.rgb += components.diffuse * components.baseColor;
   * color.rgb += components.ambient * components.ambientColor;
   * color.rgb += components.specular * components.specularColor;
   * color.rgb += components.emissive;
   * color.a = components.opacity;
   * return color;
   * }
   * vec4 getFinalColor(vec4 color) { return color; }
   * void afterFragment() {}`
   */
  inspectHooks(): void;

  /**
   * Returns a new shader, based on the original, but with custom snippets
   * of shader code replacing default behaviour.Each shader may let you override bits of its behavior. Each bit is called
   * a  For example, a hook can let you adjust positions of vertices, or
   * the color of a pixel. You can inspect the different hooks available by calling
   * `yourShader.inspectHooks()`. You can
   * also read the reference for the default material, normal material, color, line, and point shaders to
   * see what hooks they have available.`modify()` can be passed a function as a parameter. Inside, you can override hooks
   * by calling them as functions. Each hook will take in a callback that takes in inputs
   * and is expected to return an output. For example, here is a function that changes the
   * material color to red:`let myShader;
   * 
   * function setup() {
   * createCanvas(200, 200, WEBGL);
   * myShader = baseMaterialShader().modify(() => {
   * getPixelInputs((inputs) => {
   * inputs.color = [inputs.texCoord, 0, 1];
   * return inputs;
   * });
   * });
   * }
   * 
   * function draw() {
   * background(255);
   * noStroke();
   * shader(myShader); // Apply the custom shader
   * plane(width, height); // Draw a plane with the shader applied
   * }`In addition to calling hooks, you can create uniforms, which are special variables
   * used to pass data from p5.js into the shader. They can be created by calling `uniform` + the
   * type of the data, such as `uniformFloat` for a number of `uniformVector2` for a two-component vector.
   * They take in a function that returns the data for the variable. You can then reference these
   * variables in your hooks, and their values will update every time you apply
   * the shader with the result of your function.`let myShader;
   * 
   * function setup() {
   * createCanvas(200, 200, WEBGL);
   * myShader = baseMaterialShader().modify(() => {
   * // Get the current time from p5.js
   * let t = uniformFloat(() => millis());
   * 
   * getPixelInputs((inputs) => {
   * inputs.color = [
   * inputs.texCoord,
   * sin(t * 0.01) / 2 + 0.5,
   * 1,
   * ];
   * return inputs;
   * });
   * });
   * }
   * 
   * function draw() {
   * background(255);
   * noStroke(255);
   * shader(myShader); // Apply the custom shader
   * plane(width, height); // Draw a plane with the shader applied
   * }`p5.strands functions are special, since they get turned into a shader instead of being
   * run like the rest of your code. They only have access to p5.js functions, and variables
   * you declare inside the `modify` callback. If you need access to local variables, you
   * can pass them into `modify` with an optional second parameter, `variables`. If you are
   * using instance mode, you will need to pass your sketch object in this way.`new p5((sketch) => {
   * let myShader;
   * 
   * sketch.setup = function() {
   * sketch.createCanvas(200, 200, sketch.WEBGL);
   * myShader = sketch.baseMaterialShader().modify(() => {
   * sketch.getPixelInputs((inputs) => {
   * inputs.color = [inputs.texCoord, 0, 1];
   * return inputs;
   * });
   * }, { sketch });
   * }
   * 
   * sketch.draw = function() {
   * sketch.background(255);
   * sketch.noStroke();
   * sketch.shader(myShader); // Apply the custom shader
   * sketch.plane(sketch.width, sketch.height); // Draw a plane with the shader applied
   * }
   * });`You can also write GLSL directly in `modify` if you need direct access. To do so,
   * `modify()` takes one parameter, `hooks`, an object with the hooks you want
   * to override. Each key of the `hooks` object is the name
   * of a hook, and the value is a string with the GLSL code for your hook.If you supply functions that aren't existing hooks, they will get added at the start of
   * the shader as helper functions so that you can use them in your hooks.To add new uniforms to your shader, you can pass in a `uniforms` object containing
   * the type and name of the uniform as the key, and a default value or function returning
   * a default value as its value. These will be automatically set when the shader is set
   * with `shader(yourShader)`.`let myShader;
   * 
   * function setup() {
   * createCanvas(200, 200, WEBGL);
   * myShader = baseMaterialShader().modify({
   * uniforms: {
   * 'float time': () => millis() // Uniform for time
   * },
   * 'Vertex getWorldInputs': `(Vertex inputs) {
   * inputs.position.y +=
   * 20. * sin(time * 0.001 + inputs.position.x * 0.05);
   * return inputs;
   * }`
   * });
   * }
   * 
   * function draw() {
   * background(255);
   * shader(myShader); // Apply the custom shader
   * lights();         // Enable lighting
   * noStroke();       // Disable stroke
   * fill('red');      // Set fill color to red
   * sphere(50);       // Draw a sphere with the shader applied
   * }`You can also add a `declarations` key, where the value is a GLSL string declaring
   * custom uniform variables, globals, and functions shared
   * between hooks. To add declarations just in a vertex or fragment shader, add
   * `vertexDeclarations` and `fragmentDeclarations` keys.`let myShader;
   * 
   * function setup() {
   * createCanvas(200, 200, WEBGL);
   * myShader = baseMaterialShader().modify({
   * // Manually specifying a uniform
   * declarations: 'uniform float time;',
   * 'Vertex getWorldInputs': `(Vertex inputs) {
   * inputs.position.y +=
   * 20. * sin(time * 0.001 + inputs.position.x * 0.05);
   * return inputs;
   * }`
   * });
   * }
   * 
   * function draw() {
   * background(255);
   * shader(myShader);
   * myShader.setUniform('time', millis());
   * lights();
   * noStroke();
   * fill('red');
   * sphere(50);
   * }`
 *
   * @param
   * @param
   * @param
   */
  modify(hooks: any, callback: Function, variables: object): p5.Shader;

  modify(hooks: object): p5.Shader;

  /**
   * Copies the shader from one drawing context to another.Each `p5.Shader` object must be compiled by calling
   * shader() before it can run. Compilation happens
   * in a drawing context which is usually the main canvas or an instance of
   * p5.Graphics. A shader can only be used in the
   * context where it was compiled. The `copyToContext()` method compiles the
   * shader again and copies it to another drawing context where it can be
   * reused.The parameter, `context`, is the drawing context where the shader will be
   * used. The shader can be copied to an instance of
   * p5.Graphics, as in
   * `myShader.copyToContext(pg)`. The shader can also be copied from a
   * p5.Graphics object to the main canvas using
   * the `p5.instance` variable, as in `myShader.copyToContext(p5.instance)`.Note: A p5.Shader object created with
   * createShader(),
   * createFilterShader(), or
   * loadShader()
   * can be used directly with a p5.Framebuffer
   * object created with
   * createFramebuffer(). Both objects
   * have the same context as the main canvas.
 *
   * @param
   */
  copyToContext(context: p5 | p5.Graphics): p5.Shader;

  /**
   * Sets the shader’s uniform (global) variables.Shader programs run on the computer’s graphics processing unit (GPU).
   * They live in part of the computer’s memory that’s completely separate
   * from the sketch that runs them. Uniforms are global variables within a
   * shader program. They provide a way to pass values from a sketch running
   * on the CPU to a shader program running on the GPU.The first parameter, `uniformName`, is a string with the uniform’s name.
   * For the shader above, `uniformName` would be `'r'`.The second parameter, `data`, is the value that should be used to set the
   * uniform. For example, calling `myShader.setUniform('r', 0.5)` would set
   * the `r` uniform in the shader above to `0.5`. data should match the
   * uniform’s type. Numbers, strings, booleans, arrays, and many types of
   * images can all be passed to a shader with `setUniform()`.
 *
   * @param
   * @param
   */
  setUniform(uniformName: string, data: boolean | number | number[] | p5.Image | p5.Graphics | p5.MediaElement | p5.Texture): void;

  }

/**
 * Shaders are written in GLSL, but
 * there are different versions of GLSL that it might be written in.Calling this method on a `p5.Shader` will return the GLSL version it uses, either `100 es` or `300 es`.
 * WebGL 1 shaders will only use `100 es`, and WebGL 2 shaders may use either.
 *
 * @returns The GLSL version used by the shader.
 */
function version(): string;

/**
 * Logs the hooks available in this shader, and their current implementation.Each shader may let you override bits of its behavior. Each bit is called
 * a  A hook is either for the  shader, if it affects the
 * position of vertices, or in the  shader, if it affects the pixel
 * color. This method logs those values to the console, letting you know what
 * you are able to use in a call to
 * `modify()`.For example, this shader will produce the following output:`myShader = baseMaterialShader().modify({
 * declarations: 'uniform float time;',
 * 'vec3 getWorldPosition': `(vec3 pos) {
 * pos.y += 20. * sin(time * 0.001 + pos.x * 0.05);
 * return pos;
 * }`
 * });
 * myShader.inspectHooks();``==== Vertex shader hooks: ====
 * void beforeVertex() {}
 * vec3 getLocalPosition(vec3 position) { return position; }
 * [MODIFIED] vec3 getWorldPosition(vec3 pos) {
 * pos.y += 20. * sin(time * 0.001 + pos.x * 0.05);
 * return pos;
 * }
 * vec3 getLocalNormal(vec3 normal) { return normal; }
 * vec3 getWorldNormal(vec3 normal) { return normal; }
 * vec2 getUV(vec2 uv) { return uv; }
 * vec4 getVertexColor(vec4 color) { return color; }
 * void afterVertex() {}
 * 
 * ==== Fragment shader hooks: ====
 * void beforeFragment() {}
 * Inputs getPixelInputs(Inputs inputs) { return inputs; }
 * vec4 combineColors(ColorComponents components) {
 * vec4 color = vec4(0.);
 * color.rgb += components.diffuse * components.baseColor;
 * color.rgb += components.ambient * components.ambientColor;
 * color.rgb += components.specular * components.specularColor;
 * color.rgb += components.emissive;
 * color.a = components.opacity;
 * return color;
 * }
 * vec4 getFinalColor(vec4 color) { return color; }
 * void afterFragment() {}`
 *
 */
function inspectHooks(): void;

/**
 * Returns a new shader, based on the original, but with custom snippets
 * of shader code replacing default behaviour.Each shader may let you override bits of its behavior. Each bit is called
 * a  For example, a hook can let you adjust positions of vertices, or
 * the color of a pixel. You can inspect the different hooks available by calling
 * `yourShader.inspectHooks()`. You can
 * also read the reference for the default material, normal material, color, line, and point shaders to
 * see what hooks they have available.`modify()` can be passed a function as a parameter. Inside, you can override hooks
 * by calling them as functions. Each hook will take in a callback that takes in inputs
 * and is expected to return an output. For example, here is a function that changes the
 * material color to red:`let myShader;
 * 
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * myShader = baseMaterialShader().modify(() => {
 * getPixelInputs((inputs) => {
 * inputs.color = [inputs.texCoord, 0, 1];
 * return inputs;
 * });
 * });
 * }
 * 
 * function draw() {
 * background(255);
 * noStroke();
 * shader(myShader); // Apply the custom shader
 * plane(width, height); // Draw a plane with the shader applied
 * }`In addition to calling hooks, you can create uniforms, which are special variables
 * used to pass data from p5.js into the shader. They can be created by calling `uniform` + the
 * type of the data, such as `uniformFloat` for a number of `uniformVector2` for a two-component vector.
 * They take in a function that returns the data for the variable. You can then reference these
 * variables in your hooks, and their values will update every time you apply
 * the shader with the result of your function.`let myShader;
 * 
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * myShader = baseMaterialShader().modify(() => {
 * // Get the current time from p5.js
 * let t = uniformFloat(() => millis());
 * 
 * getPixelInputs((inputs) => {
 * inputs.color = [
 * inputs.texCoord,
 * sin(t * 0.01) / 2 + 0.5,
 * 1,
 * ];
 * return inputs;
 * });
 * });
 * }
 * 
 * function draw() {
 * background(255);
 * noStroke(255);
 * shader(myShader); // Apply the custom shader
 * plane(width, height); // Draw a plane with the shader applied
 * }`p5.strands functions are special, since they get turned into a shader instead of being
 * run like the rest of your code. They only have access to p5.js functions, and variables
 * you declare inside the `modify` callback. If you need access to local variables, you
 * can pass them into `modify` with an optional second parameter, `variables`. If you are
 * using instance mode, you will need to pass your sketch object in this way.`new p5((sketch) => {
 * let myShader;
 * 
 * sketch.setup = function() {
 * sketch.createCanvas(200, 200, sketch.WEBGL);
 * myShader = sketch.baseMaterialShader().modify(() => {
 * sketch.getPixelInputs((inputs) => {
 * inputs.color = [inputs.texCoord, 0, 1];
 * return inputs;
 * });
 * }, { sketch });
 * }
 * 
 * sketch.draw = function() {
 * sketch.background(255);
 * sketch.noStroke();
 * sketch.shader(myShader); // Apply the custom shader
 * sketch.plane(sketch.width, sketch.height); // Draw a plane with the shader applied
 * }
 * });`You can also write GLSL directly in `modify` if you need direct access. To do so,
 * `modify()` takes one parameter, `hooks`, an object with the hooks you want
 * to override. Each key of the `hooks` object is the name
 * of a hook, and the value is a string with the GLSL code for your hook.If you supply functions that aren't existing hooks, they will get added at the start of
 * the shader as helper functions so that you can use them in your hooks.To add new uniforms to your shader, you can pass in a `uniforms` object containing
 * the type and name of the uniform as the key, and a default value or function returning
 * a default value as its value. These will be automatically set when the shader is set
 * with `shader(yourShader)`.`let myShader;
 * 
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * myShader = baseMaterialShader().modify({
 * uniforms: {
 * 'float time': () => millis() // Uniform for time
 * },
 * 'Vertex getWorldInputs': `(Vertex inputs) {
 * inputs.position.y +=
 * 20. * sin(time * 0.001 + inputs.position.x * 0.05);
 * return inputs;
 * }`
 * });
 * }
 * 
 * function draw() {
 * background(255);
 * shader(myShader); // Apply the custom shader
 * lights();         // Enable lighting
 * noStroke();       // Disable stroke
 * fill('red');      // Set fill color to red
 * sphere(50);       // Draw a sphere with the shader applied
 * }`You can also add a `declarations` key, where the value is a GLSL string declaring
 * custom uniform variables, globals, and functions shared
 * between hooks. To add declarations just in a vertex or fragment shader, add
 * `vertexDeclarations` and `fragmentDeclarations` keys.`let myShader;
 * 
 * function setup() {
 * createCanvas(200, 200, WEBGL);
 * myShader = baseMaterialShader().modify({
 * // Manually specifying a uniform
 * declarations: 'uniform float time;',
 * 'Vertex getWorldInputs': `(Vertex inputs) {
 * inputs.position.y +=
 * 20. * sin(time * 0.001 + inputs.position.x * 0.05);
 * return inputs;
 * }`
 * });
 * }
 * 
 * function draw() {
 * background(255);
 * shader(myShader);
 * myShader.setUniform('time', millis());
 * lights();
 * noStroke();
 * fill('red');
 * sphere(50);
 * }`
 *
 * @param A function with p5.strands code to modify the shader.
 * @param An optional object with local variables p5.strands
 * should have access to.
 */
function modify(hooks: any, callback: Function, variables?: object): p5.Shader;

/**
 * @param The hooks in the shader to replace.
 */
function modify(hooks?: object): p5.Shader;

/**
 * Copies the shader from one drawing context to another.Each `p5.Shader` object must be compiled by calling
 * shader() before it can run. Compilation happens
 * in a drawing context which is usually the main canvas or an instance of
 * p5.Graphics. A shader can only be used in the
 * context where it was compiled. The `copyToContext()` method compiles the
 * shader again and copies it to another drawing context where it can be
 * reused.The parameter, `context`, is the drawing context where the shader will be
 * used. The shader can be copied to an instance of
 * p5.Graphics, as in
 * `myShader.copyToContext(pg)`. The shader can also be copied from a
 * p5.Graphics object to the main canvas using
 * the `p5.instance` variable, as in `myShader.copyToContext(p5.instance)`.Note: A p5.Shader object created with
 * createShader(),
 * createFilterShader(), or
 * loadShader()
 * can be used directly with a p5.Framebuffer
 * object created with
 * createFramebuffer(). Both objects
 * have the same context as the main canvas.
 *
 * @param WebGL context for the copied shader.
 * @returns new shader compiled for the target context.
 * @example <div>
 * <code>
 * // Note: A "uniform" is a global variable within a shader program.
 * 
 * // Create a string with the vertex shader program.
 * // The vertex shader is called for each vertex.
 * let vertSrc = `
 * precision highp float;
 * uniform mat4 uModelViewMatrix;
 * uniform mat4 uProjectionMatrix;
 * 
 * attribute vec3 aPosition;
 * attribute vec2 aTexCoord;
 * varying vec2 vTexCoord;
 * 
 * void main() {
 * vTexCoord = aTexCoord;
 * vec4 positionVec4 = vec4(aPosition, 1.0);
 * gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
 * }
 * `;
 * 
 * // Create a string with the fragment shader program.
 * // The fragment shader is called for each pixel.
 * let fragSrc = `
 * precision mediump float;
 * varying vec2 vTexCoord;
 * 
 * void main() {
 * vec2 uv = vTexCoord;
 * vec3 color = vec3(uv.x, uv.y, min(uv.x + uv.y, 1.0));
 * gl_FragColor = vec4(color, 1.0);\
 * }
 * `;
 * 
 * let pg;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * background(200);
 * 
 * // Create a p5.Shader object.
 * let original = createShader(vertSrc, fragSrc);
 * 
 * // Compile the p5.Shader object.
 * shader(original);
 * 
 * // Create a p5.Graphics object.
 * pg = createGraphics(50, 50, WEBGL);
 * 
 * // Copy the original shader to the p5.Graphics object.
 * let copied = original.copyToContext(pg);
 * 
 * // Apply the copied shader to the p5.Graphics object.
 * pg.shader(copied);
 * 
 * // Style the display surface.
 * pg.noStroke();
 * 
 * // Add a display surface for the shader.
 * pg.plane(50, 50);
 * 
 * describe('A square with purple-blue gradient on its surface drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw the p5.Graphics object to the main canvas.
 * image(pg, -25, -25);
 * }
 * </code>
 * </div>
 * 
 * <div class='notest'>
 * <code>
 * // Note: A "uniform" is a global variable within a shader program.
 * 
 * // Create a string with the vertex shader program.
 * // The vertex shader is called for each vertex.
 * let vertSrc = `
 * precision highp float;
 * uniform mat4 uModelViewMatrix;
 * uniform mat4 uProjectionMatrix;
 * 
 * attribute vec3 aPosition;
 * attribute vec2 aTexCoord;
 * varying vec2 vTexCoord;
 * 
 * void main() {
 * vTexCoord = aTexCoord;
 * vec4 positionVec4 = vec4(aPosition, 1.0);
 * gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
 * }
 * `;
 * 
 * // Create a string with the fragment shader program.
 * // The fragment shader is called for each pixel.
 * let fragSrc = `
 * precision mediump float;
 * 
 * varying vec2 vTexCoord;
 * 
 * void main() {
 * vec2 uv = vTexCoord;
 * vec3 color = vec3(uv.x, uv.y, min(uv.x + uv.y, 1.0));
 * gl_FragColor = vec4(color, 1.0);
 * }
 * `;
 * 
 * let copied;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Graphics object.
 * let pg = createGraphics(25, 25, WEBGL);
 * 
 * // Create a p5.Shader object.
 * let original = pg.createShader(vertSrc, fragSrc);
 * 
 * // Compile the p5.Shader object.
 * pg.shader(original);
 * 
 * // Copy the original shader to the main canvas.
 * copied = original.copyToContext(p5.instance);
 * 
 * // Apply the copied shader to the main canvas.
 * shader(copied);
 * 
 * describe('A rotating cube with a purple-blue gradient on its surface drawn against a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Rotate around the x-, y-, and z-axes.
 * rotateX(frameCount * 0.01);
 * rotateY(frameCount * 0.01);
 * rotateZ(frameCount * 0.01);
 * 
 * // Draw the box.
 * box(50);
 * }
 * </code>
 * </div>
 */
function copyToContext(context: p5 | p5.Graphics): p5.Shader;

/**
 * Sets the shader’s uniform (global) variables.Shader programs run on the computer’s graphics processing unit (GPU).
 * They live in part of the computer’s memory that’s completely separate
 * from the sketch that runs them. Uniforms are global variables within a
 * shader program. They provide a way to pass values from a sketch running
 * on the CPU to a shader program running on the GPU.The first parameter, `uniformName`, is a string with the uniform’s name.
 * For the shader above, `uniformName` would be `'r'`.The second parameter, `data`, is the value that should be used to set the
 * uniform. For example, calling `myShader.setUniform('r', 0.5)` would set
 * the `r` uniform in the shader above to `0.5`. data should match the
 * uniform’s type. Numbers, strings, booleans, arrays, and many types of
 * images can all be passed to a shader with `setUniform()`.
 *
 * @param name of the uniform. Must match the name
 * used in the vertex and fragment shaders.
 * @param value to assign to the uniform. Must match the uniform’s data type.
 * @example <div>
 * <code>
 * // Note: A "uniform" is a global variable within a shader program.
 * 
 * // Create a string with the vertex shader program.
 * // The vertex shader is called for each vertex.
 * let vertSrc = `
 * precision highp float;
 * uniform mat4 uModelViewMatrix;
 * uniform mat4 uProjectionMatrix;
 * 
 * attribute vec3 aPosition;
 * attribute vec2 aTexCoord;
 * varying vec2 vTexCoord;
 * 
 * void main() {
 * vTexCoord = aTexCoord;
 * vec4 positionVec4 = vec4(aPosition, 1.0);
 * gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
 * }
 * `;
 * 
 * // Create a string with the fragment shader program.
 * // The fragment shader is called for each pixel.
 * let fragSrc = `
 * precision mediump float;
 * 
 * uniform float r;
 * 
 * void main() {
 * gl_FragColor = vec4(r, 1.0, 1.0, 1.0);
 * }
 * `;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Shader object.
 * let myShader = createShader(vertSrc, fragSrc);
 * 
 * // Apply the p5.Shader object.
 * shader(myShader);
 * 
 * // Set the r uniform to 0.5.
 * myShader.setUniform('r', 0.5);
 * 
 * // Style the drawing surface.
 * noStroke();
 * 
 * // Add a plane as a drawing surface for the shader.
 * plane(100, 100);
 * 
 * describe('A cyan square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Note: A "uniform" is a global variable within a shader program.
 * 
 * // Create a string with the vertex shader program.
 * // The vertex shader is called for each vertex.
 * let vertSrc = `
 * precision highp float;
 * uniform mat4 uModelViewMatrix;
 * uniform mat4 uProjectionMatrix;
 * 
 * attribute vec3 aPosition;
 * attribute vec2 aTexCoord;
 * varying vec2 vTexCoord;
 * 
 * void main() {
 * vTexCoord = aTexCoord;
 * vec4 positionVec4 = vec4(aPosition, 1.0);
 * gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
 * }
 * `;
 * 
 * // Create a string with the fragment shader program.
 * // The fragment shader is called for each pixel.
 * let fragSrc = `
 * precision mediump float;
 * 
 * uniform float r;
 * 
 * void main() {
 * gl_FragColor = vec4(r, 1.0, 1.0, 1.0);
 * }
 * `;
 * 
 * let myShader;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Shader object.
 * myShader = createShader(vertSrc, fragSrc);
 * 
 * // Compile and apply the p5.Shader object.
 * shader(myShader);
 * 
 * describe('A square oscillates color between cyan and white.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the drawing surface.
 * noStroke();
 * 
 * // Update the r uniform.
 * let nextR = 0.5 * (sin(frameCount * 0.01) + 1);
 * myShader.setUniform('r', nextR);
 * 
 * // Add a plane as a drawing surface.
 * plane(100, 100);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Note: A "uniform" is a global variable within a shader program.
 * 
 * // Create a string with the vertex shader program.
 * // The vertex shader is called for each vertex.
 * let vertSrc = `
 * precision highp float;
 * uniform mat4 uModelViewMatrix;
 * uniform mat4 uProjectionMatrix;
 * 
 * attribute vec3 aPosition;
 * attribute vec2 aTexCoord;
 * varying vec2 vTexCoord;
 * 
 * void main() {
 * vTexCoord = aTexCoord;
 * vec4 positionVec4 = vec4(aPosition, 1.0);
 * gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
 * }
 * `;
 * 
 * // Create a string with the fragment shader program.
 * // The fragment shader is called for each pixel.
 * let fragSrc = `
 * precision highp float;
 * uniform vec2 p;
 * uniform float r;
 * const int numIterations = 500;
 * varying vec2 vTexCoord;
 * 
 * void main() {
 * vec2 c = p + gl_FragCoord.xy * r;
 * vec2 z = c;
 * float n = 0.0;
 * 
 * for (int i = numIterations; i > 0; i--) {
 * if (z.x * z.x + z.y * z.y > 4.0) {
 * n = float(i) / float(numIterations);
 * break;
 * }
 * 
 * z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
 * }
 * 
 * gl_FragColor = vec4(
 * 0.5 - cos(n * 17.0) / 2.0,
 * 0.5 - cos(n * 13.0) / 2.0,
 * 0.5 - cos(n * 23.0) / 2.0,
 * 1.0
 * );
 * }
 * `;
 * 
 * let mandelbrot;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Shader object.
 * mandelbrot = createShader(vertSrc, fragSrc);
 * 
 * // Compile and apply the p5.Shader object.
 * shader(mandelbrot);
 * 
 * // Set the shader uniform p to an array.
 * // p is the center point of the Mandelbrot image.
 * mandelbrot.setUniform('p', [-0.74364388703, 0.13182590421]);
 * 
 * describe('A fractal image zooms in and out of focus.');
 * }
 * 
 * function draw() {
 * // Set the shader uniform r to a value that oscillates
 * // between 0 and 0.005.
 * // r is the size of the image in Mandelbrot-space.
 * let radius = 0.005 * (sin(frameCount * 0.01) + 1);
 * mandelbrot.setUniform('r', radius);
 * 
 * // Style the drawing surface.
 * noStroke();
 * 
 * // Add a plane as a drawing surface.
 * plane(100, 100);
 * }
 * </code>
 * </div>
 */
function setUniform(uniformName: string, data: boolean | number | number[] | p5.Image | p5.Graphics | p5.MediaElement | p5.Texture): void;

}

export default function p5_Shader(p5: any, fn: any): void;
