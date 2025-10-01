// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Stores a value in the web browser's local storage.Web browsers can save small amounts of data using the built-in
 * localStorage object.
 * Data stored in `localStorage` can be retrieved at any point, even after
 * refreshing a page or restarting the browser. Data are stored as key-value
 * pairs.`storeItem()` makes it easy to store values in `localStorage` and
 * getItem() makes it easy to retrieve them.The first parameter, `key`, is the name of the value to be stored as a
 * string.The second parameter, `value`, is the value to be stored. Values can have
 * any type.Note: Sensitive data such as passwords or personal information shouldn't be
 * stored in `localStorage`.
 *
 * @for p5
 * @param name of the value.
 * @param value to be stored.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Store the player's name.
 * storeItem('name', 'Feist');
 * 
 * // Store the player's score.
 * storeItem('score', 1234);
 * 
 * describe('The text "Feist: 1234" written in black on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Retrieve the name.
 * let name = getItem('name');
 * 
 * // Retrieve the score.
 * let score = getItem('score');
 * 
 * // Display the score.
 * text(`${name}: ${score}`, 50, 50);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create an object.
 * let p = { x: 50, y: 50 };
 * 
 * // Store the object.
 * storeItem('position', p);
 * 
 * describe('A white circle on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Retrieve the object.
 * let p = getItem('position');
 * 
 * // Draw the circle.
 * circle(p.x, p.y, 30);
 * }
 * </code>
 * </div>
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Color object.
 * let c = color('deeppink');
 * 
 * // Store the object.
 * storeItem('color', c);
 * 
 * describe('A pink circle on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Retrieve the object.
 * let c = getItem('color');
 * 
 * // Style the circle.
 * fill(c);
 * 
 * // Draw the circle.
 * circle(50, 50, 30);
 * }
 * </code>
 * </div>
 */
function storeItem(key: string, value: string | number | boolean | object | Array): void;

/**
 * Returns a value in the web browser's local storage.Web browsers can save small amounts of data using the built-in
 * localStorage object.
 * Data stored in `localStorage` can be retrieved at any point, even after
 * refreshing a page or restarting the browser. Data are stored as key-value
 * pairs.storeItem() makes it easy to store values in
 * `localStorage` and `getItem()` makes it easy to retrieve them.The first parameter, `key`, is the name of the value to be stored as a
 * string.The second parameter, `value`, is the value to be retrieved a string. For
 * example, calling `getItem('size')` retrieves the value with the key `size`.Note: Sensitive data such as passwords or personal information shouldn't be
 * stored in `localStorage`.
 *
 * @for p5
 * @param name of the value.
 * @return stored item.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Store the player's name.
 * storeItem('name', 'Feist');
 * 
 * // Store the player's score.
 * storeItem('score', 1234);
 * 
 * describe('The text "Feist: 1234" written in black on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Retrieve the name.
 * let name = getItem('name');
 * 
 * // Retrieve the score.
 * let score = getItem('score');
 * 
 * // Display the score.
 * text(`${name}: ${score}`, 50, 50);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create an object.
 * let p = { x: 50, y: 50 };
 * 
 * // Store the object.
 * storeItem('position', p);
 * 
 * describe('A white circle on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Retrieve the object.
 * let p = getItem('position');
 * 
 * // Draw the circle.
 * circle(p.x, p.y, 30);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a p5.Color object.
 * let c = color('deeppink');
 * 
 * // Store the object.
 * storeItem('color', c);
 * 
 * describe('A pink circle on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Retrieve the object.
 * let c = getItem('color');
 * 
 * // Style the circle.
 * fill(c);
 * 
 * // Draw the circle.
 * circle(50, 50, 30);
 * }
 * </code>
 * </div>
 */
function getItem(key: string): string | number | boolean | object | Array;

/**
 * Removes all items in the web browser's local storage.Web browsers can save small amounts of data using the built-in
 * localStorage object.
 * Data stored in `localStorage` can be retrieved at any point, even after
 * refreshing a page or restarting the browser. Data are stored as key-value
 * pairs. Calling `clearStorage()` removes all data from `localStorage`.Note: Sensitive data such as passwords or personal information shouldn't be
 * stored in `localStorage`.
 *
 * @for p5
 * @example <div>
 * <code>
 * // Double-click to clear localStorage.
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Store the player's name.
 * storeItem('name', 'Feist');
 * 
 * // Store the player's score.
 * storeItem('score', 1234);
 * 
 * describe(
 * 'The text "Feist: 1234" written in black on a gray background. The text "null: null" appears when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Retrieve the name.
 * let name = getItem('name');
 * 
 * // Retrieve the score.
 * let score = getItem('score');
 * 
 * // Display the score.
 * text(`${name}: ${score}`, 50, 50);
 * }
 * 
 * // Clear localStorage when the user double-clicks.
 * function doubleClicked() {
 * clearStorage();
 * }
 * </code>
 * </div>
 */
function clearStorage(): void;

/**
 * Removes an item from the web browser's local storage.Web browsers can save small amounts of data using the built-in
 * localStorage object.
 * Data stored in `localStorage` can be retrieved at any point, even after
 * refreshing a page or restarting the browser. Data are stored as key-value
 * pairs.storeItem() makes it easy to store values in
 * `localStorage` and `removeItem()` makes it easy to delete them.The parameter, `key`, is the name of the value to remove as a string. For
 * example, calling `removeItem('size')` removes the item with the key `size`.Note: Sensitive data such as passwords or personal information shouldn't be
 * stored in `localStorage`.
 *
 * @param name of the value to remove.
 * @for p5
 * @example <div>
 * <code>
 * // Double-click to remove an item from localStorage.
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Store the player's name.
 * storeItem('name', 'Feist');
 * 
 * // Store the player's score.
 * storeItem('score', 1234);
 * 
 * describe(
 * 'The text "Feist: 1234" written in black on a gray background. The text "Feist: null" appears when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Retrieve the name.
 * let name = getItem('name');
 * 
 * // Retrieve the score.
 * let score = getItem('score');
 * 
 * // Display the score.
 * text(`${name}: ${score}`, 50, 50);
 * }
 * 
 * // Remove the word from localStorage when the user double-clicks.
 * function doubleClicked() {
 * removeItem('score');
 * }
 * </code>
 * </div>
 */
function removeItem(key: string): void;

}

export default function local_storage(p5: any, fn: any): void;
