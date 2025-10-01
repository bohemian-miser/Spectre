// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Vector } from '../math/p5.Vector';

declare module 'p5' {
  class Vector {
    constructor(x?: number, y?: number, z?: number);

  /**
   * Creates a new 2D vector from an angle.
 *
   * @param
   * @param
   */
  static fromAngle(angle: number, length: number): p5.Vector;

  /**
   * Creates a new 3D vector from a pair of ISO spherical angles.
 *
   * @param
   * @param
   * @param
   */
  static fromAngles(theta: number, phi: number, length: number): p5.Vector;

  /**
   * Creates a new 2D unit vector with a random heading.
   */
  static random2D(): p5.Vector;

  /**
   * Creates a new 3D unit vector with a random heading.
   */
  static random3D(): p5.Vector;

  static copy(v: p5.Vector): p5.Vector;

  static add(v1: p5.Vector, v2: p5.Vector, target: p5.Vector): p5.Vector;

  static rem(v1: p5.Vector, v2: p5.Vector): void;

  static rem(v1: p5.Vector, v2: p5.Vector): p5.Vector;

  static sub(v1: p5.Vector, v2: p5.Vector, target: p5.Vector): p5.Vector;

  /**
   * Multiplies a vector by a scalar and returns a new vector.
 *
   * @param
   * @param
   * @param
   */
  static mult(v: any, n: any, target: any): void;

  static mult(v: any, n: any, target: any, x: number, y: number, z: number): p5.Vector;

  static mult(v: p5.Vector, n: number, target: p5.Vector): void;

  static mult(v: any, n: any, target: p5.Vector, v0: p5.Vector, v1: p5.Vector): void;

  static mult(v: any, n: any, target: p5.Vector, v0: p5.Vector, arr: number[]): void;

  /**
   * Rotates the vector (only 2D vectors) by the given angle; magnitude remains the same. Returns a new vector.
 *
   * @param
   * @param
   * @param
   */
  static rotate(v: any, a: any, target: any): void;

  static rotate(v: p5.Vector, a: any, target: p5.Vector, angle: number): void;

  /**
   * Divides a vector by a scalar and returns a new vector.
 *
   * @param
   * @param
   * @param
   */
  static div(v: any, n: any, target: any): void;

  static div(v: any, n: any, target: any, x: number, y: number, z: number): p5.Vector;

  static div(v: p5.Vector, n: number, target: p5.Vector): void;

  static div(v: any, n: any, target: p5.Vector, v0: p5.Vector, v1: p5.Vector): void;

  static div(v: any, n: any, target: p5.Vector, v0: p5.Vector, arr: number[]): void;

  /**
   * Calculates the dot product of two vectors.
 *
   * @param
   * @param
   */
  static dot(v1: any, v2: any): void;

  static dot(v1: p5.Vector, v2: p5.Vector): number;

  /**
   * Calculates the cross product of two vectors.
 *
   * @param
   * @param
   */
  static cross(v1: any, v2: any): void;

  static cross(v1: p5.Vector, v2: p5.Vector): number;

  /**
   * Calculates the Euclidean distance between two points (considering a
   * point as a vector object).
 *
   * @param
   * @param
   */
  static dist(v1: any, v2: any): void;

  static dist(v1: p5.Vector, v2: p5.Vector): number;

  /**
   * Linear interpolate a vector to another vector and return the result as a
   * new vector.
 *
   * @param
   * @param
   * @param
   * @param
   */
  static lerp(v1: any, v2: any, amt: any, target: any): void;

  static lerp(v1: p5.Vector, v2: p5.Vector, amt: number, target: p5.Vector): p5.Vector;

  /**
   * Performs spherical linear interpolation with the other vector
   * and returns the resulting vector.
   * This works in both 3D and 2D. As for 2D, the result of slerping
   * between 2D vectors is always a 2D vector.
 *
   * @param
   * @param
   * @param
   * @param
   */
  static slerp(v1: any, v2: any, amt: any, target: any): void;

  static slerp(v1: p5.Vector, v2: p5.Vector, amt: number, target: p5.Vector): p5.Vector;

  /**
   * Calculates the magnitude (length) of the vector and returns the result as
   * a float (this is simply the equation `sqrt(x*x + y*y + z*z)`.)
 *
   * @param
   */
  static mag(vecT: any): void;

  static mag(vecT: p5.Vector): number;

  /**
   * Calculates the squared magnitude of the vector and returns the result
   * as a float (this is simply the equation (x*x + y*y + z*z).)
   * Faster if the real length is not required in the
   * case of comparing vectors, etc.
 *
   * @param
   */
  static magSq(vecT: any): void;

  static magSq(vecT: p5.Vector): number;

  /**
   * Normalize the vector to length 1 (make it a unit vector).
 *
   * @param
   * @param
   */
  static normalize(v: any, target: any): void;

  static normalize(v: p5.Vector, target: p5.Vector): p5.Vector;

  /**
   * Limit the magnitude of the vector to the value used for the max
   * parameter.
 *
   * @param
   * @param
   * @param
   */
  static limit(v: any, max: any, target: any): void;

  static limit(v: p5.Vector, max: number, target: p5.Vector): p5.Vector;

  /**
   * Set the magnitude of the vector to the value used for the len
   * parameter.
 *
   * @param
   * @param
   * @param
   */
  static setMag(v: any, len: any, target: any): void;

  static setMag(v: p5.Vector, len: number, target: p5.Vector): p5.Vector;

  /**
   * Calculate the angle of rotation for this vector (only 2D vectors).
   * p5.Vectors created using createVector()
   * will take the current angleMode into
   * consideration, and give the angle in radians or degrees accordingly.
 *
   * @param
   */
  static heading(v: any): void;

  static heading(v: p5.Vector): number;

  /**
   * Calculates and returns the angle between two vectors. This function will take
   * the angleMode on v1 into consideration, and
   * give the angle in radians or degrees accordingly.
 *
   * @param
   * @param
   */
  static angleBetween(v1: any, v2: any): void;

  static angleBetween(v1: p5.Vector, v2: p5.Vector): number;

  /**
   * Reflect a vector about a normal to a line in 2D, or about a normal to a
   * plane in 3D.
 *
   * @param
   * @param
   * @param
   */
  static reflect(incidentVector: any, surfaceNormal: any, target: any): void;

  static reflect(incidentVector: p5.Vector, surfaceNormal: p5.Vector, target: p5.Vector): p5.Vector;

  /**
   * Return a representation of this vector as a float array. This is only
   * for temporary use. If used in any other fashion, the contents should be
   * copied by using the p5.Vector.copy()
   * method to copy into your own vector.
 *
   * @param
   */
  static array(v: any): void;

  static array(v: p5.Vector): number[];

  /**
   * Equality check against a p5.Vector
 *
   * @param
   * @param
   */
  static equals(v1: any, v2: any): void;

  static equals(v1: p5.Vector | Array, v2: p5.Vector | Array): boolean;

  /**
   * Retrieves the value at the specified index from the vector.This method allows you to get the value of a specific component of the vector
   * by providing its index. Think of the vector as a list of numbers, where each
   * number represents a different direction (like x, y, or z). The index is just
   * the position of the number in that list.For example, if you have a vector with values 10, 20, 30 the index 0 would
   * give you the first value 10, index 1 would give you the second value 20,
   * and so on.
 *
   * @param
   */
  getValue(index: number): number;

  /**
   * Sets the value at the specified index of the vector.This method allows you to change a specific component of the vector by providing its index and the new value you want to set.
   * Think of the vector as a list of numbers, where each number represents a different direction (like x, y, or z).
   * The index is just the position of the number in that list.For example, if you have a vector with values [0, 20, 30], and you want to change the second value (20) to 50,
   * you would use this method with index 1 (since indexes start at 0) and value 50.
 *
   * @param
   * @param
   */
  setValue(index: number, value: number): void;

  /**
   * Returns a string representation of a vector.Calling `toString()` is useful for printing vectors to the console while
   * debugging.
   */
  toString(): string;

  /**
   * Sets the vector's `x`, `y`, and `z` components.`set()` can use separate numbers, as in `v.set(1, 2, 3)`, a
   * p5.Vector object, as in `v.set(v2)`, or an
   * array of numbers, as in `v.set([1, 2, 3])`.If a value isn't provided for a component, it will be set to 0. For
   * example, `v.set(4, 5)` sets `v.x` to 4, `v.y` to 5, and `v.z` to 0.
   * Calling `set()` with no arguments, as in `v.set()`, sets all the vector's
   * components to 0.
 *
   * @param
   * @param
   * @param
   * @param
   */
  set(args: any[], x: number, y: number, z: number): void;

  set(args: any[], value: p5.Vector | number[]): void;

  /**
   * Returns a copy of the p5.Vector object.
   */
  copy(): p5.Vector;

  /**
   * Adds to a vector's components.`add()` can use separate numbers, as in `v.add(1, 2, 3)`,
   * another p5.Vector object, as in `v.add(v2)`, or
   * an array of numbers, as in `v.add([1, 2, 3])`.If a value isn't provided for a component, it won't change. For
   * example, `v.add(4, 5)` adds 4 to `v.x`, 5 to `v.y`, and 0 to `v.z`.
   * Calling `add()` with no arguments, as in `v.add()`, has no effect.This method supports N-dimensional vectors.The static version of `add()`, as in `p5.Vector.add(v2, v1)`, returns a new
   * p5.Vector object and doesn't change the
   * originals.
 *
   * @param
   * @param
   * @param
   * @param
   */
  add(args: any[], x: number | Array, y: number, z: number): void;

  add(args: any[], value: p5.Vector | number[]): void;

  /**
   * Performs modulo (remainder) division with a vector's `x`, `y`, and `z`
   * components.`rem()` can use separate numbers, as in `v.rem(1, 2, 3)`,
   * another p5.Vector object, as in `v.rem(v2)`, or
   * an array of numbers, as in `v.rem([1, 2, 3])`.If only one value is provided, as in `v.rem(2)`, then all the components
   * will be set to their values modulo 2. If two values are provided, as in
   * `v.rem(2, 3)`, then `v.z` won't change. Calling `rem()` with no
   * arguments, as in `v.rem()`, has no effect.The static version of `rem()`, as in `p5.Vector.rem(v2, v1)`, returns a
   * new p5.Vector object and doesn't change the
   * originals.
 *
   * @param
   * @param
   * @param
   */
  rem(x: number, y: number, z: number): void;

  rem(x: any, y: any, z: any, value: p5.Vector | number[]): void;

  /**
   * Subtracts from a vector's `x`, `y`, and `z` components.`sub()` can use separate numbers, as in `v.sub(1, 2, 3)`, another
   * p5.Vector object, as in `v.sub(v2)`, or an array
   * of numbers, as in `v.sub([1, 2, 3])`.If a value isn't provided for a component, it won't change. For
   * example, `v.sub(4, 5)` subtracts 4 from `v.x`, 5 from `v.y`, and 0 from `v.z`.
   * Calling `sub()` with no arguments, as in `v.sub()`, has no effect.The static version of `sub()`, as in `p5.Vector.sub(v2, v1)`, returns a new
   * p5.Vector object and doesn't change the
   * originals.
 *
   * @param
   * @param
   * @param
   * @param
   */
  sub(args: any[], x: number, y: number, z: number): void;

  sub(args: any[], value: p5.Vector | number[]): void;

  mult(args: any[], x: number, y: number, z: number): void;

  mult(args: any[], arr: number[]): void;

  mult(args: any[], v: p5.Vector): void;

  /**
   * Divides a vector's `x`, `y`, and `z` components.`div()` can use separate numbers, as in `v.div(1, 2, 3)`, another
   * p5.Vector object, as in `v.div(v2)`, or an array
   * of numbers, as in `v.div([1, 2, 3])`.If only one value is provided, as in `v.div(2)`, then all the components
   * will be divided by 2. If a value isn't provided for a component, it
   * won't change. For example, `v.div(4, 5)` divides `v.x` by, `v.y` by 5,
   * and `v.z` by 1. Calling `div()` with no arguments, as in `v.div()`, has
   * no effect.The static version of `div()`, as in `p5.Vector.div(v, 2)`, returns a new
   * p5.Vector object and doesn't change the
   * originals.
 *
   * @param
   * @param
   */
  div(args: any[], n: number): void;

  div(args: any[], x: number, y: number, z: number): void;

  div(args: any[], arr: number[]): void;

  div(args: any[], v: p5.Vector): void;

  /**
   * Calculates the magnitude (length) of the vector.Use mag() to calculate the magnitude of a 2D vector
   * using components as in `mag(x, y)`.
   */
  mag(): number;

  /**
   * Calculates the magnitude (length) of the vector squared.
   */
  magSq(): number;

  /**
   * Calculates the dot product of two vectors.The dot product is a number that describes the overlap between two vectors.
   * Visually, the dot product can be thought of as the "shadow" one vector
   * casts on another. The dot product's magnitude is largest when two vectors
   * point in the same or opposite directions. Its magnitude is 0 when two
   * vectors form a right angle.The version of `dot()` with one parameter interprets it as another
   * p5.Vector object.The version of `dot()` with multiple parameters interprets them as the
   * `x`, `y`, and `z` components of another vector.The static version of `dot()`, as in `p5.Vector.dot(v1, v2)`, is the same
   * as calling `v1.dot(v2)`.
 *
   * @param
   * @param
   * @param
   * @param
   */
  dot(args: any[], x: number, y: number, z: number): number;

  dot(args: any[], v: p5.Vector): number;

  /**
   * Calculates the cross product of two vectors.The cross product is a vector that points straight out of the plane created
   * by two vectors. The cross product's magnitude is the area of the parallelogram
   * formed by the original two vectors.The static version of `cross()`, as in `p5.Vector.cross(v1, v2)`, is the same
   * as calling `v1.cross(v2)`.
 *
   * @param
   */
  cross(v: p5.Vector): p5.Vector;

  /**
   * Scales the components of a p5.Vector object so
   * that its magnitude is 1.The static version of `normalize()`,  as in `p5.Vector.normalize(v)`,
   * returns a new p5.Vector object and doesn't change
   * the original.
   */
  normalize(): p5.Vector;

  /**
   * Limits a vector's magnitude to a maximum value.The static version of `limit()`, as in `p5.Vector.limit(v, 5)`, returns a
   * new p5.Vector object and doesn't change the
   * original.
 *
   * @param
   */
  limit(max: number): void;

  /**
   * Sets a vector's magnitude to a given value.The static version of `setMag()`, as in `p5.Vector.setMag(v, 10)`, returns
   * a new p5.Vector object and doesn't change the
   * original.
 *
   * @param
   * @param
   */
  setMag(n: any, len: number): void;

  /**
   * Calculates the angle a 2D vector makes with the positive x-axis.By convention, the positive x-axis has an angle of 0. Angles increase in
   * the clockwise direction.If the vector was created with
   * createVector(), `heading()` returns angles
   * in the units of the current angleMode().The static version of `heading()`, as in `p5.Vector.heading(v)`, works the
   * same way.
   */
  heading(): number;

  /**
   * Rotates a 2D vector to a specific angle without changing its magnitude.By convention, the positive x-axis has an angle of 0. Angles increase in
   * the clockwise direction.If the vector was created with
   * createVector(), `setHeading()` uses
   * the units of the current angleMode().
 *
   * @param
   * @param
   */
  setHeading(a: any, angle: number): void;

  /**
   * Rotates a 2D vector by an angle without changing its magnitude.By convention, the positive x-axis has an angle of 0. Angles increase in
   * the clockwise direction.If the vector was created with
   * createVector(), `rotate()` uses
   * the units of the current angleMode().The static version of `rotate()`, as in `p5.Vector.rotate(v, PI)`,
   * returns a new p5.Vector object and doesn't change
   * the original.
 *
   * @param
   * @param
   */
  rotate(a: any, angle: number): void;

  /**
   * Calculates the angle between two vectors.The angles returned are signed, which means that
   * `v1.angleBetween(v2) === -v2.angleBetween(v1)`.If the vector was created with
   * createVector(), `angleBetween()` returns
   * angles in the units of the current
   * angleMode().
 *
   * @param
   * @param
   */
  angleBetween(v: any, value: p5.Vector): number;

  /**
   * Calculates new `x`, `y`, and `z` components that are proportionally the
   * same distance between two vectors.The `amt` parameter is the amount to interpolate between the old vector and
   * the new vector. 0.0 keeps all components equal to the old vector's, 0.5 is
   * halfway between, and 1.0 sets all components equal to the new vector's.The static version of `lerp()`, as in `p5.Vector.lerp(v0, v1, 0.5)`,
   * returns a new p5.Vector object and doesn't change
   * the original.
 *
   * @param
   * @param
   * @param
   * @param
   */
  lerp(x: number, y: number, z: number, amt: number): void;

  lerp(x: any, y: any, z: any, amt: number, v: p5.Vector): void;

  /**
   * Calculates a new heading and magnitude that are between two vectors.The `amt` parameter is the amount to interpolate between the old vector and
   * the new vector. 0.0 keeps the heading and magnitude equal to the old
   * vector's, 0.5 sets them halfway between, and 1.0 sets the heading and
   * magnitude equal to the new vector's.`slerp()` differs from lerp() because
   * it interpolates magnitude. Calling `v0.slerp(v1, 0.5)` sets `v0`'s
   * magnitude to a value halfway between its original magnitude and `v1`'s.
   * Calling `v0.lerp(v1, 0.5)` makes no such guarantee.The static version of `slerp()`, as in `p5.Vector.slerp(v0, v1, 0.5)`,
   * returns a new p5.Vector object and doesn't change
   * the original.
 *
   * @param
   * @param
   */
  slerp(v: p5.Vector, amt: number): p5.Vector;

  /**
   * Reflects a vector about a line in 2D or a plane in 3D.The orientation of the line or plane is described by a normal vector that
   * points away from the shape.The static version of `reflect()`, as in `p5.Vector.reflect(v, n)`,
   * returns a new p5.Vector object and doesn't change
   * the original.
 *
   * @param
   */
  reflect(surfaceNormal: p5.Vector): void;

  /**
   * Returns the vector's components as an array of numbers.
   */
  array(): number[];

  /**
   * Checks whether all the vector's components are equal to another vector's.`equals()` returns `true` if the vector's components are all the same as another
   * vector's and `false` if not.The version of `equals()` with one parameter interprets it as another
   * p5.Vector object.The version of `equals()` with multiple parameters interprets them as the
   * components of another vector. Any missing parameters are assigned the value
   * 0.The static version of `equals()`, as in `p5.Vector.equals(v0, v1)`,
   * interprets both parameters as p5.Vector objects.
 *
   * @param
   * @param
   * @param
   * @param
   */
  equals(args: any[], x: number, y: number, z: number): boolean;

  equals(args: any[], value: p5.Vector | Array): boolean;

  }

/**
 * Calculates the distance between two points represented by vectors.A point's coordinates can be represented by the components of a vector
 * that extends from the origin to the point.The static version of `dist()`, as in `p5.Vector.dist(v1, v2)`, is the same
 * as calling `v1.dist(v2)`.Use dist() to calculate the distance between points
 * using coordinates as in `dist(x1, y1, x2, y2)`.
 *
 * @submodule p5.Vector
 * @param x, y, and z coordinates of a <a href="#/p5.Vector">p5.Vector</a>.
 * @return distance.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create p5.Vector objects.
 * let v1 = createVector(1, 0);
 * let v2 = createVector(0, 1);
 * 
 * // Calculate the distance between them.
 * let d = v1.dist(v2);
 * 
 * // Prints "1.414..." to the console.
 * print(d);
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create p5.Vector objects.
 * let v1 = createVector(1, 0);
 * let v2 = createVector(0, 1);
 * 
 * // Calculate the distance between them.
 * let d = p5.Vector.dist(v1, v2);
 * 
 * // Prints "1.414..." to the console.
 * print(d);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Three arrows drawn on a gray square. A red and a blue arrow extend from the top left. A purple arrow extends from the tip of the red arrow to the tip of the blue arrow. The number 36 is written in black near the purple arrow.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * let origin = createVector(0, 0);
 * 
 * // Draw the red arrow.
 * let v1 = createVector(50, 50);
 * drawArrow(origin, v1, 'red');
 * 
 * // Draw the blue arrow.
 * let v2 = createVector(20, 70);
 * drawArrow(origin, v2, 'blue');
 * 
 * // Purple arrow.
 * let v3 = p5.Vector.sub(v2, v1);
 * drawArrow(v1, v3, 'purple');
 * 
 * // Style the text.
 * textAlign(CENTER);
 * 
 * // Display the magnitude. The same as floor(v3.mag());
 * let m = floor(p5.Vector.dist(v1, v2));
 * text(m, 50, 75);
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function dist(v: p5.Vector): number;

/**
 * Retrieves the value at the specified index from the vector.This method allows you to get the value of a specific component of the vector
 * by providing its index. Think of the vector as a list of numbers, where each
 * number represents a different direction (like x, y, or z). The index is just
 * the position of the number in that list.For example, if you have a vector with values 10, 20, 30 the index 0 would
 * give you the first value 10, index 1 would give you the second value 20,
 * and so on.
 *
 * @param The position of the value you want to get from the vector.
 * @returns The value at the specified position in the vector.
 * @throws Will throw an error if the index is out of bounds, meaning if you try to
 * get a value from a position that doesn't exist in the vector.
 */
function getValue(index: number): number;

/**
 * Sets the value at the specified index of the vector.This method allows you to change a specific component of the vector by providing its index and the new value you want to set.
 * Think of the vector as a list of numbers, where each number represents a different direction (like x, y, or z).
 * The index is just the position of the number in that list.For example, if you have a vector with values [0, 20, 30], and you want to change the second value (20) to 50,
 * you would use this method with index 1 (since indexes start at 0) and value 50.
 *
 * @param The position in the vector where you want to set the new value.
 * @param The new value you want to set at the specified position.
 * @throws Will throw an error if the index is outside the bounds of the vector, meaning if you try to set a value at a position that doesn't exist in the vector.
 */
function setValue(index: number, value: number): void;

/**
 * Returns a string representation of a vector.Calling `toString()` is useful for printing vectors to the console while
 * debugging.
 *
 * @return string representation of the vector.
 * @example <div class = "norender">
 * <code>
 * function setup() {
 * let v = createVector(20, 30);
 * 
 * // Prints 'p5.Vector Object : [20, 30, 0]'.
 * print(v.toString());
 * }
 * </code>
 * </div>
 */
function toString(): string;

/**
 * Sets the vector's `x`, `y`, and `z` components.`set()` can use separate numbers, as in `v.set(1, 2, 3)`, a
 * p5.Vector object, as in `v.set(v2)`, or an
 * array of numbers, as in `v.set([1, 2, 3])`.If a value isn't provided for a component, it will be set to 0. For
 * example, `v.set(4, 5)` sets `v.x` to 4, `v.y` to 5, and `v.z` to 0.
 * Calling `set()` with no arguments, as in `v.set()`, sets all the vector's
 * components to 0.
 *
 * @param x component of the vector.
 * @param y component of the vector.
 * @param z component of the vector.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Top left.
 * let pos = createVector(25, 25);
 * point(pos);
 * 
 * // Top right.
 * // set() with numbers.
 * pos.set(75, 25);
 * point(pos);
 * 
 * // Bottom right.
 * // set() with a p5.Vector.
 * let p2 = createVector(75, 75);
 * pos.set(p2);
 * point(pos);
 * 
 * // Bottom left.
 * // set() with an array.
 * let arr = [25, 75];
 * pos.set(arr);
 * point(pos);
 * 
 * describe('Four black dots arranged in a square on a gray background.');
 * }
 * </code>
 * </div>
 */
function set(...args: any[], x?: number, y?: number, z?: number): void;

/**
 * @param vector to set.
 */
function set(...args: any[], value: p5.Vector | number[]): void;

/**
 * Returns a copy of the p5.Vector object.
 *
 * @return copy of the <a href="#/p5.Vector">p5.Vector</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100 ,100);
 * 
 * background(200);
 * 
 * // Create a p5.Vector object.
 * let pos = createVector(50, 50);
 * 
 * // Make a copy.
 * let pc = pos.copy();
 * 
 * // Draw the point.
 * strokeWeight(5);
 * point(pc);
 * 
 * describe('A black point drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function copy(): p5.Vector;

/**
 * Adds to a vector's components.`add()` can use separate numbers, as in `v.add(1, 2, 3)`,
 * another p5.Vector object, as in `v.add(v2)`, or
 * an array of numbers, as in `v.add([1, 2, 3])`.If a value isn't provided for a component, it won't change. For
 * example, `v.add(4, 5)` adds 4 to `v.x`, 5 to `v.y`, and 0 to `v.z`.
 * Calling `add()` with no arguments, as in `v.add()`, has no effect.This method supports N-dimensional vectors.The static version of `add()`, as in `p5.Vector.add(v2, v1)`, returns a new
 * p5.Vector object and doesn't change the
 * originals.
 *
 * @param x component of the vector to be added or an array of components.
 * @param y component of the vector to be added.
 * @param z component of the vector to be added.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Top left.
 * let pos = createVector(25, 25);
 * point(pos);
 * 
 * // Top right.
 * // Add numbers.
 * pos.add(50, 0);
 * point(pos);
 * 
 * // Bottom right.
 * // Add a p5.Vector.
 * let p2 = createVector(0, 50);
 * pos.add(p2);
 * point(pos);
 * 
 * // Bottom left.
 * // Add an array.
 * let arr = [-50, 0];
 * pos.add(arr);
 * point(pos);
 * 
 * describe('Four black dots arranged in a square on a gray background.');
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
 * // Top left.
 * let p1 = createVector(25, 25);
 * 
 * // Center.
 * let p2 = createVector(50, 50);
 * 
 * // Bottom right.
 * // Add p1 and p2.
 * let p3 = p5.Vector.add(p1, p2);
 * 
 * // Draw the points.
 * strokeWeight(5);
 * point(p1);
 * point(p2);
 * point(p3);
 * 
 * describe('Three black dots in a diagonal line from top left to bottom right.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Three arrows drawn on a gray square. A red arrow extends from the top left corner to the center. A blue arrow extends from the tip of the red arrow. A purple arrow extends from the origin to the tip of the blue arrow.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * let origin = createVector(0, 0);
 * 
 * // Draw the red arrow.
 * let v1 = createVector(50, 50);
 * drawArrow(origin, v1, 'red');
 * 
 * // Draw the blue arrow.
 * let v2 = createVector(-30, 20);
 * drawArrow(v1, v2, 'blue');
 * 
 * // Purple arrow.
 * let v3 = p5.Vector.add(v1, v2);
 * drawArrow(origin, v3, 'purple');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function add(...args: any[], x: number | Array, y?: number, z?: number): void;

/**
 * @param The vector to add
 */
function add(...args: any[], value: p5.Vector | number[]): void;

/**
 * Performs modulo (remainder) division with a vector's `x`, `y`, and `z`
 * components.`rem()` can use separate numbers, as in `v.rem(1, 2, 3)`,
 * another p5.Vector object, as in `v.rem(v2)`, or
 * an array of numbers, as in `v.rem([1, 2, 3])`.If only one value is provided, as in `v.rem(2)`, then all the components
 * will be set to their values modulo 2. If two values are provided, as in
 * `v.rem(2, 3)`, then `v.z` won't change. Calling `rem()` with no
 * arguments, as in `v.rem()`, has no effect.The static version of `rem()`, as in `p5.Vector.rem(v2, v1)`, returns a
 * new p5.Vector object and doesn't change the
 * originals.
 *
 * @param x component of divisor vector.
 * @param y component of divisor vector.
 * @param z component of divisor vector.
 * @example <div class='norender'>
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(3, 4, 5);
 * 
 * // Divide numbers.
 * v.rem(2);
 * 
 * // Prints 'p5.Vector Object : [1, 0, 1]'.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(3, 4, 5);
 * 
 * // Divide numbers.
 * v.rem(2, 3);
 * 
 * // Prints 'p5.Vector Object : [1, 1, 5]'.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(3, 4, 5);
 * 
 * // Divide numbers.
 * v.rem(2, 3, 4);
 * 
 * // Prints 'p5.Vector Object : [1, 1, 1]'.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v1 = createVector(3, 4, 5);
 * let v2 = createVector(2, 3, 4);
 * 
 * // Divide a p5.Vector.
 * v1.rem(v2);
 * 
 * // Prints 'p5.Vector Object : [1, 1, 1]'.
 * print(v1.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(3, 4, 5);
 * 
 * // Divide an array.
 * let arr = [2, 3, 4];
 * v.rem(arr);
 * 
 * // Prints 'p5.Vector Object : [1, 1, 1]'.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v1 = createVector(3, 4, 5);
 * let v2 = createVector(2, 3, 4);
 * 
 * // Divide without modifying the original vectors.
 * let v3 = p5.Vector.rem(v1, v2);
 * 
 * // Prints 'p5.Vector Object : [1, 1, 1]'.
 * print(v3.toString());
 * }
 * </code>
 * </div>
 */
function rem(x: number, y: number, z: number): void;

/**
 * @param divisor vector.
 */
function rem(x: any, y: any, z: any, value: p5.Vector | number[]): void;

/**
 * Subtracts from a vector's `x`, `y`, and `z` components.`sub()` can use separate numbers, as in `v.sub(1, 2, 3)`, another
 * p5.Vector object, as in `v.sub(v2)`, or an array
 * of numbers, as in `v.sub([1, 2, 3])`.If a value isn't provided for a component, it won't change. For
 * example, `v.sub(4, 5)` subtracts 4 from `v.x`, 5 from `v.y`, and 0 from `v.z`.
 * Calling `sub()` with no arguments, as in `v.sub()`, has no effect.The static version of `sub()`, as in `p5.Vector.sub(v2, v1)`, returns a new
 * p5.Vector object and doesn't change the
 * originals.
 *
 * @param x component of the vector to subtract.
 * @param y component of the vector to subtract.
 * @param z component of the vector to subtract.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Bottom right.
 * let pos = createVector(75, 75);
 * point(pos);
 * 
 * // Top right.
 * // Subtract numbers.
 * pos.sub(0, 50);
 * point(pos);
 * 
 * // Top left.
 * // Subtract a p5.Vector.
 * let p2 = createVector(50, 0);
 * pos.sub(p2);
 * point(pos);
 * 
 * // Bottom left.
 * // Subtract an array.
 * let arr = [0, -50];
 * pos.sub(arr);
 * point(pos);
 * 
 * describe('Four black dots arranged in a square on a gray background.');
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
 * // Create p5.Vector objects.
 * let p1 = createVector(75, 75);
 * let p2 = createVector(50, 50);
 * 
 * // Subtract with modifying the original vectors.
 * let p3 = p5.Vector.sub(p1, p2);
 * 
 * // Draw the points.
 * strokeWeight(5);
 * point(p1);
 * point(p2);
 * point(p3);
 * 
 * describe('Three black dots in a diagonal line from top left to bottom right.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Three arrows drawn on a gray square. A red and a blue arrow extend from the top left. A purple arrow extends from the tip of the red arrow to the tip of the blue arrow.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * let origin = createVector(0, 0);
 * 
 * // Draw the red arrow.
 * let v1 = createVector(50, 50);
 * drawArrow(origin, v1, 'red');
 * 
 * // Draw the blue arrow.
 * let v2 = createVector(20, 70);
 * drawArrow(origin, v2, 'blue');
 * 
 * // Purple arrow.
 * let v3 = p5.Vector.sub(v2, v1);
 * drawArrow(v1, v3, 'purple');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function sub(...args: any[], x: number, y?: number, z?: number): void;

/**
 * @param the vector to subtract
 */
function sub(...args: any[], value: p5.Vector | number[]): void;

/**
 * @param number to multiply with the x component of the vector.
 * @param number to multiply with the y component of the vector.
 * @param number to multiply with the z component of the vector.
 */
function mult(...args: any[], x: number, y: number, z?: number): void;

/**
 * @param array to multiply with the components of the vector.
 */
function mult(...args: any[], arr: number[]): void;

/**
 * @param vector to multiply with the components of the original vector.
 */
function mult(...args: any[], v: p5.Vector): void;

/**
 * Divides a vector's `x`, `y`, and `z` components.`div()` can use separate numbers, as in `v.div(1, 2, 3)`, another
 * p5.Vector object, as in `v.div(v2)`, or an array
 * of numbers, as in `v.div([1, 2, 3])`.If only one value is provided, as in `v.div(2)`, then all the components
 * will be divided by 2. If a value isn't provided for a component, it
 * won't change. For example, `v.div(4, 5)` divides `v.x` by, `v.y` by 5,
 * and `v.z` by 1. Calling `div()` with no arguments, as in `v.div()`, has
 * no effect.The static version of `div()`, as in `p5.Vector.div(v, 2)`, returns a new
 * p5.Vector object and doesn't change the
 * originals.
 *
 * @param The number to divide the vector by
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Center.
 * let p = createVector(50, 50);
 * point(p);
 * 
 * // Top-left.
 * // Divide p.x / 2 and p.y / 2
 * p.div(2);
 * point(p);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the center.');
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
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Bottom-right.
 * let p = createVector(50, 75);
 * point(p);
 * 
 * // Top-left.
 * // Divide p.x / 2 and p.y / 3
 * p.div(2, 3);
 * point(p);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the bottom center.');
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
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Bottom-right.
 * let p = createVector(50, 75);
 * point(p);
 * 
 * // Top-left.
 * // Divide p.x / 2 and p.y / 3
 * let arr = [2, 3];
 * p.div(arr);
 * point(p);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the bottom center.');
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
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Bottom-right.
 * let p = createVector(50, 75);
 * point(p);
 * 
 * // Top-left.
 * // Divide p.x / 2 and p.y / 3
 * let p2 = createVector(2, 3);
 * p.div(p2);
 * point(p);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the bottom center.');
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
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Bottom-right.
 * let p = createVector(50, 75);
 * point(p);
 * 
 * // Top-left.
 * // Create a new p5.Vector with
 * // p3.x = p.x / p2.x
 * // p3.y = p.y / p2.y
 * let p2 = createVector(2, 3);
 * let p3 = p5.Vector.div(p, p2);
 * point(p3);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the bottom center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function draw() {
 * background(200);
 * 
 * let origin = createVector(0, 0);
 * 
 * // Draw the red arrow.
 * let v1 = createVector(50, 50);
 * drawArrow(origin, v1, 'red');
 * 
 * // Draw the blue arrow.
 * let v2 = p5.Vector.div(v1, 2);
 * drawArrow(origin, v2, 'blue');
 * 
 * describe('Two arrows extending from the top left corner. The blue arrow is half the length of the red arrow.');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function div(...args: any[], n: number): void;

/**
 * @param number to divide with the x component of the vector.
 * @param number to divide with the y component of the vector.
 * @param number to divide with the z component of the vector.
 */
function div(...args: any[], x: number, y: number, z?: number): void;

/**
 * @param array to divide the components of the vector by.
 */
function div(...args: any[], arr: number[]): void;

/**
 * @param vector to divide the components of the original vector by.
 */
function div(...args: any[], v: p5.Vector): void;

/**
 * Calculates the magnitude (length) of the vector.Use mag() to calculate the magnitude of a 2D vector
 * using components as in `mag(x, y)`.
 *
 * @return magnitude of the vector.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Vector object.
 * let p = createVector(30, 40);
 * 
 * // Draw a line from the origin.
 * line(0, 0, p.x, p.y);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the vector's magnitude.
 * let m = p.mag();
 * text(m, p.x, p.y);
 * 
 * describe('A diagonal black line extends from the top left corner of a gray square. The number 50 is written at the end of the line.');
 * }
 * </code>
 * </div>
 */
function mag(): number;

/**
 * Calculates the magnitude (length) of the vector squared.
 *
 * @return squared magnitude of the vector.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Vector object.
 * let p = createVector(30, 40);
 * 
 * // Draw a line from the origin.
 * line(0, 0, p.x, p.y);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the vector's magnitude squared.
 * let m = p.magSq();
 * text(m, p.x, p.y);
 * 
 * describe('A diagonal black line extends from the top left corner of a gray square. The number 2500 is written at the end of the line.');
 * }
 * </code>
 * </div>
 */
function magSq(): number;

/**
 * Calculates the dot product of two vectors.The dot product is a number that describes the overlap between two vectors.
 * Visually, the dot product can be thought of as the "shadow" one vector
 * casts on another. The dot product's magnitude is largest when two vectors
 * point in the same or opposite directions. Its magnitude is 0 when two
 * vectors form a right angle.The version of `dot()` with one parameter interprets it as another
 * p5.Vector object.The version of `dot()` with multiple parameters interprets them as the
 * `x`, `y`, and `z` components of another vector.The static version of `dot()`, as in `p5.Vector.dot(v1, v2)`, is the same
 * as calling `v1.dot(v2)`.
 *
 * @param x component of the vector.
 * @param y component of the vector.
 * @param z component of the vector.
 * @return dot product.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v1 = createVector(3, 4);
 * let v2 = createVector(3, 0);
 * 
 * // Calculate the dot product.
 * let dp = v1.dot(v2);
 * 
 * // Prints "9" to the console.
 * print(dp);
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v1 = createVector(1, 0);
 * let v2 = createVector(0, 1);
 * 
 * // Calculate the dot product.
 * let dp = p5.Vector.dot(v1, v2);
 * 
 * // Prints "0" to the console.
 * print(dp);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Two arrows drawn on a gray square. A black arrow points to the right and a red arrow follows the mouse. The text "v1 • v2 = something" changes as the mouse moves.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Center.
 * let v0 = createVector(50, 50);
 * 
 * // Draw the black arrow.
 * let v1 = createVector(30, 0);
 * drawArrow(v0, v1, 'black');
 * 
 * // Draw the red arrow.
 * let v2 = createVector(mouseX - 50, mouseY - 50);
 * drawArrow(v0, v2, 'red');
 * 
 * // Display the dot product.
 * let dp = v2.dot(v1);
 * text(`v2 • v1 = ${dp}`, 10, 20);
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function dot(...args: any[], x: number, y?: number, z?: number): number;

/**
 * @param <a href="#/p5.Vector">p5.Vector</a> to be dotted.
 */
function dot(...args: any[], v: p5.Vector): number;

/**
 * Calculates the cross product of two vectors.The cross product is a vector that points straight out of the plane created
 * by two vectors. The cross product's magnitude is the area of the parallelogram
 * formed by the original two vectors.The static version of `cross()`, as in `p5.Vector.cross(v1, v2)`, is the same
 * as calling `v1.cross(v2)`.
 *
 * @param <a href="#/p5.Vector">p5.Vector</a> to be crossed.
 * @return cross product as a <a href="#/p5.Vector">p5.Vector</a>.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v1 = createVector(1, 0);
 * let v2 = createVector(3, 4);
 * 
 * // Calculate the cross product.
 * let cp = v1.cross(v2);
 * 
 * // Prints "p5.Vector Object : [0, 0, 4]" to the console.
 * print(cp.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v1 = createVector(1, 0);
 * let v2 = createVector(3, 4);
 * 
 * // Calculate the cross product.
 * let cp = p5.Vector.cross(v1, v2);
 * 
 * // Prints "p5.Vector Object : [0, 0, 4]" to the console.
 * print(cp.toString());
 * }
 * </code>
 * </div>
 */
function cross(v: p5.Vector): p5.Vector;

/**
 * Scales the components of a p5.Vector object so
 * that its magnitude is 1.The static version of `normalize()`,  as in `p5.Vector.normalize(v)`,
 * returns a new p5.Vector object and doesn't change
 * the original.
 *
 * @return normalized <a href="#/p5.Vector">p5.Vector</a>.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Vector.
 * let v = createVector(10, 20, 2);
 * 
 * // Normalize.
 * v.normalize();
 * 
 * // Prints "p5.Vector Object : [0.445..., 0.890..., 0.089...]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Vector.
 * let v0 = createVector(10, 20, 2);
 * 
 * // Create a normalized copy.
 * let v1 = p5.Vector.normalize(v0);
 * 
 * // Prints "p5.Vector Object : [10, 20, 2]" to the console.
 * print(v0.toString());
 * // Prints "p5.Vector Object : [0.445..., 0.890..., 0.089...]" to the console.
 * print(v1.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe("A red and blue arrow extend from the center of a circle. Both arrows follow the mouse, but the blue arrow's length is fixed to the circle's radius.");
 * }
 * 
 * function draw() {
 * background(240);
 * 
 * // Vector to the center.
 * let v0 = createVector(50, 50);
 * 
 * // Vector from the center to the mouse.
 * let v1 = createVector(mouseX - 50, mouseY - 50);
 * 
 * // Circle's radius.
 * let r = 25;
 * 
 * // Draw the red arrow.
 * drawArrow(v0, v1, 'red');
 * 
 * // Draw the blue arrow.
 * v1.normalize();
 * drawArrow(v0, v1.mult(r), 'blue');
 * 
 * // Draw the circle.
 * noFill();
 * circle(50, 50, r * 2);
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function normalize(): p5.Vector;

/**
 * Limits a vector's magnitude to a maximum value.The static version of `limit()`, as in `p5.Vector.limit(v, 5)`, returns a
 * new p5.Vector object and doesn't change the
 * original.
 *
 * @param maximum magnitude for the vector.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(10, 20, 2);
 * 
 * // Limit its magnitude.
 * v.limit(5);
 * 
 * // Prints "p5.Vector Object : [2.227..., 4.454..., 0.445...]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v0 = createVector(10, 20, 2);
 * 
 * // Create a copy an limit its magintude.
 * let v1 = p5.Vector.limit(v0, 5);
 * 
 * // Prints "p5.Vector Object : [2.227..., 4.454..., 0.445...]" to the console.
 * print(v1.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe("A red and blue arrow extend from the center of a circle. Both arrows follow the mouse, but the blue arrow never crosses the circle's edge.");
 * }
 * function draw() {
 * background(240);
 * 
 * // Vector to the center.
 * let v0 = createVector(50, 50);
 * 
 * // Vector from the center to the mouse.
 * let v1 = createVector(mouseX - 50, mouseY - 50);
 * 
 * // Circle's radius.
 * let r = 25;
 * 
 * // Draw the red arrow.
 * drawArrow(v0, v1, 'red');
 * 
 * // Draw the blue arrow.
 * drawArrow(v0, v1.limit(r), 'blue');
 * 
 * // Draw the circle.
 * noFill();
 * circle(50, 50, r * 2);
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function limit(max: number): void;

/**
 * Sets a vector's magnitude to a given value.The static version of `setMag()`, as in `p5.Vector.setMag(v, 10)`, returns
 * a new p5.Vector object and doesn't change the
 * original.
 *
 * @param new length for this vector.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(3, 4, 0);
 * 
 * // Prints "5" to the console.
 * print(v.mag());
 * 
 * // Set its magnitude to 10.
 * v.setMag(10);
 * 
 * // Prints "p5.Vector Object : [6, 8, 0]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v0 = createVector(3, 4, 0);
 * 
 * // Create a copy with a magnitude of 10.
 * let v1 = p5.Vector.setMag(v0, 10);
 * 
 * // Prints "5" to the console.
 * print(v0.mag());
 * 
 * // Prints "p5.Vector Object : [6, 8, 0]" to the console.
 * print(v1.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Two arrows extend from the top left corner of a square toward its center. The red arrow reaches the center and the blue arrow only extends part of the way.');
 * }
 * 
 * function draw() {
 * background(240);
 * 
 * let origin = createVector(0, 0);
 * let v = createVector(50, 50);
 * 
 * // Draw the red arrow.
 * drawArrow(origin, v, 'red');
 * 
 * // Set v's magnitude to 30.
 * v.setMag(30);
 * 
 * // Draw the blue arrow.
 * drawArrow(origin, v, 'blue');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function setMag(n: any, len: number): void;

/**
 * Calculates the angle a 2D vector makes with the positive x-axis.By convention, the positive x-axis has an angle of 0. Angles increase in
 * the clockwise direction.If the vector was created with
 * createVector(), `heading()` returns angles
 * in the units of the current angleMode().The static version of `heading()`, as in `p5.Vector.heading(v)`, works the
 * same way.
 *
 * @return angle of rotation.
 * @example <div class = "norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(1, 1);
 * 
 * // Prints "0.785..." to the console.
 * print(v.heading());
 * 
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Prints "45" to the console.
 * print(v.heading());
 * }
 * </code>
 * </div>
 * 
 * <div class = "norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(1, 1);
 * 
 * // Prints "0.785..." to the console.
 * print(p5.Vector.heading(v));
 * 
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Prints "45" to the console.
 * print(p5.Vector.heading(v));
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A black arrow extends from the top left of a square to its center. The text "Radians: 0.79" and "Degrees: 45" is written near the tip of the arrow.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * let origin = createVector(0, 0);
 * let v = createVector(50, 50);
 * 
 * // Draw the black arrow.
 * drawArrow(origin, v, 'black');
 * 
 * // Use radians.
 * angleMode(RADIANS);
 * 
 * // Display the heading in radians.
 * let h = round(v.heading(), 2);
 * text(`Radians: ${h}`, 20, 70);
 * 
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Display the heading in degrees.
 * h = v.heading();
 * text(`Degrees: ${h}`, 20, 85);
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function heading(): number;

/**
 * Rotates a 2D vector to a specific angle without changing its magnitude.By convention, the positive x-axis has an angle of 0. Angles increase in
 * the clockwise direction.If the vector was created with
 * createVector(), `setHeading()` uses
 * the units of the current angleMode().
 *
 * @param angle of rotation.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(0, 1);
 * 
 * // Prints "1.570..." to the console.
 * print(v.heading());
 * 
 * // Point to the left.
 * v.setHeading(PI);
 * 
 * // Prints "3.141..." to the console.
 * print(v.heading());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Create a p5.Vector object.
 * let v = createVector(0, 1);
 * 
 * // Prints "90" to the console.
 * print(v.heading());
 * 
 * // Point to the left.
 * v.setHeading(180);
 * 
 * // Prints "180" to the console.
 * print(v.heading());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Two arrows extend from the center of a gray square. The red arrow points to the right and the blue arrow points down.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Create p5.Vector objects.
 * let v0 = createVector(50, 50);
 * let v1 = createVector(30, 0);
 * 
 * // Draw the red arrow.
 * drawArrow(v0, v1, 'red');
 * 
 * // Point down.
 * v1.setHeading(HALF_PI);
 * 
 * // Draw the blue arrow.
 * drawArrow(v0, v1, 'blue');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function setHeading(a: any, angle: number): void;

/**
 * Rotates a 2D vector by an angle without changing its magnitude.By convention, the positive x-axis has an angle of 0. Angles increase in
 * the clockwise direction.If the vector was created with
 * createVector(), `rotate()` uses
 * the units of the current angleMode().The static version of `rotate()`, as in `p5.Vector.rotate(v, PI)`,
 * returns a new p5.Vector object and doesn't change
 * the original.
 *
 * @param angle of rotation.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(1, 0);
 * 
 * // Prints "p5.Vector Object : [1, 0, 0]" to the console.
 * print(v.toString());
 * 
 * // Rotate a quarter turn.
 * v.rotate(HALF_PI);
 * 
 * // Prints "p5.Vector Object : [0, 1, 0]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Create a p5.Vector object.
 * let v = createVector(1, 0);
 * 
 * // Prints "p5.Vector Object : [1, 0, 0]" to the console.
 * print(v.toString());
 * 
 * // Rotate a quarter turn.
 * v.rotate(90);
 * 
 * // Prints "p5.Vector Object : [0, 1, 0]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v0 = createVector(1, 0);
 * 
 * // Create a rotated copy.
 * let v1 = p5.Vector.rotate(v0, HALF_PI);
 * 
 * // Prints "p5.Vector Object : [1, 0, 0]" to the console.
 * print(v0.toString());
 * // Prints "p5.Vector Object : [0, 1, 0]" to the console.
 * print(v1.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Create a p5.Vector object.
 * let v0 = createVector(1, 0);
 * 
 * // Create a rotated copy.
 * let v1 = p5.Vector.rotate(v0, 90);
 * 
 * // Prints "p5.Vector Object : [1, 0, 0]" to the console.
 * print(v0.toString());
 * 
 * // Prints "p5.Vector Object : [0, 1, 0]" to the console.
 * print(v1.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let v0;
 * let v1;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create p5.Vector objects.
 * v0 = createVector(50, 50);
 * v1 = createVector(30, 0);
 * 
 * describe('A black arrow extends from the center of a gray square. The arrow rotates clockwise.');
 * }
 * 
 * function draw() {
 * background(240);
 * 
 * // Rotate v1.
 * v1.rotate(0.01);
 * 
 * // Draw the black arrow.
 * drawArrow(v0, v1, 'black');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function rotate(a: any, angle: number): void;

/**
 * Calculates the angle between two vectors.The angles returned are signed, which means that
 * `v1.angleBetween(v2) === -v2.angleBetween(v1)`.If the vector was created with
 * createVector(), `angleBetween()` returns
 * angles in the units of the current
 * angleMode().
 *
 * @param x, y, and z components of a <a href="#/p5.Vector">p5.Vector</a>.
 * @return angle between the vectors.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v0 = createVector(1, 0);
 * let v1 = createVector(0, 1);
 * 
 * // Prints "1.570..." to the console.
 * print(v0.angleBetween(v1));
 * 
 * // Prints "-1.570..." to the console.
 * print(v1.angleBetween(v0));
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Use degrees.
 * angleMode(DEGREES);
 * // Create p5.Vector objects.
 * let v0 = createVector(1, 0);
 * let v1 = createVector(0, 1);
 * 
 * // Prints "90" to the console.
 * print(v0.angleBetween(v1));
 * 
 * // Prints "-90" to the console.
 * print(v1.angleBetween(v0));
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v0 = createVector(1, 0);
 * let v1 = createVector(0, 1);
 * 
 * // Prints "1.570..." to the console.
 * print(p5.Vector.angleBetween(v0, v1));
 * 
 * // Prints "-1.570..." to the console.
 * print(p5.Vector.angleBetween(v1, v0));
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Create p5.Vector objects.
 * let v0 = createVector(1, 0);
 * let v1 = createVector(0, 1);
 * 
 * // Prints "90" to the console.
 * print(p5.Vector.angleBetween(v0, v1));
 * 
 * // Prints "-90" to the console.
 * print(p5.Vector.angleBetween(v1, v0));
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Two arrows extend from the center of a gray square. A red arrow points to the right and a blue arrow points down. The text "Radians: 1.57" and "Degrees: 90" is written above the arrows.');
 * }
 * function draw() {
 * background(200);
 * 
 * // Create p5.Vector objects.
 * let v0 = createVector(50, 50);
 * let v1 = createVector(30, 0);
 * let v2 = createVector(0, 30);
 * 
 * // Draw the red arrow.
 * drawArrow(v0, v1, 'red');
 * 
 * // Draw the blue arrow.
 * drawArrow(v0, v2, 'blue');
 * 
 * // Use radians.
 * angleMode(RADIANS);
 * 
 * // Display the angle in radians.
 * let angle = round(v1.angleBetween(v2), 2);
 * text(`Radians: ${angle}`, 20, 20);
 * 
 * // Use degrees.
 * angleMode(DEGREES);
 * 
 * // Display the angle in degrees.
 * angle = round(v1.angleBetween(v2), 2);
 * text(`Degrees: ${angle}`, 20, 35);
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function angleBetween(v: any, value: p5.Vector): number;

/**
 * Calculates new `x`, `y`, and `z` components that are proportionally the
 * same distance between two vectors.The `amt` parameter is the amount to interpolate between the old vector and
 * the new vector. 0.0 keeps all components equal to the old vector's, 0.5 is
 * halfway between, and 1.0 sets all components equal to the new vector's.The static version of `lerp()`, as in `p5.Vector.lerp(v0, v1, 0.5)`,
 * returns a new p5.Vector object and doesn't change
 * the original.
 *
 * @param x component.
 * @param y component.
 * @param z component.
 * @param amount of interpolation between 0.0 (old vector)
 * and 1.0 (new vector). 0.5 is halfway between.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v0 = createVector(1, 1, 1);
 * let v1 = createVector(3, 3, 3);
 * 
 * // Interpolate.
 * v0.lerp(v1, 0.5);
 * 
 * // Prints "p5.Vector Object : [2, 2, 2]" to the console.
 * print(v0.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(1, 1, 1);
 * 
 * // Interpolate.
 * v.lerp(3, 3, 3, 0.5);
 * 
 * // Prints "p5.Vector Object : [2, 2, 2]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v0 = createVector(1, 1, 1);
 * let v1 = createVector(3, 3, 3);
 * 
 * // Interpolate.
 * let v2 = p5.Vector.lerp(v0, v1, 0.5);
 * 
 * // Prints "p5.Vector Object : [2, 2, 2]" to the console.
 * print(v2.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Three arrows extend from the center of a gray square. A red arrow points to the right, a blue arrow points down, and a purple arrow points to the bottom right.');
 * }
 * function draw() {
 * background(200);
 * 
 * // Create p5.Vector objects.
 * let v0 = createVector(50, 50);
 * let v1 = createVector(30, 0);
 * let v2 = createVector(0, 30);
 * 
 * // Interpolate.
 * let v3 = p5.Vector.lerp(v1, v2, 0.5);
 * 
 * // Draw the red arrow.
 * drawArrow(v0, v1, 'red');
 * 
 * // Draw the blue arrow.
 * drawArrow(v0, v2, 'blue');
 * 
 * // Draw the purple arrow.
 * drawArrow(v0, v3, 'purple');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function lerp(x: number, y: number, z: number, amt: number): void;

/**
 * @param <a href="#/p5.Vector">p5.Vector</a> to lerp toward.
 */
function lerp(x: any, y: any, z: any, amt: number, v: p5.Vector): void;

/**
 * Calculates a new heading and magnitude that are between two vectors.The `amt` parameter is the amount to interpolate between the old vector and
 * the new vector. 0.0 keeps the heading and magnitude equal to the old
 * vector's, 0.5 sets them halfway between, and 1.0 sets the heading and
 * magnitude equal to the new vector's.`slerp()` differs from lerp() because
 * it interpolates magnitude. Calling `v0.slerp(v1, 0.5)` sets `v0`'s
 * magnitude to a value halfway between its original magnitude and `v1`'s.
 * Calling `v0.lerp(v1, 0.5)` makes no such guarantee.The static version of `slerp()`, as in `p5.Vector.slerp(v0, v1, 0.5)`,
 * returns a new p5.Vector object and doesn't change
 * the original.
 *
 * @param <a href="#/p5.Vector">p5.Vector</a> to slerp toward.
 * @param amount of interpolation between 0.0 (old vector)
 * and 1.0 (new vector). 0.5 is halfway between.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v0 = createVector(3, 0);
 * 
 * // Prints "3" to the console.
 * print(v0.mag());
 * 
 * // Prints "0" to the console.
 * print(v0.heading());
 * 
 * // Create a p5.Vector object.
 * let v1 = createVector(0, 1);
 * 
 * // Prints "1" to the console.
 * print(v1.mag());
 * 
 * // Prints "1.570..." to the console.
 * print(v1.heading());
 * 
 * // Interpolate halfway between v0 and v1.
 * v0.slerp(v1, 0.5);
 * 
 * // Prints "2" to the console.
 * print(v0.mag());
 * 
 * // Prints "0.785..." to the console.
 * print(v0.heading());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v0 = createVector(3, 0);
 * 
 * // Prints "3" to the console.
 * print(v0.mag());
 * 
 * // Prints "0" to the console.
 * print(v0.heading());
 * 
 * // Create a p5.Vector object.
 * let v1 = createVector(0, 1);
 * 
 * // Prints "1" to the console.
 * print(v1.mag());
 * 
 * // Prints "1.570..." to the console.
 * print(v1.heading());
 * 
 * // Create a p5.Vector that's halfway between v0 and v1.
 * let v3 = p5.Vector.slerp(v0, v1, 0.5);
 * 
 * // Prints "2" to the console.
 * print(v3.mag());
 * 
 * // Prints "0.785..." to the console.
 * print(v3.heading());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Three arrows extend from the center of a gray square. A red arrow points to the right, a blue arrow points to the left, and a purple arrow points down.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Create p5.Vector objects.
 * let v0 = createVector(50, 50);
 * let v1 = createVector(20, 0);
 * let v2 = createVector(-40, 0);
 * 
 * // Create a p5.Vector that's halfway between v1 and v2.
 * let v3 = p5.Vector.slerp(v1, v2, 0.5);
 * 
 * // Draw the red arrow.
 * drawArrow(v0, v1, 'red');
 * 
 * // Draw the blue arrow.
 * drawArrow(v0, v2, 'blue');
 * 
 * // Draw the purple arrow.
 * drawArrow(v0, v3, 'purple');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function slerp(v: p5.Vector, amt: number): p5.Vector;

/**
 * Reflects a vector about a line in 2D or a plane in 3D.The orientation of the line or plane is described by a normal vector that
 * points away from the shape.The static version of `reflect()`, as in `p5.Vector.reflect(v, n)`,
 * returns a new p5.Vector object and doesn't change
 * the original.
 *
 * @param <a href="#/p5.Vector">p5.Vector</a>
 * to reflect about.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a normal vector.
 * let n = createVector(0, 1);
 * // Create a vector to reflect.
 * let v = createVector(4, 6);
 * 
 * // Reflect v about n.
 * v.reflect(n);
 * 
 * // Prints "p5.Vector Object : [4, -6, 0]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create a normal vector.
 * let n = createVector(0, 1);
 * 
 * // Create a vector to reflect.
 * let v0 = createVector(4, 6);
 * 
 * // Create a reflected vector.
 * let v1 = p5.Vector.reflect(v0, n);
 * 
 * // Prints "p5.Vector Object : [4, -6, 0]" to the console.
 * print(v1.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Three arrows extend from the center of a gray square with a vertical line down its middle. A black arrow points to the right, a blue arrow points to the bottom left, and a red arrow points to the bottom right.');
 * }
 * function draw() {
 * background(200);
 * 
 * // Draw a vertical line.
 * line(50, 0, 50, 100);
 * 
 * // Create a normal vector.
 * let n = createVector(1, 0);
 * 
 * // Center.
 * let v0 = createVector(50, 50);
 * 
 * // Create a vector to reflect.
 * let v1 = createVector(30, 40);
 * 
 * // Create a reflected vector.
 * let v2 = p5.Vector.reflect(v1, n);
 * 
 * // Scale the normal vector for drawing.
 * n.setMag(30);
 * 
 * // Draw the black arrow.
 * drawArrow(v0, n, 'black');
 * 
 * // Draw the red arrow.
 * drawArrow(v0, v1, 'red');
 * 
 * // Draw the blue arrow.
 * drawArrow(v0, v2, 'blue');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function reflect(surfaceNormal: p5.Vector): void;

/**
 * Returns the vector's components as an array of numbers.
 *
 * @return array with the vector's components.
 * @example <div class = "norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = createVector(20, 30);
 * 
 * // Prints "[20, 30, 0]" to the console.
 * print(v.array());
 * }
 * </code>
 * </div>
 */
function array(): number[];

/**
 * Checks whether all the vector's components are equal to another vector's.`equals()` returns `true` if the vector's components are all the same as another
 * vector's and `false` if not.The version of `equals()` with one parameter interprets it as another
 * p5.Vector object.The version of `equals()` with multiple parameters interprets them as the
 * components of another vector. Any missing parameters are assigned the value
 * 0.The static version of `equals()`, as in `p5.Vector.equals(v0, v1)`,
 * interprets both parameters as p5.Vector objects.
 *
 * @param x component of the vector.
 * @param y component of the vector.
 * @param z component of the vector.
 * @return whether the vectors are equal.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v0 = createVector(10, 20, 30);
 * let v1 = createVector(10, 20, 30);
 * let v2 = createVector(0, 0, 0);
 * 
 * // Prints "true" to the console.
 * print(v0.equals(v1));
 * 
 * // Prints "false" to the console.
 * print(v0.equals(v2));
 * }
 * </code>
 * </div>
 * 
 * <div class = "norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v0 = createVector(5, 10, 20);
 * let v1 = createVector(5, 10, 20);
 * let v2 = createVector(13, 10, 19);
 * 
 * // Prints "true" to the console.
 * print(v0.equals(v1.x, v1.y, v1.z));
 * 
 * // Prints "false" to the console.
 * print(v0.equals(v2.x, v2.y, v2.z));
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create p5.Vector objects.
 * let v0 = createVector(10, 20, 30);
 * let v1 = createVector(10, 20, 30);
 * let v2 = createVector(0, 0, 0);
 * 
 * // Prints "true" to the console.
 * print(p5.Vector.equals(v0, v1));
 * 
 * // Prints "false" to the console.
 * print(p5.Vector.equals(v0, v2));
 * }
 * </code>
 * </div>
 */
function equals(...args: any[], x?: number, y?: number, z?: number): boolean;

/**
 * @param vector to compare.
 */
function equals(...args: any[], value: p5.Vector | Array): boolean;

/**
 * Creates a new 2D vector from an angle.
 *
 * @param desired angle, in radians. Unaffected by <a href="#/p5/angleMode">angleMode()</a>.
 * @param length of the new vector (defaults to 1).
 * @return new <a href="#/p5.Vector">p5.Vector</a> object.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = p5.Vector.fromAngle(0);
 * 
 * // Prints "p5.Vector Object : [1, 0, 0]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = p5.Vector.fromAngle(0, 30);
 * 
 * // Prints "p5.Vector Object : [30, 0, 0]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('A black arrow extends from the center of a gray square. It points to the right.');
 * }
 * function draw() {
 * background(200);
 * 
 * // Create a p5.Vector to the center.
 * let v0 = createVector(50, 50);
 * 
 * // Create a p5.Vector with an angle 0 and magnitude 30.
 * let v1 = p5.Vector.fromAngle(0, 30);
 * 
 * // Draw the black arrow.
 * drawArrow(v0, v1, 'black');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function fromAngle(angle: number, length?: number): p5.Vector;

/**
 * Creates a new 3D vector from a pair of ISO spherical angles.
 *
 * @param polar angle in radians (zero is up).
 * @param azimuthal angle in radians
 * (zero is out of the screen).
 * @param length of the new vector (defaults to 1).
 * @return new <a href="#/p5.Vector">p5.Vector</a> object.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = p5.Vector.fromAngles(0, 0);
 * 
 * // Prints "p5.Vector Object : [0, -1, 0]" to the console.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A light shines on a pink sphere as it orbits.');
 * }
 * 
 * function draw() {
 * background(0);
 * 
 * // Calculate the ISO angles.
 * let theta = frameCount *  0.05;
 * let phi = 0;
 * 
 * // Create a p5.Vector object.
 * let v = p5.Vector.fromAngles(theta, phi, 100);
 * 
 * // Create a point light using the p5.Vector.
 * let c = color('deeppink');
 * pointLight(c, v);
 * 
 * // Style the sphere.
 * fill(255);
 * noStroke();
 * 
 * // Draw the sphere.
 * sphere(35);
 * }
 * </code>
 * </div>
 */
function fromAngles(theta: number, phi: number, length?: number): p5.Vector;

/**
 * Creates a new 2D unit vector with a random heading.
 *
 * @return new <a href="#/p5.Vector">p5.Vector</a> object.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = p5.Vector.random2D();
 * 
 * // Prints "p5.Vector Object : [x, y, 0]" to the console
 * // where x and y are small random numbers.
 * print(v.toString());
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Slow the frame rate.
 * frameRate(1);
 * 
 * describe('A black arrow in extends from the center of a gray square. It changes direction once per second.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Create a p5.Vector to the center.
 * let v0 = createVector(50, 50);
 * 
 * // Create a random p5.Vector.
 * let v1 = p5.Vector.random2D();
 * 
 * // Scale v1 for drawing.
 * v1.mult(30);
 * 
 * // Draw the black arrow.
 * drawArrow(v0, v1, 'black');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function random2D(): p5.Vector;

/**
 * Creates a new 3D unit vector with a random heading.
 *
 * @return new <a href="#/p5.Vector">p5.Vector</a> object.
 * @example <div class="norender">
 * <code>
 * function setup() {
 * // Create a p5.Vector object.
 * let v = p5.Vector.random3D();
 * 
 * // Prints "p5.Vector Object : [x, y, z]" to the console
 * // where x, y, and z are small random numbers.
 * print(v.toString());
 * }
 * </code>
 * </div>
 */
function random3D(): p5.Vector;

/**
 * @param the <a href="#/p5.Vector">p5.Vector</a> to create a copy of
 * @return the copy of the <a href="#/p5.Vector">p5.Vector</a> object
 */
function copy(v: p5.Vector): p5.Vector;

/**
 * @param A <a href="#/p5.Vector">p5.Vector</a> to add
 * @param A <a href="#/p5.Vector">p5.Vector</a> to add
 * @param vector to receive the result.
 * @return resulting <a href="#/p5.Vector">p5.Vector</a>.
 */
function add(v1: p5.Vector, v2: p5.Vector, target?: p5.Vector): p5.Vector;

/**
 * @param The dividend <a href="#/p5.Vector">p5.Vector</a>
 * @param The divisor <a href="#/p5.Vector">p5.Vector</a>
 */
function rem(v1: p5.Vector, v2: p5.Vector): void;

/**
 * @return The resulting <a href="#/p5.Vector">p5.Vector</a>
 */
function rem(v1: p5.Vector, v2: p5.Vector): p5.Vector;

/**
 * @param A <a href="#/p5.Vector">p5.Vector</a> to subtract from
 * @param A <a href="#/p5.Vector">p5.Vector</a> to subtract
 * @param vector to receive the result.
 * @return The resulting <a href="#/p5.Vector">p5.Vector</a>
 */
function sub(v1: p5.Vector, v2: p5.Vector, target?: p5.Vector): p5.Vector;

/**
 * Multiplies a vector by a scalar and returns a new vector.
 *
 */
function mult(v: any, n: any, target: any): void;

/**
 * @return resulting new <a href="#/p5.Vector">p5.Vector</a>.
 */
function mult(v: any, n: any, target: any, x: number, y: number, z?: number): p5.Vector;

/**
 * @param vector to receive the result.
 */
function mult(v: p5.Vector, n: number, target?: p5.Vector): void;

/**
 */
function mult(v: any, n: any, target?: p5.Vector, v0: p5.Vector, v1: p5.Vector): void;

/**
 */
function mult(v: any, n: any, target?: p5.Vector, v0: p5.Vector, arr: number[]): void;

/**
 * Rotates the vector (only 2D vectors) by the given angle; magnitude remains the same. Returns a new vector.
 *
 */
function rotate(v: any, a: any, target: any): void;

/**
 * @param The vector to receive the result
 */
function rotate(v: p5.Vector, a: any, target?: p5.Vector, angle: number): void;

/**
 * Divides a vector by a scalar and returns a new vector.
 *
 */
function div(v: any, n: any, target: any): void;

/**
 * @return The resulting new <a href="#/p5.Vector">p5.Vector</a>
 */
function div(v: any, n: any, target: any, x: number, y: number, z?: number): p5.Vector;

/**
 * @param The vector to receive the result
 */
function div(v: p5.Vector, n: number, target?: p5.Vector): void;

/**
 */
function div(v: any, n: any, target?: p5.Vector, v0: p5.Vector, v1: p5.Vector): void;

/**
 */
function div(v: any, n: any, target?: p5.Vector, v0: p5.Vector, arr: number[]): void;

/**
 * Calculates the dot product of two vectors.
 *
 */
function dot(v1: any, v2: any): void;

/**
 * @param first <a href="#/p5.Vector">p5.Vector</a>.
 * @param second <a href="#/p5.Vector">p5.Vector</a>.
 * @return dot product.
 */
function dot(v1: p5.Vector, v2: p5.Vector): number;

/**
 * Calculates the cross product of two vectors.
 *
 */
function cross(v1: any, v2: any): void;

/**
 * @param first <a href="#/p5.Vector">p5.Vector</a>.
 * @param second <a href="#/p5.Vector">p5.Vector</a>.
 * @return cross product.
 */
function cross(v1: p5.Vector, v2: p5.Vector): number;

/**
 * Calculates the Euclidean distance between two points (considering a
 * point as a vector object).
 *
 */
function dist(v1: any, v2: any): void;

/**
 * @param The first <a href="#/p5.Vector">p5.Vector</a>
 * @param The second <a href="#/p5.Vector">p5.Vector</a>
 * @return The distance
 */
function dist(v1: p5.Vector, v2: p5.Vector): number;

/**
 * Linear interpolate a vector to another vector and return the result as a
 * new vector.
 *
 */
function lerp(v1: any, v2: any, amt: any, target: any): void;

/**
 * @param The vector to receive the result
 * @return The lerped value
 */
function lerp(v1: p5.Vector, v2: p5.Vector, amt: number, target?: p5.Vector): p5.Vector;

/**
 * Performs spherical linear interpolation with the other vector
 * and returns the resulting vector.
 * This works in both 3D and 2D. As for 2D, the result of slerping
 * between 2D vectors is always a 2D vector.
 *
 */
function slerp(v1: any, v2: any, amt: any, target: any): void;

/**
 * @param old vector.
 * @param new vector.
 * @param vector to receive the result.
 * @return slerped vector between v1 and v2
 */
function slerp(v1: p5.Vector, v2: p5.Vector, amt: number, target?: p5.Vector): p5.Vector;

/**
 * Calculates the magnitude (length) of the vector and returns the result as
 * a float (this is simply the equation `sqrt(x*x + y*y + z*z)`.)
 *
 */
function mag(vecT: any): void;

/**
 * @param The vector to return the magnitude of
 * @return The magnitude of vecT
 */
function mag(vecT: p5.Vector): number;

/**
 * Calculates the squared magnitude of the vector and returns the result
 * as a float (this is simply the equation (x*x + y*y + z*z).)
 * Faster if the real length is not required in the
 * case of comparing vectors, etc.
 *
 */
function magSq(vecT: any): void;

/**
 * @param the vector to return the squared magnitude of
 * @return the squared magnitude of vecT
 */
function magSq(vecT: p5.Vector): number;

/**
 * Normalize the vector to length 1 (make it a unit vector).
 *
 */
function normalize(v: any, target: any): void;

/**
 * @param The vector to normalize
 * @param The vector to receive the result
 * @return The vector v, normalized to a length of 1
 */
function normalize(v: p5.Vector, target?: p5.Vector): p5.Vector;

/**
 * Limit the magnitude of the vector to the value used for the max
 * parameter.
 *
 */
function limit(v: any, max: any, target: any): void;

/**
 * @param the vector to limit
 * @param the vector to receive the result (Optional)
 * @return v with a magnitude limited to max
 */
function limit(v: p5.Vector, max: number, target?: p5.Vector): p5.Vector;

/**
 * Set the magnitude of the vector to the value used for the len
 * parameter.
 *
 */
function setMag(v: any, len: any, target: any): void;

/**
 * @param the vector to set the magnitude of
 * @param the vector to receive the result (Optional)
 * @return v with a magnitude set to len
 */
function setMag(v: p5.Vector, len: number, target?: p5.Vector): p5.Vector;

/**
 * Calculate the angle of rotation for this vector (only 2D vectors).
 * p5.Vectors created using createVector()
 * will take the current angleMode into
 * consideration, and give the angle in radians or degrees accordingly.
 *
 */
function heading(v: any): void;

/**
 * @param the vector to find the angle of
 * @return the angle of rotation
 */
function heading(v: p5.Vector): number;

/**
 * Calculates and returns the angle between two vectors. This function will take
 * the angleMode on v1 into consideration, and
 * give the angle in radians or degrees accordingly.
 *
 */
function angleBetween(v1: any, v2: any): void;

/**
 * @param the first vector.
 * @param the second vector.
 * @return angle between the two vectors.
 */
function angleBetween(v1: p5.Vector, v2: p5.Vector): number;

/**
 * Reflect a vector about a normal to a line in 2D, or about a normal to a
 * plane in 3D.
 *
 */
function reflect(incidentVector: any, surfaceNormal: any, target: any): void;

/**
 * @param vector to be reflected.
 * @param vector to receive the result.
 * @return the reflected vector
 */
function reflect(incidentVector: p5.Vector, surfaceNormal: p5.Vector, target?: p5.Vector): p5.Vector;

/**
 * Return a representation of this vector as a float array. This is only
 * for temporary use. If used in any other fashion, the contents should be
 * copied by using the p5.Vector.copy()
 * method to copy into your own vector.
 *
 */
function array(v: any): void;

/**
 * @param the vector to convert to an array
 * @return an Array with the 3 values
 */
function array(v: p5.Vector): number[];

/**
 * Equality check against a p5.Vector
 *
 */
function equals(v1: any, v2: any): void;

/**
 * @param the first vector to compare
 * @param the second vector to compare
 */
function equals(v1: p5.Vector | Array, v2: p5.Vector | Array): boolean;

/**
 * Multiplies a vector's `x`, `y`, and `z` components.`mult()` can use separate numbers, as in `v.mult(1, 2, 3)`, another
 * p5.Vector object, as in `v.mult(v2)`, or an array
 * of numbers, as in `v.mult([1, 2, 3])`.If only one value is provided, as in `v.mult(2)`, then all the components
 * will be multiplied by 2. If a value isn't provided for a component, it
 * won't change. For example, `v.mult(4, 5)` multiplies `v.x` by, `v.y` by 5,
 * and `v.z` by 1. Calling `mult()` with no arguments, as in `v.mult()`, has
 * no effect.The static version of `mult()`, as in `p5.Vector.mult(v, 2)`, returns a new
 * p5.Vector object and doesn't change the
 * originals.
 *
 * @param The number to multiply with the vector
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Top-left.
 * let p = createVector(25, 25);
 * point(p);
 * 
 * // Center.
 * // Multiply all components by 2.
 * p.mult(2);
 * point(p);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * strokeWeight(5);
 * 
 * // Top-left.
 * let p = createVector(25, 25);
 * point(p);
 * 
 * // Bottom-right.
 * // Multiply p.x * 2 and p.y * 3
 * p.mult(2, 3);
 * point(p);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the bottom center.');
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
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Top-left.
 * let p = createVector(25, 25);
 * point(p);
 * 
 * // Bottom-right.
 * // Multiply p.x * 2 and p.y * 3
 * let arr = [2, 3];
 * p.mult(arr);
 * point(p);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the bottom center.');
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
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Top-left.
 * let p = createVector(25, 25);
 * point(p);
 * 
 * // Bottom-right.
 * // Multiply p.x * p2.x and p.y * p2.y
 * let p2 = createVector(2, 3);
 * p.mult(p2);
 * point(p);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the bottom center.');
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
 * // Style the points.
 * strokeWeight(5);
 * 
 * // Top-left.
 * let p = createVector(25, 25);
 * point(p);
 * 
 * // Bottom-right.
 * // Create a new p5.Vector with
 * // p3.x = p.x * p2.x
 * // p3.y = p.y * p2.y
 * let p2 = createVector(2, 3);
 * let p3 = p5.Vector.mult(p, p2);
 * point(p3);
 * 
 * describe('Two black dots drawn on a gray square. One dot is in the top left corner and the other is in the bottom center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe('Two arrows extending from the top left corner. The blue arrow is twice the length of the red arrow.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * let origin = createVector(0, 0);
 * 
 * // Draw the red arrow.
 * let v1 = createVector(25, 25);
 * drawArrow(origin, v1, 'red');
 * 
 * // Draw the blue arrow.
 * let v2 = p5.Vector.mult(v1, 2);
 * drawArrow(origin, v2, 'blue');
 * }
 * 
 * // Draws an arrow between two vectors.
 * function drawArrow(base, vec, myColor) {
 * push();
 * stroke(myColor);
 * strokeWeight(3);
 * fill(myColor);
 * translate(base.x, base.y);
 * line(0, 0, vec.x, vec.y);
 * rotate(vec.heading());
 * let arrowSize = 7;
 * translate(vec.mag() - arrowSize, 0);
 * triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
 * pop();
 * }
 * </code>
 * </div>
 */
function mult(n: number): void;

/**
 * Replaces the components of a p5.Vector that are very close to zero with zero.In computers, handling numbers with decimals can give slightly imprecise answers due to the way those numbers are represented.
 * This can make it hard to check if a number is zero, as it may be close but not exactly zero.
 * This method rounds very close numbers to zero to make those checks easier
 *
 * @return with components very close to zero replaced with zero.
 */
function clampToZero(): p5.Vector;

}

export default function p5_Vector(p5: any, fn: any): void;
