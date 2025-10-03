// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * The setMoveThreshold() function is used to set the movement threshold for
 * the deviceMoved() function. The default threshold is set to 0.5.
 *
 * @param The threshold value
 * @example <div class="norender">
 * <code>
 * // Run this example on a mobile device
 * // You will need to move the device incrementally further
 * // the closer the square's color gets to white in order to change the value.
 * 
 * let value = 0;
 * let threshold = 0.5;
 * function setup() {
 * setMoveThreshold(threshold);
 * }
 * function draw() {
 * fill(value);
 * rect(25, 25, 50, 50);
 * describe(`50-by-50 black rect in center of canvas.
 * turns white on mobile when device moves`);
 * }
 * function deviceMoved() {
 * value = value + 5;
 * threshold = threshold + 0.1;
 * if (value > 255) {
 * value = 0;
 * threshold = 30;
 * }
 * setMoveThreshold(threshold);
 * }
 * </code>
 * </div>
 */
function setMoveThreshold(value: number): void;

/**
 * The setShakeThreshold() function is used to set the movement threshold for
 * the deviceShaken() function. The default threshold is set to 30.
 *
 * @param The threshold value
 * @example <div class="norender">
 * <code>
 * // Run this example on a mobile device
 * // You will need to shake the device more firmly
 * // the closer the box's fill gets to white in order to change the value.
 * 
 * let value = 0;
 * let threshold = 30;
 * function setup() {
 * setShakeThreshold(threshold);
 * }
 * function draw() {
 * fill(value);
 * rect(25, 25, 50, 50);
 * describe(`50-by-50 black rect in center of canvas.
 * turns white on mobile when device is being shaked`);
 * }
 * function deviceMoved() {
 * value = value + 5;
 * threshold = threshold + 5;
 * if (value > 255) {
 * value = 0;
 * threshold = 30;
 * }
 * setShakeThreshold(threshold);
 * }
 * </code>
 * </div>
 */
function setShakeThreshold(value: number): void;

/**
 * The deviceMoved() function is called when the device is moved by more than
 * the threshold value along X, Y or Z axis. The default threshold is set to 0.5.
 * The threshold value can be changed using setMoveThreshold().
 *
 * @example <div class="norender">
 * <code>
 * // Run this example on a mobile device
 * // Move the device around
 * // to change the value.
 * 
 * let value = 0;
 * function draw() {
 * fill(value);
 * rect(25, 25, 50, 50);
 * describe(`50-by-50 black rect in center of canvas.
 * turns white on mobile when device moves`);
 * }
 * function deviceMoved() {
 * value = value + 5;
 * if (value > 255) {
 * value = 0;
 * }
 * }
 * </code>
 * </div>
 */
function deviceMoved(): void;

/**
 * The deviceTurned() function is called when the device rotates by
 * more than 90 degrees continuously.The axis that triggers the deviceTurned() method is stored in the turnAxis
 * variable. The deviceTurned() method can be locked to trigger on any axis:
 * X, Y or Z by comparing the turnAxis variable to 'X', 'Y' or 'Z'.
 *
 * @example <div class="norender">
 * <code>
 * // Run this example on a mobile device
 * // Rotate the device by 90 degrees
 * // to change the value.
 * 
 * let value = 0;
 * function draw() {
 * fill(value);
 * rect(25, 25, 50, 50);
 * describe(`50-by-50 black rect in center of canvas.
 * turns white on mobile when device turns`);
 * }
 * function deviceTurned() {
 * if (value === 0) {
 * value = 255;
 * } else if (value === 255) {
 * value = 0;
 * }
 * }
 * </code>
 * </div>
 * <div>
 * <code>
 * // Run this example on a mobile device
 * // Rotate the device by 90 degrees in the
 * // X-axis to change the value.
 * 
 * let value = 0;
 * function draw() {
 * fill(value);
 * rect(25, 25, 50, 50);
 * describe(`50-by-50 black rect in center of canvas.
 * turns white on mobile when x-axis turns`);
 * }
 * function deviceTurned() {
 * if (turnAxis === 'X') {
 * if (value === 0) {
 * value = 255;
 * } else if (value === 255) {
 * value = 0;
 * }
 * }
 * }
 * </code>
 * </div>
 */
function deviceTurned(): void;

/**
 * The deviceShaken() function is called when the device total acceleration
 * changes of accelerationX and accelerationY values is more than
 * the threshold value. The default threshold is set to 30.
 * The threshold value can be changed using setShakeThreshold().
 *
 * @example <div class="norender">
 * <code>
 * // Run this example on a mobile device
 * // Shake the device to change the value.
 * 
 * let value = 0;
 * function draw() {
 * fill(value);
 * rect(25, 25, 50, 50);
 * describe(`50-by-50 black rect in center of canvas.
 * turns white on mobile when device shakes`);
 * }
 * function deviceShaken() {
 * value = value + 5;
 * if (value > 255) {
 * value = 0;
 * }
 * }
 * </code>
 * </div>
 */
function deviceShaken(): void;

}

export default function acceleration(p5: any, fn: any): void;
