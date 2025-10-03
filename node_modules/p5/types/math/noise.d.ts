// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Returns random numbers that can be tuned to feel organic.Values returned by random() and
 * randomGaussian() can change by large
 * amounts between function calls. By contrast, values returned by `noise()`
 * can be made "smooth". Calls to `noise()` with similar inputs will produce
 * similar outputs. `noise()` is used to create textures, motion, shapes,
 * terrains, and so on. Ken Perlin invented `noise()` while animating the
 * original Tron film in the 1980s.`noise()` always returns values between 0 and 1. It returns the same value
 * for a given input while a sketch is running. `noise()` produces different
 * results each time a sketch runs. The
 * noiseSeed() function can be used to generate
 * the same sequence of Perlin noise values each time a sketch runs.The character of the noise can be adjusted in two ways. The first way is to
 * scale the inputs. `noise()` interprets inputs as coordinates. The sequence
 * of noise values will be smoother when the input coordinates are closer. The
 * second way is to use the noiseDetail()
 * function.The version of `noise()` with one parameter computes noise values in one
 * dimension. This dimension can be thought of as space, as in `noise(x)`, or
 * time, as in `noise(t)`.The version of `noise()` with two parameters computes noise values in two
 * dimensions. These dimensions can be thought of as space, as in
 * `noise(x, y)`, or space and time, as in `noise(x, t)`.The version of `noise()` with three parameters computes noise values in
 * three dimensions. These dimensions can be thought of as space, as in
 * `noise(x, y, z)`, or space and time, as in `noise(x, y, t)`.
 *
 * @param x-coordinate in noise space.
 * @param y-coordinate in noise space.
 * @param z-coordinate in noise space.
 * @return Perlin noise value at specified coordinates.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A black dot moves randomly on a gray square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the coordinates.
 * let x = 100 * noise(0.005 * frameCount);
 * let y = 100 * noise(0.005 * frameCount + 10000);
 * 
 * // Draw the point.
 * strokeWeight(5);
 * point(x, y);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A black dot moves randomly on a gray square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Set the noise level and scale.
 * let noiseLevel = 100;
 * let noiseScale = 0.005;
 * 
 * // Scale the input coordinate.
 * let nt = noiseScale * frameCount;
 * 
 * // Compute the noise values.
 * let x = noiseLevel * noise(nt);
 * let y = noiseLevel * noise(nt + 10000);
 * 
 * // Draw the point.
 * strokeWeight(5);
 * point(x, y);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A hilly terrain drawn in gray against a black sky.');
 * }
 * 
 * function draw() {
 * // Set the noise level and scale.
 * let noiseLevel = 100;
 * let noiseScale = 0.02;
 * 
 * // Scale the input coordinate.
 * let x = frameCount;
 * let nx = noiseScale * x;
 * 
 * // Compute the noise value.
 * let y = noiseLevel * noise(nx);
 * 
 * // Draw the line.
 * line(x, 0, x, y);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A calm sea drawn in gray against a black sky.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Set the noise level and scale.
 * let noiseLevel = 100;
 * let noiseScale = 0.002;
 * 
 * // Iterate from left to right.
 * for (let x = 0; x < 100; x += 1) {
 * // Scale the input coordinates.
 * let nx = noiseScale * x;
 * let nt = noiseScale * frameCount;
 * 
 * // Compute the noise value.
 * let y = noiseLevel * noise(nx, nt);
 * 
 * // Draw the line.
 * line(x, 0, x, y);
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
 * background(200);
 * 
 * // Set the noise level and scale.
 * let noiseLevel = 255;
 * let noiseScale = 0.01;
 * 
 * // Iterate from top to bottom.
 * for (let y = 0; y < 100; y += 1) {
 * // Iterate from left to right.
 * for (let x = 0; x < 100; x += 1) {
 * // Scale the input coordinates.
 * let nx = noiseScale * x;
 * let ny = noiseScale * y;
 * 
 * // Compute the noise value.
 * let c = noiseLevel * noise(nx, ny);
 * 
 * // Draw the point.
 * stroke(c);
 * point(x, y);
 * }
 * }
 * 
 * describe('A gray cloudy pattern.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A gray cloudy pattern that changes.');
 * }
 * 
 * function draw() {
 * // Set the noise level and scale.
 * let noiseLevel = 255;
 * let noiseScale = 0.009;
 * 
 * // Iterate from top to bottom.
 * for (let y = 0; y < 100; y += 1) {
 * // Iterate from left to right.
 * for (let x = 0; x < width; x += 1) {
 * // Scale the input coordinates.
 * let nx = noiseScale * x;
 * let ny = noiseScale * y;
 * let nt = noiseScale * frameCount;
 * 
 * // Compute the noise value.
 * let c = noiseLevel * noise(nx, ny, nt);
 * 
 * // Draw the point.
 * stroke(c);
 * point(x, y);
 * }
 * }
 * }
 * </code>
 * </div>
 */
function noise(x: number, y?: number, z?: number): number;

/**
 * Adjusts the character of the noise produced by the
 * noise() function.Perlin noise values are created by adding layers of noise together. The
 * noise layers, called octaves, are similar to harmonics in music. Lower
 * octaves contribute more to the output signal. They define the overall
 * intensity of the noise. Higher octaves create finer-grained details.By default, noise values are created by combining four octaves. Each higher
 * octave contributes half as much (50% less) compared to its predecessor.
 * `noiseDetail()` changes the number of octaves and the falloff amount. For
 * example, calling `noiseDetail(6, 0.25)` ensures that
 * noise() will use six octaves. Each higher octave
 * will contribute 25% as much (75% less) compared to its predecessor. Falloff
 * values between 0 and 1 are valid. However, falloff values greater than 0.5
 * might result in noise values greater than 1.
 *
 * @param number of octaves to be used by the noise.
 * @param falloff factor for each octave.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Set the noise level and scale.
 * let noiseLevel = 255;
 * let noiseScale = 0.02;
 * 
 * // Iterate from top to bottom.
 * for (let y = 0; y < 100; y += 1) {
 * // Iterate from left to right.
 * for (let x = 0; x < 50; x += 1) {
 * // Scale the input coordinates.
 * let nx = noiseScale * x;
 * let ny = noiseScale * y;
 * 
 * // Compute the noise value with six octaves
 * // and a low falloff factor.
 * noiseDetail(6, 0.25);
 * let c = noiseLevel * noise(nx, ny);
 * 
 * // Draw the left side.
 * stroke(c);
 * point(x, y);
 * 
 * // Compute the noise value with four octaves
 * // and a high falloff factor.
 * noiseDetail(4, 0.5);
 * c = noiseLevel * noise(nx, ny);
 * 
 * // Draw the right side.
 * stroke(c);
 * point(x + 50, y);
 * }
 * }
 * 
 * describe('Two gray cloudy patterns. The pattern on the right is cloudier than the pattern on the left.');
 * }
 * </code>
 * </div>
 */
function noiseDetail(lod: number, falloff: number): void;

/**
 * Sets the seed value for the noise() function.By default, noise() produces different results
 * each time a sketch is run. Calling `noiseSeed()` with a constant argument,
 * such as `noiseSeed(99)`, makes noise() produce the
 * same results each time a sketch is run.
 *
 * @param seed value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Set the noise seed for consistent results.
 * noiseSeed(99);
 * 
 * describe('A black rectangle that grows randomly, first to the right and then to the left.');
 * }
 * 
 * function draw() {
 * // Set the noise level and scale.
 * let noiseLevel = 100;
 * let noiseScale = 0.005;
 * 
 * // Scale the input coordinate.
 * let nt = noiseScale * frameCount;
 * 
 * // Compute the noise value.
 * let x = noiseLevel * noise(nt);
 * 
 * // Draw the line.
 * line(x, 0, x, height);
 * }
 * </code>
 * </div>
 */
function noiseSeed(seed: number): void;

}

export default function noise(p5: any, fn: any): void;
