// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Multiplies a quaternion with other quaternion.
 *
 * @param quaternion to multiply with the quaternion calling the method.
 */
function mult(quat?: p5.Quat): void;

/**
 * Returns a Quaternion for the
 * axis angle representation of the rotation
 *
 * @param Angle with which the points needs to be rotated
 * @param x component of the axis vector
 * @param y component of the axis vector
 * @param z component of the axis vector
 */
function fromAxisAngle(angle?: number, x?: number, y?: number, z?: number): void;

/**
 * This is similar to quaternion multiplication
 * but when multipying vector with quaternion
 * the multiplication can be simplified to the below formula.
 * This was taken from the below stackexchange link
 *
 * @param vector to rotate on the axis quaternion
 */
function rotateVector(p?: p5.Vector): void;

/**
 * Rotates the Quaternion by the quaternion passed
 * which contains the axis of roation and angle of rotation
 *
 * @param axis quaternion which contains
 * the axis of rotation and angle of rotation
 */
function rotateBy(axesQuat?: p5.Quat): void;

}

export default function p5_Quat(p5: any, fn: any): void;
