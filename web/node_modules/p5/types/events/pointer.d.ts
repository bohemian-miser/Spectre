// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * A function that's called when the mouse moves.Declaring the function `mouseMoved()` sets a code block to run
 * automatically when the user moves the mouse without clicking any mouse
 * buttons:`function mouseMoved() {
 * // Code to run.
 * }`The mouse system variables, such as mouseX and
 * mouseY, will be updated with their most recent
 * value when `mouseMoved()` is called by p5.js:`function mouseMoved() {
 * if (mouseX < 50) {
 * // Code to run if the mouse is on the left.
 * }
 * 
 * if (mouseY > 50) {
 * // Code to run if the mouse is near the bottom.
 * }
 * }`The parameter, `event`, is optional. `mouseMoved()` is always passed a
 * MouseEvent
 * object with properties that describe the mouse move event:`function mouseMoved(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`Browsers may have default behaviors attached to various mouse events. For
 * example, some browsers highlight text when the user moves the mouse while
 * pressing a mouse button. To prevent any default behavior for this event,
 * add `return false;` to the end of the function.
 *
 * @param optional `MouseEvent` argument.
 * @example <div>
 * <code>
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square becomes lighter as the mouse moves.'
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
 * function mouseMoved() {
 * // Update the grayscale value.
 * value += 5;
 * 
 * // Reset the grayscale value.
 * if (value > 255) {
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 */
function mouseMoved(event?: MouseEvent): void;

/**
 * A function that's called when the mouse moves while a button is pressed.Declaring the function `mouseDragged()` sets a code block to run
 * automatically when the user clicks and drags the mouse:`function mouseDragged() {
 * // Code to run.
 * }`The mouse system variables, such as mouseX and
 * mouseY, will be updated with their most recent
 * value when `mouseDragged()` is called by p5.js:`function mouseDragged() {
 * if (mouseX < 50) {
 * // Code to run if the mouse is on the left.
 * }
 * 
 * if (mouseY > 50) {
 * // Code to run if the mouse is near the bottom.
 * }
 * }`The parameter, `event`, is optional. `mouseDragged()` is always passed a
 * MouseEvent
 * object with properties that describe the mouse drag event:`function mouseDragged(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`On touchscreen devices, `mouseDragged()` will run when a user moves a touch
 * point.Browsers may have default behaviors attached to various mouse events. For
 * example, some browsers highlight text when the user moves the mouse while
 * pressing a mouse button. To prevent any default behavior for this event,
 * add `return false;` to the end of the function.
 *
 * @param optional `MouseEvent` argument.
 * @example <div>
 * <code>
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square becomes lighter as the user drags the mouse.'
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
 * function mouseDragged() {
 * // Update the grayscale value.
 * value += 5;
 * 
 * // Reset the grayscale value.
 * if (value > 255) {
 * value = 0;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 */
function mouseDragged(event?: MouseEvent): void;

/**
 * A function that's called once when a mouse button is pressed.Declaring the function `mousePressed()` sets a code block to run
 * automatically when the user presses a mouse button:`function mousePressed() {
 * // Code to run.
 * }`The mouse system variables, such as mouseX and
 * mouseY, will be updated with their most recent
 * value when `mousePressed()` is called by p5.js:`function mousePressed() {
 * if (mouseX < 50) {
 * // Code to run if the mouse is on the left.
 * }
 * 
 * if (mouseY > 50) {
 * // Code to run if the mouse is near the bottom.
 * }
 * }`The parameter, `event`, is optional. `mousePressed()` is always passed a
 * MouseEvent
 * object with properties that describe the mouse press event:`function mousePressed(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`On touchscreen devices, `mousePressed()` will run when a user’s touch
 * begins.Browsers may have default behaviors attached to various mouse events. For
 * example, some browsers highlight text when the user moves the mouse while
 * pressing a mouse button. To prevent any default behavior for this event,
 * add `return false;` to the end of the function.Note: `mousePressed()`, mouseReleased(),
 * and mouseClicked() are all related.
 * `mousePressed()` runs as soon as the user clicks the mouse.
 * mouseReleased() runs as soon as the user
 * releases the mouse click. mouseClicked()
 * runs immediately after mouseReleased().
 *
 * @param optional `MouseEvent` argument.
 * @example <div>
 * <code>
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square becomes lighter when the user presses a mouse button.'
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
 * function mousePressed() {
 * // Update the grayscale value.
 * value += 5;
 * 
 * // Reset the grayscale value.
 * if (value > 255) {
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
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Style the circle.
 * fill('orange');
 * stroke('royalblue');
 * strokeWeight(10);
 * 
 * describe(
 * 'An orange circle with a thick, blue border drawn on a gray background. When the user presses and holds the mouse, the border becomes thin and pink. When the user releases the mouse, the border becomes thicker and changes color to blue.'
 * );
 * }
 * 
 * function draw() {
 * background(220);
 * 
 * // Draw the circle.
 * circle(50, 50, 20);
 * }
 * 
 * // Set the stroke color and weight as soon as the user clicks.
 * function mousePressed() {
 * stroke('deeppink');
 * strokeWeight(3);
 * }
 * 
 * // Set the stroke and fill colors as soon as the user releases
 * // the mouse.
 * function mouseReleased() {
 * stroke('royalblue');
 * 
 * // This is never visible because fill() is called
 * // in mouseClicked() which runs immediately after
 * // mouseReleased();
 * fill('limegreen');
 * }
 * 
 * // Set the fill color and stroke weight after
 * // mousePressed() and mouseReleased() are called.
 * function mouseClicked() {
 * fill('orange');
 * strokeWeight(10);
 * }
 * </code>
 * </div>
 */
function mousePressed(event?: MouseEvent): void;

/**
 * A function that's called once when a mouse button is released.Declaring the function `mouseReleased()` sets a code block to run
 * automatically when the user releases a mouse button after having pressed
 * it:`function mouseReleased() {
 * // Code to run.
 * }`The mouse system variables, such as mouseX and
 * mouseY, will be updated with their most recent
 * value when `mouseReleased()` is called by p5.js:`function mouseReleased() {
 * if (mouseX < 50) {
 * // Code to run if the mouse is on the left.
 * }
 * 
 * if (mouseY > 50) {
 * // Code to run if the mouse is near the bottom.
 * }
 * }`The parameter, `event`, is optional. `mouseReleased()` is always passed a
 * MouseEvent
 * object with properties that describe the mouse release event:`function mouseReleased(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`On touchscreen devices, `mouseReleased()` will run when a user’s touch
 * ends.Browsers may have default behaviors attached to various mouse events. For
 * example, some browsers highlight text when the user moves the mouse while
 * pressing a mouse button. To prevent any default behavior for this event,
 * add `return false;` to the end of the function.Note: mousePressed(), `mouseReleased()`,
 * and mouseClicked() are all related.
 * mousePressed() runs as soon as the user
 * clicks the mouse. `mouseReleased()` runs as soon as the user releases the
 * mouse click. mouseClicked() runs
 * immediately after `mouseReleased()`.
 *
 * @param optional `MouseEvent` argument.
 * @example <div>
 * <code>
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square becomes lighter when the user presses and releases a mouse button.'
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
 * function mouseReleased() {
 * // Update the grayscale value.
 * value += 5;
 * 
 * // Reset the grayscale value.
 * if (value > 255) {
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
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Style the circle.
 * fill('orange');
 * stroke('royalblue');
 * strokeWeight(10);
 * 
 * describe(
 * 'An orange circle with a thick, blue border drawn on a gray background. When the user presses and holds the mouse, the border becomes thin and pink. When the user releases the mouse, the border becomes thicker and changes color to blue.'
 * );
 * }
 * 
 * function draw() {
 * background(220);
 * 
 * // Draw the circle.
 * circle(50, 50, 20);
 * }
 * 
 * // Set the stroke color and weight as soon as the user clicks.
 * function mousePressed() {
 * stroke('deeppink');
 * strokeWeight(3);
 * }
 * 
 * // Set the stroke and fill colors as soon as the user releases
 * // the mouse.
 * function mouseReleased() {
 * stroke('royalblue');
 * 
 * // This is never visible because fill() is called
 * // in mouseClicked() which runs immediately after
 * // mouseReleased();
 * fill('limegreen');
 * }
 * 
 * // Set the fill color and stroke weight after
 * // mousePressed() and mouseReleased() are called.
 * function mouseClicked() {
 * fill('orange');
 * strokeWeight(10);
 * }
 * </code>
 * </div>
 */
function mouseReleased(event?: MouseEvent): void;

/**
 * A function that's called once after a mouse button is pressed and released.Declaring the function `mouseClicked()` sets a code block to run
 * automatically when the user releases a mouse button after having pressed
 * it:`function mouseClicked() {
 * // Code to run.
 * }`The mouse system variables, such as mouseX and
 * mouseY, will be updated with their most recent
 * value when `mouseClicked()` is called by p5.js:`function mouseClicked() {
 * if (mouseX < 50) {
 * // Code to run if the mouse is on the left.
 * }
 * 
 * if (mouseY > 50) {
 * // Code to run if the mouse is near the bottom.
 * }
 * }`The parameter, `event`, is optional. `mouseClicked()` is always passed a
 * MouseEvent
 * object with properties that describe the mouse click event:`function mouseClicked(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`On touchscreen devices, `mouseClicked()` will run when a user’s touch
 * ends.Browsers may have default behaviors attached to various mouse events. For
 * example, some browsers highlight text when the user moves the mouse while
 * pressing a mouse button. To prevent any default behavior for this event,
 * add `return false;` to the end of the function.Note: mousePressed(),
 * mouseReleased(),
 * and `mouseClicked()` are all related.
 * mousePressed() runs as soon as the user
 * clicks the mouse. mouseReleased() runs as
 * soon as the user releases the mouse click. `mouseClicked()` runs
 * immediately after mouseReleased().
 *
 * @param optional `MouseEvent` argument.
 * @example <div>
 * <code>
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square changes color when the user presses and releases a mouse button.'
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
 * // Toggle the square's color when the user clicks.
 * function mouseClicked() {
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
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Style the circle.
 * fill('orange');
 * stroke('royalblue');
 * strokeWeight(10);
 * 
 * describe(
 * 'An orange circle with a thick, blue border drawn on a gray background. When the user presses and holds the mouse, the border becomes thin and pink. When the user releases the mouse, the border becomes thicker and changes color to blue.'
 * );
 * }
 * 
 * function draw() {
 * background(220);
 * 
 * // Draw the circle.
 * circle(50, 50, 20);
 * }
 * 
 * // Set the stroke color and weight as soon as the user clicks.
 * function mousePressed() {
 * stroke('deeppink');
 * strokeWeight(3);
 * }
 * 
 * // Set the stroke and fill colors as soon as the user releases
 * // the mouse.
 * function mouseReleased() {
 * stroke('royalblue');
 * 
 * // This is never visible because fill() is called
 * // in mouseClicked() which runs immediately after
 * // mouseReleased();
 * fill('limegreen');
 * }
 * 
 * // Set the fill color and stroke weight after
 * // mousePressed() and mouseReleased() are called.
 * function mouseClicked() {
 * fill('orange');
 * strokeWeight(10);
 * }
 * </code>
 * </div>
 */
function mouseClicked(event?: MouseEvent): void;

/**
 * A function that's called once when a mouse button is clicked twice quickly.Declaring the function `doubleClicked()` sets a code block to run
 * automatically when the user presses and releases the mouse button twice
 * quickly:`function doubleClicked() {
 * // Code to run.
 * }`The mouse system variables, such as mouseX and
 * mouseY, will be updated with their most recent
 * value when `doubleClicked()` is called by p5.js:`function doubleClicked() {
 * if (mouseX < 50) {
 * // Code to run if the mouse is on the left.
 * }
 * 
 * if (mouseY > 50) {
 * // Code to run if the mouse is near the bottom.
 * }
 * }`The parameter, `event`, is optional. `doubleClicked()` is always passed a
 * MouseEvent
 * object with properties that describe the double-click event:`function doubleClicked(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`On touchscreen devices, code placed in `doubleClicked()` will run after two
 * touches that occur within a short time.Browsers may have default behaviors attached to various mouse events. For
 * example, some browsers highlight text when the user moves the mouse while
 * pressing a mouse button. To prevent any default behavior for this event,
 * add `return false;` to the end of the function.
 *
 * @param optional `MouseEvent` argument.
 * @example <div>
 * <code>
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black square at its center. The inner square changes color when the user double-clicks.'
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
 * // Toggle the square's color when the user double-clicks.
 * function doubleClicked() {
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
 * let value = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a black circle at its center. When the user double-clicks on the circle, it changes color to white.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the circle.
 * fill(value);
 * 
 * // Draw the circle.
 * circle(50, 50, 80);
 * }
 * 
 * // Reassign value to 255 when the user double-clicks on the circle.
 * function doubleClicked() {
 * if (dist(50, 50, mouseX, mouseY) < 40) {
 * value = 255;
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 */
function doubleClicked(event?: MouseEvent): void;

/**
 * A function that's called once when the mouse wheel moves.Declaring the function `mouseWheel()` sets a code block to run
 * automatically when the user scrolls with the mouse wheel:`function mouseWheel() {
 * // Code to run.
 * }`The mouse system variables, such as mouseX and
 * mouseY, will be updated with their most recent
 * value when `mouseWheel()` is called by p5.js:`function mouseWheel() {
 * if (mouseX < 50) {
 * // Code to run if the mouse is on the left.
 * }
 * 
 * if (mouseY > 50) {
 * // Code to run if the mouse is near the bottom.
 * }
 * }`The parameter, `event`, is optional. `mouseWheel()` is always passed a
 * MouseEvent
 * object with properties that describe the mouse scroll event:`function mouseWheel(event) {
 * // Code to run that uses the event.
 * console.log(event);
 * }`The `event` object has many properties including `delta`, a `Number`
 * containing the distance that the user scrolled. For example, `event.delta`
 * might have the value 5 when the user scrolls up. `event.delta` is positive
 * if the user scrolls up and negative if they scroll down. The signs are
 * opposite on macOS with "natural" scrolling enabled.Browsers may have default behaviors attached to various mouse events. For
 * example, some browsers highlight text when the user moves the mouse while
 * pressing a mouse button. To prevent any default behavior for this event,
 * add `return false;` to the end of the function.Note: On Safari, `mouseWheel()` may only work as expected if
 * `return false;` is added at the end of the function.
 *
 * @param optional `WheelEvent` argument.
 * @example <div>
 * <code>
 * let circleSize = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square. A white circle at its center grows up when the user scrolls the mouse wheel.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw the circle
 * circle(circleSize, 50, 50);
 * }
 * 
 * // Increment circleSize when the user scrolls the mouse wheel.
 * function mouseWheel() {
 * circleSize += 1;
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let direction = '';
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square. An arrow at its center points up when the user scrolls up. The arrow points down when the user scrolls down.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Draw an arrow that points where
 * // the mouse last scrolled.
 * text(direction, 50, 50);
 * }
 * 
 * // Change direction when the user scrolls the mouse wheel.
 * function mouseWheel(event) {
 * if (event.delta > 0) {
 * direction = '▲';
 * } else {
 * direction = '▼';
 * }
 * // Uncomment to prevent any default behavior.
 * // return false;
 * }
 * </code>
 * </div>
 */
function mouseWheel(event?: WheelEvent): void;

/**
 * Locks the mouse pointer to its current position and makes it invisible.`requestPointerLock()` allows the mouse to move forever without leaving the
 * screen. Calling `requestPointerLock()` locks the values of
 * mouseX, mouseY,
 * pmouseX, and pmouseY.
 * movedX and movedY
 * continue updating and can be used to get the distance the mouse moved since
 * the last frame was drawn. Calling
 * exitPointerLock() resumes updating the
 * mouse system variables.Note: Most browsers require an input, such as a click, before calling
 * `requestPointerLock()`. It’s recommended to call `requestPointerLock()` in
 * an event function such as doubleClicked().
 *
 * @example <div>
 * <code>
 * let score = 0;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with the text "Score: X" at its center. The score increases when the user moves the mouse upward. It decreases when the user moves the mouse downward.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Update the score.
 * score -= movedY;
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Display the score.
 * text(`Score: ${score}`, 50, 50);
 * }
 * 
 * // Lock the pointer when the user double-clicks.
 * function doubleClicked() {
 * requestPointerLock();
 * }
 * </code>
 * </div>
 */
function requestPointerLock(): void;

/**
 * Exits a pointer lock started with
 * requestPointerLock.Calling `requestPointerLock()` locks the values of
 * mouseX, mouseY,
 * pmouseX, and pmouseY.
 * Calling `exitPointerLock()` resumes updating the mouse system variables.Note: Most browsers require an input, such as a click, before calling
 * `requestPointerLock()`. It’s recommended to call `requestPointerLock()` in
 * an event function such as doubleClicked().
 *
 * @example <div>
 * <code>
 * let isLocked = false;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * describe(
 * 'A gray square with a word at its center. The word changes between "Unlocked" and "Locked" when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * 
 * // Tell the user whether the pointer is locked.
 * if (isLocked === true) {
 * text('Locked', 50, 50);
 * } else {
 * text('Unlocked', 50, 50);
 * }
 * }
 * 
 * // Toggle the pointer lock when the user double-clicks.
 * function doubleClicked() {
 * if (isLocked === true) {
 * exitPointerLock();
 * isLocked = false;
 * } else {
 * requestPointerLock();
 * isLocked = true;
 * }
 * }
 * </code>
 * </div>
 */
function exitPointerLock(): void;

}

export default function pointer(p5: any, fn: any): void;
