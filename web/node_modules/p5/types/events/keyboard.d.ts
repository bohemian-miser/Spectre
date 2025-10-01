// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * The onblur function is called when the user is no longer focused
 * on the p5 element. Because the keyup events will not fire if the user is
 * not focused on the element we must assume all keys currently down have
 * been released.
 *
 */
function _onblur(e: any): void;

/**
 * A function that's called once when any key is pressed.Declaring the function `keyPressed()` sets a code block to run once
 * automatically when the user presses any key:`function keyPressed() {
 * // Code to run.
 * }`The key and keyCode
 * variables will be updated with the most recently typed value when
 * `keyPressed()` is called by p5.js:`function keyPressed() {
 * if (key === 'c') {
 * // Code to run.
 * }
 * 
 * if (keyCode === 13) { // Enter key
 * // Code to run.
 * }
 * }`The parameter, `event`, is optional. `keyPressed()` is always passed a
 * KeyboardEvent
 * object with properties that describe the key press event:`function keyPressed(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`Browsers may have default behaviors attached to various key events. For
 * example, some browsers may jump to the bottom of a web page when the
 * `SPACE` key is pressed. To prevent any default behavior for this event, add
 * `return false;` to the end of the function.
 *
 * @param optional `KeyboardEvent` callback argument.
 * @example <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square changes color when the user presses a key.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the square.
 * fill(value);
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * }
 * 
 * // Toggle the background color when the user presses a key.
 * function keyPressed() {
 * if (value === 0) {
 * value = 255;
 * } else {
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a white square at its center. The inner square turns black when the user presses the "b" key. It turns white when the user presses the "a" key.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the square.
 * fill(value);
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * }
 * 
 * // Reassign value when the user presses the 'a' or 'b' key.
 * function keyPressed() {
 * if (key === 'a') {
 * value = 255;
 * } else if (key === 'b') {
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square turns white when the user presses the left arrow key. It turns black when the user presses the right arrow key.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the square.
 * fill(value);
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * }
 * 
 * // Toggle the background color when the user presses an arrow key.
 * function keyPressed() {
 * if (keyCode === 37) { // Left arrow key
 * value = 255;
 * } else if (keyCode === 39) { // Right arrow key
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 */
function keyPressed(event?: KeyboardEvent): void;

/**
 * A function that's called once when any key is released.Declaring the function `keyReleased()` sets a code block to run once
 * automatically when the user releases any key:`function keyReleased() {
 * // Code to run.
 * }`The key and keyCode
 * variables will be updated with the most recently released value when
 * `keyReleased()` is called by p5.js:`function keyReleased() {
 * if (key === 'c') {
 * // Code to run.
 * }
 * 
 * if (keyCode === 13) { // Enter key
 * // Code to run.
 * }
 * }`The parameter, `event`, is optional. `keyReleased()` is always passed a
 * KeyboardEvent
 * object with properties that describe the key press event:`function keyReleased(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`Browsers may have default behaviors attached to various key events. To
 * prevent any default behavior for this event, add `return false;` to the end
 * of the function.
 *
 * @param optional `KeyboardEvent` callback argument.
 * @example <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square changes color when the user releases a key.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the square.
 * fill(value);
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * }
 * 
 * // Toggle value when the user releases a key.
 * function keyReleased() {
 * if (value === 0) {
 * value = 255;
 * } else {
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square becomes white when the user releases the "w" key.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the square.
 * fill(value);
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * }
 * 
 * // Set value to 255 the user releases the 'w' key.
 * function keyReleased() {
 * if (key === 'w') {
 * value = 255;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square turns white when the user presses and releases the left arrow key. It turns black when the user presses and releases the right arrow key.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the square.
 * fill(value);
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * }
 * 
 * // Toggle the background color when the user releases an arrow key.
 * function keyReleased() {
 * if (keyCode === 37) { // Left arrow key
 * value = 255;
 * } else if (keyCode === 39) { // Right arrow key
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 */
function keyReleased(event?: KeyboardEvent): void;

/**
 * A function that's called once when keys with printable characters are pressed.Declaring the function `keyTyped()` sets a code block to run once
 * automatically when the user presses any key with a printable character such
 * as `a` or 1. Modifier keys such as `SHIFT`, `CONTROL`, and the arrow keys
 * will be ignored:`function keyTyped() {
 * // Code to run.
 * }`The key and keyCode
 * variables will be updated with the most recently released value when
 * `keyTyped()` is called by p5.js:`function keyTyped() {
 * // Check for the "c" character using key.
 * if (key === 'c') {
 * // Code to run.
 * }
 * 
 * // Check for "c" using keyCode.
 * if (keyCode === 67) { // 67 is the ASCII code for 'c'
 * // Code to run.
 * }
 * }`The parameter, `event`, is optional. `keyTyped()` is always passed a
 * KeyboardEvent
 * object with properties that describe the key press event:`function keyReleased(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`Note: Use the keyPressed() function and
 * keyCode system variable to respond to modifier
 * keys such as `ALT`.Browsers may have default behaviors attached to various key events. To
 * prevent any default behavior for this event, add `return false;` to the end
 * of the function.
 *
 * @param optional `KeyboardEvent` callback argument.
 * @example <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * // Note: Pressing special keys such as SPACE have no effect.
 * 
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a white square at its center. The inner square changes color when the user presses a key.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the square.
 * fill(value);
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * }
 * 
 * // Toggle the square's color when the user types a printable key.
 * function keyTyped() {
 * if (value === 0) {
 * value = 255;
 * } else {
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a white square at its center. The inner square turns black when the user types the "b" key. It turns white when the user types the "a" key.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the square.
 * fill(value);
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * }
 * 
 * // Reassign value when the user types the 'a' or 'b' key.
 * function keyTyped() {
 * if (key === 'a') {
 * value = 255;
 * } else if (key === 'b') {
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 */
function keyTyped(event?: KeyboardEvent): void;

/**
 * Returns `true` if the key it’s checking is pressed and `false` if not.`keyIsDown()` is helpful when checking for multiple different key presses.
 * For example, `keyIsDown()` can be used to check if both `LEFT_ARROW` and
 * `UP_ARROW` are pressed:`if (keyIsDown(LEFT_ARROW) && keyIsDown(UP_ARROW)) {
 * // Move diagonally.
 * }``keyIsDown()` can check for key presses using strings based on
 * KeyboardEvent.key
 * or KeyboardEvent.code values,
 * such as `keyIsDown('x')` or `keyIsDown('ArrowLeft')`.Note: In p5.js 2.0 and newer, numeric keycodes (such as 88 for 'X') are no longer supported.
 * This is a breaking change from previous versions.You can still use the p5 constants like `LEFT_ARROW` which now map to string values
 * internally rather than numeric codes.
 *
 * @param key to check.
 * @return whether the key is down or not.
 * @example <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let x = 50;
 * let y = 50;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * describe(
 * 'A gray square with a black circle at its center. The circle moves when the user presses an arrow key. It leaves a trail as it moves.'
 * );
 * }
 * 
 * function draw() {
 * // Update x and y if an arrow key is pressed.
 * if (keyIsDown(LEFT_ARROW) === true) {
 * x -= 1;
 * }
 * 
 * if (keyIsDown(RIGHT_ARROW) === true) {
 * x += 1;
 * }
 * 
 * if (keyIsDown(UP_ARROW) === true) {
 * y -= 1;
 * }
 * 
 * if (keyIsDown(DOWN_ARROW) === true) {
 * y += 1;
 * }
 * 
 * // Style the circle.
 * fill(0);
 * 
 * // Draw the circle.
 * circle(x, y, 5);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click on the canvas to begin detecting key presses.
 * 
 * let x = 50;
 * let y = 50;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * describe(
 * 'A gray square with a black circle at its center. The circle moves when the user presses an arrow key. It leaves a trail as it moves.'
 * );
 * }
 * 
 * function draw() {
 * // Update x and y if an arrow key is pressed.
 * if (keyIsDown('ArrowLeft') === true) {
 * x -= 1;
 * }
 * 
 * if (keyIsDown('ArrowRight') === true) {
 * x += 1;
 * }
 * 
 * if (keyIsDown('ArrowUp') === true) {
 * y -= 1;
 * }
 * 
 * if (keyIsDown('ArrowDown') === true) {
 * y += 1;
 * }
 * 
 * // Style the circle.
 * fill(0);
 * 
 * // Draw the circle.
 * circle(x, y, 5);
 * }
 * </code>
 * </div>
 */
function keyIsDown(code: number | string): boolean;

}

export default function keyboard(p5: any, fn: any): void;
