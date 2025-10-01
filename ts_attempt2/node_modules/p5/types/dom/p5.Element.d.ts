// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';

declare module 'p5' {
  class Element {
    constructor(elt: HTMLElement, pInst?: p5);

  /**
   * Removes the element, stops all audio/video streams, and removes all
   * callback functions.
   */
  remove(): void;

  /**
   * Attaches the element to a parent element.For example, a `&lt;div&gt;&lt;/div&gt;` element may be used as a box to
   * hold two pieces of text, a header and a paragraph. The
   * `&lt;div&gt;&lt;/div&gt;` is the parent element of both the header and
   * paragraph.The parameter `parent` can have one of three types. `parent` can be a
   * string with the parent element's ID, as in
   * `myElement.parent('container')`. It can also be another
   * p5.Element object, as in
   * `myElement.parent(myDiv)`. Finally, `parent` can be an `HTMLElement`
   * object, as in `myElement.parent(anotherElement)`.Calling `myElement.parent()` without an argument returns the element's
   * parent.
 *
   * @param
   * @param
   */
  parent(p: any, parent: string | p5.Element | object): void;

  parent(p: any): p5.Element;

  /**
   * Attaches the element as a child of another element.`myElement.child()` accepts either a string ID, DOM node, or
   * p5.Element. For example,
   * `myElement.child(otherElement)`. If no argument is provided, an array of
   * children DOM nodes is returned.
 *
   * @param
   */
  child(childNode: any): Node[];

  child(childNode: any, child: string | p5.Element): void;

  /**
   * Sets the inner HTML of the element, replacing any existing HTML.The second parameter, `append`, is optional. If `true` is passed, as in
   * `myElement.html('hi', true)`, the HTML is appended instead of replacing
   * existing HTML.If no arguments are passed, as in `myElement.html()`, the element's inner
   * HTML is returned.
 *
   * @param
   */
  html(args: any[]): string;

  html(args: any[], html: string, append: boolean): void;

  /**
   * Sets the element's ID using a given string.Calling `myElement.id()` without an argument returns its ID as a string.
 *
   * @param
   */
  id(id: string): void;

  id(id: any): string;

  /**
   * Adds a
   * class attribute
   * to the element using a given string.Calling `myElement.class()` without an argument returns a string with its current classes.
 *
   * @param
   * @param
   */
  class(c: any, class: string): void;

  class(c: any): string;

  /**
   * Adds a class to the element.
 *
   * @param
   * @param
   */
  addClass(c: any, class: string): void;

  /**
   * Removes a class from the element.
 *
   * @param
   * @param
   */
  removeClass(c: any, class: string): void;

  /**
   * Checks if a class is already applied to element.
 *
   * @param
   */
  hasClass(c: any): boolean;

  /**
   * Toggles whether a class is applied to the element.
 *
   * @param
   */
  toggleClass(c: any): void;

  /**
   * Centers the element either vertically, horizontally, or both.`center()` will center the element relative to its parent or according to
   * the page's body if the element has no parent.If no argument is passed, as in `myElement.center()` the element is aligned
   * both vertically and horizontally.
 *
   * @param
   */
  center(align: string): void;

  /**
   * Sets the element's position.The first two parameters, `x` and `y`, set the element's position relative
   * to the top-left corner of the web page.The third parameter, `positionType`, is optional. It sets the element's
   * positioning scheme.
   * `positionType` is a string that can be either `'static'`, `'fixed'`,
   * `'relative'`, `'sticky'`, `'initial'`, or `'inherit'`.If no arguments passed, as in `myElement.position()`, the method returns
   * the element's position in an object, as in `{ x: 0, y: 0 }`.
 *
   * @param
   */
  position(args: any[]): object;

  position(args: any[], x: number, y: number, positionType: string): void;

  /**
   * Shows the current element.
   */
  show(): void;

  /**
   * Hides the current element.
   */
  hide(): void;

  /**
   * Sets the element's width and height.Calling `myElement.size()` without an argument returns the element's size
   * as an object with the properties `width` and `height`. For example,
   * `{ width: 20, height: 10 }`.The first parameter, `width`, is optional. It's a number used to set the
   * element's width. Calling `myElement.size(10)`The second parameter, 'height`, is also optional. It's a
   * number used to set the element's height. For example, calling
   * `myElement.size(20, 10)` sets the element's width to 20 pixels and height
   * to 10 pixels.The constant `AUTO` can be used to adjust one dimension at a time while
   * maintaining the aspect ratio, which is `width / height`. For example,
   * consider an element that's 200 pixels wide and 100 pixels tall. Calling
   * `myElement.size(20, AUTO)` sets the width to 20 pixels and height to 10
   * pixels.Note: In the case of elements that need to load data, such as images, wait
   * to call `myElement.size()` until after the data loads.
 *
   * @param
   * @param
   */
  size(w: any, h: any): object;

  size(w: number | AUTO, h: number | AUTO): void;

  /**
   * Applies a style to the element by adding a
   * CSS declaration.The first parameter, `property`, is a string. If the name of a style
   * property is passed, as in `myElement.style('color')`, the method returns
   * the current value as a string or `null` if it hasn't been set. If a
   * `property:style` string is passed, as in
   * `myElement.style('color:deeppink')`, the method sets the style `property`
   * to `value`.The second parameter, `value`, is optional. It sets the property's value.
   * `value` can be a string, as in
   * `myElement.style('color', 'deeppink')`, or a
   * p5.Color object, as in
   * `myElement.style('color', myColor)`.
 *
   * @param
   * @param
   * @param
   */
  style(prop: any, val: any, property: string): string;

  style(prop: any, val: any, property: string, value: string | p5.Color): string;

  /**
   * Adds an
   * attribute
   * to the element.This method is useful for advanced tasks. Most commonly-used attributes,
   * such as `id`, can be set with their dedicated methods. For example,
   * `nextButton.id('next')` sets an element's `id` attribute. Calling
   * `nextButton.attribute('id', 'next')` has the same effect.The first parameter, `attr`, is the attribute's name as a string. Calling
   * `myElement.attribute('align')` returns the attribute's current value as a
   * string or `null` if it hasn't been set.The second parameter, `value`, is optional. It's a string used to set the
   * attribute's value. For example, calling
   * `myElement.attribute('align', 'center')` sets the element's horizontal
   * alignment to `center`.
 *
   * @param
   * @param
   */
  attribute(attr: any, value: any): string;

  attribute(attr: string, value: string): void;

  /**
   * Removes an attribute from the element.The parameter `attr` is the attribute's name as a string. For example,
   * calling `myElement.removeAttribute('align')` removes its `align`
   * attribute if it's been set.
 *
   * @param
   */
  removeAttribute(attr: string): void;

  /**
   * Returns or sets the element's value.Calling `myElement.value()` returns the element's current value.The parameter, `value`, is an optional number or string. If provided,
   * as in `myElement.value(123)`, it's used to set the element's value.
 *
   * @param
   */
  value(args: any[]): string | number;

  value(args: any[], value: string | number): void;

  /**
   * Calls a function when the mouse is pressed over the element.Calling `myElement.mousePressed(false)` disables the function.Note: Some mobile browsers may also trigger this event when the element
   * receives a quick tap.
 *
   * @param
   */
  mousePressed(fxn: Function | boolean): void;

  /**
   * Calls a function when the mouse is pressed twice over the element.Calling `myElement.doubleClicked(false)` disables the function.
 *
   * @param
   */
  doubleClicked(fxn: Function | boolean): void;

  /**
   * Calls a function when the mouse wheel scrolls over the element.The callback function, `fxn`, is passed an `event` object. `event` has
   * two numeric properties, `deltaY` and `deltaX`. `event.deltaY` is
   * negative if the mouse wheel rotates away from the user. It's positive if
   * the mouse wheel rotates toward the user. `event.deltaX` is positive if
   * the mouse wheel moves to the right. It's negative if the mouse wheel moves
   * to the left.Calling `myElement.mouseWheel(false)` disables the function.
 *
   * @param
   */
  mouseWheel(fxn: Function | boolean): void;

  /**
   * Calls a function when the mouse is released over the element.Calling `myElement.mouseReleased(false)` disables the function.Note: Some mobile browsers may also trigger this event when the element
   * receives a quick tap.
 *
   * @param
   */
  mouseReleased(fxn: Function | boolean): void;

  /**
   * Calls a function when the mouse is pressed and released over the element.Calling `myElement.mouseReleased(false)` disables the function.Note: Some mobile browsers may also trigger this event when the element
   * receives a quick tap.
 *
   * @param
   */
  mouseClicked(fxn: Function | boolean): void;

  /**
   * Calls a function when the mouse moves over the element.Calling `myElement.mouseMoved(false)` disables the function.
 *
   * @param
   */
  mouseMoved(fxn: Function | boolean): void;

  /**
   * Calls a function when the mouse moves onto the element.Calling `myElement.mouseOver(false)` disables the function.
 *
   * @param
   */
  mouseOver(fxn: Function | boolean): void;

  /**
   * Calls a function when the mouse moves off the element.Calling `myElement.mouseOut(false)` disables the function.
 *
   * @param
   */
  mouseOut(fxn: Function | boolean): void;

  /**
   * Calls a function when a file is dragged over the element.Calling `myElement.dragOver(false)` disables the function.
 *
   * @param
   */
  dragOver(fxn: Function | boolean): void;

  /**
   * Calls a function when a file is dragged off the element.Calling `myElement.dragLeave(false)` disables the function.
 *
   * @param
   */
  dragLeave(fxn: Function | boolean): void;

  /**
   * Calls a function when the element changes.Calling `myElement.changed(false)` disables the function.
 *
   * @param
   */
  changed(fxn: Function | boolean): void;

  /**
   * Calls a function when the element receives input.`myElement.input()` is often used to with text inputs and sliders. Calling
   * `myElement.input(false)` disables the function.
 *
   * @param
   */
  input(fxn: Function | boolean): void;

  /**
   * Calls a function when the user drops a file on the element.The first parameter, `callback`, is a function to call once the file loads.
   * The callback function should have one parameter, `file`, that's a
   * p5.File object. If the user drops multiple files on
   * the element, `callback`, is called once for each file.The second parameter, `fxn`, is a function to call when the browser detects
   * one or more dropped files. The callback function should have one
   * parameter, `event`, that's a
   * DragEvent.
 *
   * @param
   * @param
   */
  drop(callback: Function, fxn: Function): void;

  /**
   * Makes the element draggable.The parameter, `elmnt`, is optional. If another
   * p5.Element object is passed, as in
   * `myElement.draggable(otherElement)`, the other element will become draggable.
 *
   * @param
   * @param
   */
  draggable(elmMove: any, elmnt: p5.Element): void;

  }

/**
 * Removes the element, stops all audio/video streams, and removes all
 * callback functions.
 *
 * @example <div>
 * <code>
 * let p;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a paragraph element.
 * p = createP('p5*js');
 * p.position(10, 10);
 * 
 * describe('The text "p5*js" written at the center of a gray square. ');
 * }
 * 
 * // Remove the paragraph when the user double-clicks.
 * function doubleClicked() {
 * p.remove();
 * }
 * </code>
 * </div>
 */
function remove(): void;

/**
 * Attaches the element to a parent element.For example, a `&lt;div&gt;&lt;/div&gt;` element may be used as a box to
 * hold two pieces of text, a header and a paragraph. The
 * `&lt;div&gt;&lt;/div&gt;` is the parent element of both the header and
 * paragraph.The parameter `parent` can have one of three types. `parent` can be a
 * string with the parent element's ID, as in
 * `myElement.parent('container')`. It can also be another
 * p5.Element object, as in
 * `myElement.parent(myDiv)`. Finally, `parent` can be an `HTMLElement`
 * object, as in `myElement.parent(anotherElement)`.Calling `myElement.parent()` without an argument returns the element's
 * parent.
 *
 * @param ID, <a href="#/p5.Element">p5.Element</a>,
 * or HTMLElement of desired parent element.
 * @example <div>
 * <code>
 * function setup()  {
 * background(200);
 * 
 * // Create a div element.
 * let div = createDiv();
 * 
 * // Place the div in the top-left corner.
 * div.position(10, 20);
 * 
 * // Set its width and height.
 * div.size(80, 60);
 * 
 * // Set its background color to white
 * div.style('background-color', 'white');
 * 
 * // Align any text to the center.
 * div.style('text-align', 'center');
 * 
 * // Set its ID to "container".
 * div.id('container');
 * 
 * // Create a paragraph element.
 * let p = createP('p5*js');
 * 
 * // Make the div its parent
 * // using its ID "container".
 * p.parent('container');
 * 
 * describe('The text "p5*js" written in black at the center of a white rectangle. The rectangle is inside a gray square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup()  {
 * background(200);
 * 
 * // Create rectangular div element.
 * let div = createDiv();
 * 
 * // Place the div in the top-left corner.
 * div.position(10, 20);
 * 
 * // Set its width and height.
 * div.size(80, 60);
 * 
 * // Set its background color and align
 * // any text to the center.
 * div.style('background-color', 'white');
 * div.style('text-align', 'center');
 * 
 * // Create a paragraph element.
 * let p = createP('p5*js');
 * 
 * // Make the div its parent.
 * p.parent(div);
 * 
 * describe('The text "p5*js" written in black at the center of a white rectangle. The rectangle is inside a gray square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup()  {
 * background(200);
 * 
 * // Create rectangular div element.
 * let div = createDiv();
 * 
 * // Place the div in the top-left corner.
 * div.position(10, 20);
 * 
 * // Set its width and height.
 * div.size(80, 60);
 * 
 * // Set its background color and align
 * // any text to the center.
 * div.style('background-color', 'white');
 * div.style('text-align', 'center');
 * 
 * // Create a paragraph element.
 * let p = createP('p5*js');
 * 
 * // Make the div its parent
 * // using the underlying
 * // HTMLElement.
 * p.parent(div.elt);
 * 
 * describe('The text "p5*js" written in black at the center of a white rectangle. The rectangle is inside a gray square.');
 * }
 * </code>
 * </div>
 */
function parent(p: any, parent: string | p5.Element | object): void;

/**
 */
function parent(p: any): p5.Element;

/**
 * Attaches the element as a child of another element.`myElement.child()` accepts either a string ID, DOM node, or
 * p5.Element. For example,
 * `myElement.child(otherElement)`. If no argument is provided, an array of
 * children DOM nodes is returned.
 *
 * @returns an array of child nodes.
 * @example <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create the div elements.
 * let div0 = createDiv('Parent');
 * let div1 = createDiv('Child');
 * 
 * // Make div1 the child of div0
 * // using the p5.Element.
 * div0.child(div1);
 * 
 * describe('A gray square with the words "Parent" and "Child" written beneath it.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create the div elements.
 * let div0 = createDiv('Parent');
 * let div1 = createDiv('Child');
 * 
 * // Give div1 an ID.
 * div1.id('apples');
 * 
 * // Make div1 the child of div0
 * // using its ID.
 * div0.child('apples');
 * 
 * describe('A gray square with the words "Parent" and "Child" written beneath it.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender notest'>
 * <code>
 * // This example assumes there is a div already on the page
 * // with id "myChildDiv".
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create the div elements.
 * let div0 = createDiv('Parent');
 * 
 * // Select the child element by its ID.
 * let elt = document.getElementById('myChildDiv');
 * 
 * // Make div1 the child of div0
 * // using its HTMLElement object.
 * div0.child(elt);
 * 
 * describe('A gray square with the words "Parent" and "Child" written beneath it.');
 * }
 * </code>
 * </div>
 */
function child(childNode: any): Node[];

/**
 * @param the ID, DOM node, or <a href="#/p5.Element">p5.Element</a>
 * to add to the current element
 */
function child(childNode: any, child?: string | p5.Element): void;

/**
 * Sets the inner HTML of the element, replacing any existing HTML.The second parameter, `append`, is optional. If `true` is passed, as in
 * `myElement.html('hi', true)`, the HTML is appended instead of replacing
 * existing HTML.If no arguments are passed, as in `myElement.html()`, the element's inner
 * HTML is returned.
 *
 * @for p5.Element
 * @returns the inner HTML of the element
 * @example <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create the div element and set its size.
 * let div = createDiv('');
 * div.size(100, 100);
 * 
 * // Set the inner HTML to "hi".
 * div.html('hi');
 * 
 * describe('A gray square with the word "hi" written beneath it.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create the div element and set its size.
 * let div = createDiv('Hello ');
 * div.size(100, 100);
 * 
 * // Append "World" to the div's HTML.
 * div.html('World', true);
 * 
 * describe('A gray square with the text "Hello World" written beneath it.');
 * }
 * </code>
 * </div>
 * 
 * <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create the div element.
 * let div = createDiv('Hello');
 * 
 * // Prints "Hello" to the console.
 * print(div.html());
 * 
 * describe('A gray square with the word "Hello!" written beneath it.');
 * }
 * </code>
 * </div>
 */
function html(...args: any[]): string;

/**
 * @param the HTML to be placed inside the element
 * @param whether to append HTML to existing
 */
function html(...args: any[], html?: string, append?: boolean): void;

/**
 * Sets the element's ID using a given string.Calling `myElement.id()` without an argument returns its ID as a string.
 *
 * @param ID of the element.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Set the canvas' ID
 * // to "mycanvas".
 * cnv.id('mycanvas');
 * 
 * // Get the canvas' ID.
 * let id = cnv.id();
 * text(id, 24, 54);
 * 
 * describe('The text "mycanvas" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function id(id: string): void;

/**
 * @return ID of the element.
 */
function id(id: any): string;

/**
 * Adds a
 * class attribute
 * to the element using a given string.Calling `myElement.class()` without an argument returns a string with its current classes.
 *
 * @param class to add.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Add the class "small" to the
 * // canvas element.
 * cnv.class('small');
 * 
 * // Get the canvas element's class
 * // and display it.
 * let c = cnv.class();
 * text(c, 35, 54);
 * 
 * describe('The word "small" written in black on a gray canvas.');
 * 
 * }
 * </code>
 * </div>
 */
function class(c: any, class: string): void;

/**
 * @return element's classes, if any.
 */
function class(c: any): string;

/**
 * Adds a class to the element.
 *
 * @for p5.Element
 * @param name of class to add.
 * @example <div class='norender'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a div element.
 * let div = createDiv('div');
 * 
 * // Add a class to the div.
 * div.addClass('myClass');
 * 
 * describe('A gray square.');
 * }
 * </code>
 * </div>
 */
function addClass(c: any, class: string): void;

/**
 * Removes a class from the element.
 *
 * @param name of class to remove.
 * @example <div class='norender'>
 * <code>
 * // In this example, a class is set when the div is created
 * // and removed when mouse is pressed. This could link up
 * // with a CSS style rule to toggle style properties.
 * 
 * let div;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a div element.
 * div = createDiv('div');
 * 
 * // Add a class to the div.
 * div.addClass('myClass');
 * 
 * describe('A gray square.');
 * }
 * 
 * // Remove 'myClass' from the div when the user presses the mouse.
 * function mousePressed() {
 * div.removeClass('myClass');
 * }
 * </code>
 * </div>
 */
function removeClass(c: any, class: string): void;

/**
 * Checks if a class is already applied to element.
 *
 * @returns a boolean value if element has specified class.
 * @param {String} name of class to check.
 * @example <div class='norender'>
 * <code>
 * let div;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a div element.
 * div = createDiv('div');
 * 
 * // Add the class 'show' to the div.
 * div.addClass('show');
 * 
 * describe('A gray square.');
 * }
 * 
 * // Toggle the class 'show' when the mouse is pressed.
 * function mousePressed() {
 * if (div.hasClass('show')) {
 * div.addClass('show');
 * } else {
 * div.removeClass('show');
 * }
 * }
 * </code>
 * </div>
 */
function hasClass(c: any): boolean;

/**
 * Toggles whether a class is applied to the element.
 *
 * @param {String} class name to toggle.
 * @example <div class='norender'>
 * <code>
 * let div;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a div element.
 * div = createDiv('div');
 * 
 * // Add the 'show' class to the div.
 * div.addClass('show');
 * 
 * describe('A gray square.');
 * }
 * 
 * // Toggle the 'show' class when the mouse is pressed.
 * function mousePressed() {
 * div.toggleClass('show');
 * }
 * </code>
 * </div>
 */
function toggleClass(c: any): void;

/**
 * Centers the element either vertically, horizontally, or both.`center()` will center the element relative to its parent or according to
 * the page's body if the element has no parent.If no argument is passed, as in `myElement.center()` the element is aligned
 * both vertically and horizontally.
 *
 * @param passing 'vertical', 'horizontal' aligns element accordingly
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create the div element and style it.
 * let div = createDiv('');
 * div.size(10, 10);
 * div.style('background-color', 'orange');
 * 
 * // Center the div relative to the page's body.
 * div.center();
 * 
 * describe('A gray square and an orange rectangle. The rectangle is at the center of the page.');
 * }
 * </code>
 * </div>
 */
function center(align?: string): void;

/**
 * Sets the element's position.The first two parameters, `x` and `y`, set the element's position relative
 * to the top-left corner of the web page.The third parameter, `positionType`, is optional. It sets the element's
 * positioning scheme.
 * `positionType` is a string that can be either `'static'`, `'fixed'`,
 * `'relative'`, `'sticky'`, `'initial'`, or `'inherit'`.If no arguments passed, as in `myElement.position()`, the method returns
 * the element's position in an object, as in `{ x: 0, y: 0 }`.
 *
 * @returns object of form `{ x: 0, y: 0 }` containing the element's position.
 * @example <div>
 * <code class='norender'>
 * function setup() {
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Positions the canvas 50px to the right and 100px
 * // below the top-left corner of the window.
 * cnv.position(50, 100);
 * 
 * describe('A gray square that is 50 pixels to the right and 100 pixels down from the top-left corner of the web page.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code class='norender'>
 * function setup() {
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Positions the canvas at the top-left corner
 * // of the window with a 'fixed' position type.
 * cnv.position(0, 0, 'fixed');
 * 
 * describe('A gray square in the top-left corner of the web page.');
 * }
 * </code>
 * </div>
 */
function position(...args: any[]): object;

/**
 * @param x-position relative to top-left of window (optional)
 * @param y-position relative to top-left of window (optional)
 * @param it can be static, fixed, relative, sticky, initial or inherit (optional)
 */
function position(...args: any[], x?: number, y?: number, positionType?: string): void;

/**
 * Shows the current element.
 *
 * @example <div>
 * <code>
 * let p;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a paragraph element and hide it.
 * p = createP('p5*js');
 * p.position(10, 10);
 * p.hide();
 * 
 * describe('A gray square. The text "p5*js" appears when the user double-clicks the square.');
 * }
 * 
 * // Show the paragraph when the user double-clicks.
 * function doubleClicked() {
 * p.show();
 * }
 * </code>
 * </div>
 */
function show(): void;

/**
 * Hides the current element.
 *
 * @example let p;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a paragraph element.
 * p = createP('p5*js');
 * p.position(10, 10);
 * 
 * describe('The text "p5*js" at the center of a gray square. The text disappears when the user double-clicks the square.');
 * }
 * 
 * // Hide the paragraph when the user double-clicks.
 * function doubleClicked() {
 * p.hide();
 * }
 * </code>
 * </div>
 */
function hide(): void;

/**
 * Sets the element's width and height.Calling `myElement.size()` without an argument returns the element's size
 * as an object with the properties `width` and `height`. For example,
 * `{ width: 20, height: 10 }`.The first parameter, `width`, is optional. It's a number used to set the
 * element's width. Calling `myElement.size(10)`The second parameter, 'height`, is also optional. It's a
 * number used to set the element's height. For example, calling
 * `myElement.size(20, 10)` sets the element's width to 20 pixels and height
 * to 10 pixels.The constant `AUTO` can be used to adjust one dimension at a time while
 * maintaining the aspect ratio, which is `width / height`. For example,
 * consider an element that's 200 pixels wide and 100 pixels tall. Calling
 * `myElement.size(20, AUTO)` sets the width to 20 pixels and height to 10
 * pixels.Note: In the case of elements that need to load data, such as images, wait
 * to call `myElement.size()` until after the data loads.
 *
 * @return width and height of the element in an object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a pink div element and place it at the top-left corner.
 * let div = createDiv();
 * div.position(10, 10);
 * div.style('background-color', 'deeppink');
 * 
 * // Set the div's width to 80 pixels and height to 20 pixels.
 * div.size(80, 20);
 * 
 * describe('A gray square with a pink rectangle near its top.');
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
 * // Create a pink div element and place it at the top-left corner.
 * let div = createDiv();
 * div.position(10, 10);
 * div.style('background-color', 'deeppink');
 * 
 * // Set the div's width to 80 pixels and height to 40 pixels.
 * div.size(80, 40);
 * 
 * // Get the div's size as an object.
 * let s = div.size();
 * 
 * // Display the div's dimensions.
 * div.html(`${s.width} x ${s.height}`);
 * 
 * describe('A gray square with a pink rectangle near its top. The text "80 x 40" is written within the rectangle.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img1;
 * let img2;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Load an image of an astronaut on the moon
 * // and place it at the top-left of the canvas.
 * img1 = createImg(
 * 'assets/moonwalk.jpg',
 * 'An astronaut walking on the moon',
 * ''
 * );
 * img1.position(0, 0);
 * 
 * // Load an image of an astronaut on the moon
 * // and place it at the top-left of the canvas.
 * // Resize the image once it's loaded.
 * img2 = createImg(
 * 'assets/moonwalk.jpg',
 * 'An astronaut walking on the moon',
 * '',
 * resizeImage
 * );
 * img2.position(0, 0);
 * 
 * describe('A gray square two copies of a space image at the top-left. The copy in front is smaller.');
 * }
 * 
 * // Resize img2 and keep its aspect ratio.
 * function resizeImage() {
 * img2.size(50, AUTO);
 * }
 * </code>
 * </div>
 */
function size(w: any, h: any): object;

/**
 * @param width of the element, either AUTO, or a number.
 * @param height of the element, either AUTO, or a number.
 */
function size(w?: number | AUTO, h?: number | AUTO): void;

/**
 * Applies a style to the element by adding a
 * CSS declaration.The first parameter, `property`, is a string. If the name of a style
 * property is passed, as in `myElement.style('color')`, the method returns
 * the current value as a string or `null` if it hasn't been set. If a
 * `property:style` string is passed, as in
 * `myElement.style('color:deeppink')`, the method sets the style `property`
 * to `value`.The second parameter, `value`, is optional. It sets the property's value.
 * `value` can be a string, as in
 * `myElement.style('color', 'deeppink')`, or a
 * p5.Color object, as in
 * `myElement.style('color', myColor)`.
 *
 * @param style property to set.
 * @returns value of the property.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a paragraph element and set its font color to "deeppink".
 * let p = createP('p5*js');
 * p.position(25, 20);
 * p.style('color', 'deeppink');
 * 
 * describe('The text p5*js written in pink on a gray background.');
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
 * // Create a p5.Color object.
 * let c = color('deeppink');
 * 
 * // Create a paragraph element and set its font color using a p5.Color object.
 * let p = createP('p5*js');
 * p.position(25, 20);
 * p.style('color', c);
 * 
 * describe('The text p5*js written in pink on a gray background.');
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
 * // Create a paragraph element and set its font color to "deeppink"
 * // using property:value syntax.
 * let p = createP('p5*js');
 * p.position(25, 20);
 * p.style('color:deeppink');
 * 
 * describe('The text p5*js written in pink on a gray background.');
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
 * // Create an empty paragraph element and set its font color to "deeppink".
 * let p = createP();
 * p.position(5, 5);
 * p.style('color', 'deeppink');
 * 
 * // Get the element's color as an  RGB color string.
 * let c = p.style('color');
 * 
 * // Set the element's inner HTML using the RGB color string.
 * p.html(c);
 * 
 * describe('The text "rgb(255, 20, 147)" written in pink on a gray background.');
 * }
 * </code>
 * </div>
 */
function style(prop: any, val: any, property: string): string;

/**
 * @param value to assign to the property.
 * @return value of the property.
 */
function style(prop: any, val: any, property: string, value: string | p5.Color): string;

/**
 * Adds an
 * attribute
 * to the element.This method is useful for advanced tasks. Most commonly-used attributes,
 * such as `id`, can be set with their dedicated methods. For example,
 * `nextButton.id('next')` sets an element's `id` attribute. Calling
 * `nextButton.attribute('id', 'next')` has the same effect.The first parameter, `attr`, is the attribute's name as a string. Calling
 * `myElement.attribute('align')` returns the attribute's current value as a
 * string or `null` if it hasn't been set.The second parameter, `value`, is optional. It's a string used to set the
 * attribute's value. For example, calling
 * `myElement.attribute('align', 'center')` sets the element's horizontal
 * alignment to `center`.
 *
 * @return value of the attribute.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a container div element and place it at the top-left corner.
 * let container = createDiv();
 * container.position(0, 0);
 * 
 * // Create a paragraph element and place it within the container.
 * // Set its horizontal alignment to "left".
 * let p1 = createP('hi');
 * p1.parent(container);
 * p1.attribute('align', 'left');
 * 
 * // Create a paragraph element and place it within the container.
 * // Set its horizontal alignment to "center".
 * let p2 = createP('hi');
 * p2.parent(container);
 * p2.attribute('align', 'center');
 * 
 * // Create a paragraph element and place it within the container.
 * // Set its horizontal alignment to "right".
 * let p3 = createP('hi');
 * p3.parent(container);
 * p3.attribute('align', 'right');
 * 
 * describe('A gray square with the text "hi" written on three separate lines, each placed further to the right.');
 * }
 * </code>
 * </div>
 */
function attribute(attr: any, value: any): string;

/**
 * @param attribute to set.
 * @param value to assign to the attribute.
 */
function attribute(attr: string, value: string): void;

/**
 * Removes an attribute from the element.The parameter `attr` is the attribute's name as a string. For example,
 * calling `myElement.removeAttribute('align')` removes its `align`
 * attribute if it's been set.
 *
 * @param attribute to remove.
 * @example <div>
 * <code>
 * let p;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a paragraph element and place it in the center of the canvas.
 * // Set its "align" attribute to "center".
 * p = createP('hi');
 * p.position(0, 20);
 * p.attribute('align', 'center');
 * 
 * describe('The text "hi" written in black at the center of a gray square. The text moves to the left edge when double-clicked.');
 * }
 * 
 * // Remove the 'align' attribute when the user double-clicks the paragraph.
 * function doubleClicked() {
 * p.removeAttribute('align');
 * }
 * </code>
 * </div>
 */
function removeAttribute(attr: string): void;

/**
 * Returns or sets the element's value.Calling `myElement.value()` returns the element's current value.The parameter, `value`, is an optional number or string. If provided,
 * as in `myElement.value(123)`, it's used to set the element's value.
 *
 * @return value of the element.
 * @example <div>
 * <code>
 * let input;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a text input and place it beneath the canvas.
 * // Set its default value to "hello".
 * input = createInput('hello');
 * input.position(0, 100);
 * 
 * describe('The text from an input box is displayed on a gray square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Use the input's value to display a message.
 * let msg = input.value();
 * text(msg, 0, 55);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let input;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a text input and place it beneath the canvas.
 * // Set its default value to "hello".
 * input = createInput('hello');
 * input.position(0, 100);
 * 
 * describe('The text from an input box is displayed on a gray square. The text resets to "hello" when the user double-clicks the square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Use the input's value to display a message.
 * let msg = input.value();
 * text(msg, 0, 55);
 * }
 * 
 * // Reset the input's value.
 * function doubleClicked() {
 * input.value('hello');
 * }
 * </code>
 * </div>
 */
function value(...args: any[]): string | number;

/**
 */
function value(...args: any[], value: string | number): void;

/**
 * Calls a function when the mouse is pressed over the element.Calling `myElement.mousePressed(false)` disables the function.Note: Some mobile browsers may also trigger this event when the element
 * receives a quick tap.
 *
 * @param function to call when the mouse is
 * pressed over the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call randomColor() when the canvas
 * // is pressed.
 * cnv.mousePressed(randomColor);
 * 
 * describe('A gray square changes color when the mouse is pressed.');
 * }
 * 
 * // Paint the background either
 * // red, yellow, blue, or green.
 * function randomColor() {
 * let c = random(['red', 'yellow', 'blue', 'green']);
 * background(c);
 * }
 * </code>
 * </div>
 */
function mousePressed(fxn: Function | boolean): void;

/**
 * Calls a function when the mouse is pressed twice over the element.Calling `myElement.doubleClicked(false)` disables the function.
 *
 * @param function to call when the mouse is
 * double clicked over the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call randomColor() when the
 * // canvas is double-clicked.
 * cnv.doubleClicked(randomColor);
 * 
 * describe('A gray square changes color when the user double-clicks the canvas.');
 * }
 * 
 * // Paint the background either
 * // red, yellow, blue, or green.
 * function randomColor() {
 * let c = random(['red', 'yellow', 'blue', 'green']);
 * background(c);
 * }
 * </code>
 * </div>
 */
function doubleClicked(fxn: Function | boolean): void;

/**
 * Calls a function when the mouse wheel scrolls over the element.The callback function, `fxn`, is passed an `event` object. `event` has
 * two numeric properties, `deltaY` and `deltaX`. `event.deltaY` is
 * negative if the mouse wheel rotates away from the user. It's positive if
 * the mouse wheel rotates toward the user. `event.deltaX` is positive if
 * the mouse wheel moves to the right. It's negative if the mouse wheel moves
 * to the left.Calling `myElement.mouseWheel(false)` disables the function.
 *
 * @param function to call when the mouse wheel is
 * scrolled over the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call randomColor() when the
 * // mouse wheel moves.
 * cnv.mouseWheel(randomColor);
 * 
 * describe('A gray square changes color when the user scrolls the mouse wheel over the canvas.');
 * }
 * 
 * // Paint the background either
 * // red, yellow, blue, or green.
 * function randomColor() {
 * let c = random(['red', 'yellow', 'blue', 'green']);
 * background(c);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call changeBackground() when the
 * // mouse wheel moves.
 * cnv.mouseWheel(changeBackground);
 * 
 * describe('A gray square. When the mouse wheel scrolls over the square, it changes color and displays shapes.');
 * }
 * 
 * function changeBackground(event) {
 * // Change the background color
 * // based on deltaY.
 * if (event.deltaY > 0) {
 * background('deeppink');
 * } else if (event.deltaY < 0) {
 * background('cornflowerblue');
 * } else {
 * background(200);
 * }
 * 
 * // Draw a shape based on deltaX.
 * if (event.deltaX > 0) {
 * circle(50, 50, 20);
 * } else if (event.deltaX < 0) {
 * square(40, 40, 20);
 * }
 * }
 * </code>
 * </div>
 */
function mouseWheel(fxn: Function | boolean): void;

/**
 * Calls a function when the mouse is released over the element.Calling `myElement.mouseReleased(false)` disables the function.Note: Some mobile browsers may also trigger this event when the element
 * receives a quick tap.
 *
 * @param function to call when the mouse is
 * pressed over the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call randomColor() when a
 * // mouse press ends.
 * cnv.mouseReleased(randomColor);
 * 
 * describe('A gray square changes color when the user releases a mouse press.');
 * }
 * 
 * // Paint the background either
 * // red, yellow, blue, or green.
 * function randomColor() {
 * let c = random(['red', 'yellow', 'blue', 'green']);
 * background(c);
 * }
 * </code>
 * </div>
 */
function mouseReleased(fxn: Function | boolean): void;

/**
 * Calls a function when the mouse is pressed and released over the element.Calling `myElement.mouseReleased(false)` disables the function.Note: Some mobile browsers may also trigger this event when the element
 * receives a quick tap.
 *
 * @param function to call when the mouse is
 * pressed and released over the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call randomColor() when a
 * // mouse press ends.
 * cnv.mouseClicked(randomColor);
 * 
 * describe('A gray square changes color when the user releases a mouse press.');
 * }
 * 
 * // Paint the background either
 * // red, yellow, blue, or green.
 * function randomColor() {
 * let c = random(['red', 'yellow', 'blue', 'green']);
 * background(c);
 * }
 * </code>
 * </div>
 */
function mouseClicked(fxn: Function | boolean): void;

/**
 * Calls a function when the mouse moves over the element.Calling `myElement.mouseMoved(false)` disables the function.
 *
 * @param function to call when the mouse
 * moves over the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call randomColor() when the
 * // mouse moves.
 * cnv.mouseMoved(randomColor);
 * 
 * describe('A gray square changes color when the mouse moves over the canvas.');
 * }
 * 
 * // Paint the background either
 * // red, yellow, blue, or green.
 * function randomColor() {
 * let c = random(['red', 'yellow', 'blue', 'green']);
 * background(c);
 * }
 * </code>
 * </div>
 */
function mouseMoved(fxn: Function | boolean): void;

/**
 * Calls a function when the mouse moves onto the element.Calling `myElement.mouseOver(false)` disables the function.
 *
 * @param function to call when the mouse
 * moves onto the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call randomColor() when the
 * // mouse moves onto the canvas.
 * cnv.mouseOver(randomColor);
 * 
 * describe('A gray square changes color when the mouse moves onto the canvas.');
 * }
 * 
 * // Paint the background either
 * // red, yellow, blue, or green.
 * function randomColor() {
 * let c = random(['red', 'yellow', 'blue', 'green']);
 * background(c);
 * }
 * </code>
 * </div>
 */
function mouseOver(fxn: Function | boolean): void;

/**
 * Calls a function when the mouse moves off the element.Calling `myElement.mouseOut(false)` disables the function.
 *
 * @param function to call when the mouse
 * moves off the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call randomColor() when the
 * // mouse moves off the canvas.
 * cnv.mouseOut(randomColor);
 * 
 * describe('A gray square changes color when the mouse moves off the canvas.');
 * }
 * 
 * // Paint the background either
 * // red, yellow, blue, or green.
 * function randomColor() {
 * let c = random(['red', 'yellow', 'blue', 'green']);
 * background(c);
 * }
 * </code>
 * </div>
 */
function mouseOut(fxn: Function | boolean): void;

/**
 * Calls a function when a file is dragged over the element.Calling `myElement.dragOver(false)` disables the function.
 *
 * @param function to call when the file is
 * dragged over the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * // Drag a file over the canvas to test.
 * 
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call helloFile() when a
 * // file is dragged over
 * // the canvas.
 * cnv.dragOver(helloFile);
 * 
 * describe('A gray square. The text "hello, file" appears when a file is dragged over the square.');
 * }
 * 
 * function helloFile() {
 * text('hello, file', 50, 50);
 * }
 * </code>
 * </div>
 */
function dragOver(fxn: Function | boolean): void;

/**
 * Calls a function when a file is dragged off the element.Calling `myElement.dragLeave(false)` disables the function.
 *
 * @param function to call when the file is
 * dragged off the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * // Drag a file over, then off
 * // the canvas to test.
 * 
 * function setup() {
 * // Create a canvas element and
 * // assign it to cnv.
 * let cnv = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call byeFile() when a
 * // file is dragged over,
 * // then off the canvas.
 * cnv.dragLeave(byeFile);
 * 
 * describe('A gray square. The text "bye, file" appears when a file is dragged over, then off the square.');
 * }
 * 
 * function byeFile() {
 * text('bye, file', 50, 50);
 * }
 * </code>
 * </div>
 */
function dragLeave(fxn: Function | boolean): void;

/**
 * Calls a function when the element changes.Calling `myElement.changed(false)` disables the function.
 *
 * @param function to call when the element changes.
 * `false` disables the function.
 * @example <div>
 * <code>
 * let dropdown;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a dropdown menu and add a few color options.
 * dropdown = createSelect();
 * dropdown.position(0, 0);
 * dropdown.option('red');
 * dropdown.option('green');
 * dropdown.option('blue');
 * 
 * // Call paintBackground() when the color option changes.
 * dropdown.changed(paintBackground);
 * 
 * describe('A gray square with a dropdown menu at the top. The square changes color when an option is selected.');
 * }
 * 
 * // Paint the background with the selected color.
 * function paintBackground() {
 * let c = dropdown.value();
 * background(c);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let checkbox;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a checkbox and place it beneath the canvas.
 * checkbox = createCheckbox(' circle');
 * checkbox.position(0, 100);
 * 
 * // Call repaint() when the checkbox changes.
 * checkbox.changed(repaint);
 * 
 * describe('A gray square with a checkbox underneath it that says "circle". A white circle appears when the box is checked and disappears otherwise.');
 * }
 * 
 * // Paint the background gray and determine whether to draw a circle.
 * function repaint() {
 * background(200);
 * if (checkbox.checked() === true) {
 * circle(50, 50, 30);
 * }
 * }
 * </code>
 * </div>
 */
function changed(fxn: Function | boolean): void;

/**
 * Calls a function when the element receives input.`myElement.input()` is often used to with text inputs and sliders. Calling
 * `myElement.input(false)` disables the function.
 *
 * @param function to call when input is detected within
 * the element.
 * `false` disables the function.
 * @example <div>
 * <code>
 * let slider;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a slider and place it beneath the canvas.
 * slider = createSlider(0, 255, 200);
 * slider.position(0, 100);
 * 
 * // Call repaint() when the slider changes.
 * slider.input(repaint);
 * 
 * describe('A gray square with a range slider underneath it. The background changes shades of gray when the slider is moved.');
 * }
 * 
 * // Paint the background using slider's value.
 * function repaint() {
 * let g = slider.value();
 * background(g);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let input;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create an input and place it beneath the canvas.
 * input = createInput('');
 * input.position(0, 100);
 * 
 * // Call repaint() when input is detected.
 * input.input(repaint);
 * 
 * describe('A gray square with a text input bar beneath it. Any text written in the input appears in the middle of the square.');
 * }
 * 
 * // Paint the background gray and display the input's value.
 * function repaint() {
 * background(200);
 * let msg = input.value();
 * text(msg, 5, 50);
 * }
 * </code>
 * </div>
 */
function input(fxn: Function | boolean): void;

/**
 * Calls a function when the user drops a file on the element.The first parameter, `callback`, is a function to call once the file loads.
 * The callback function should have one parameter, `file`, that's a
 * p5.File object. If the user drops multiple files on
 * the element, `callback`, is called once for each file.The second parameter, `fxn`, is a function to call when the browser detects
 * one or more dropped files. The callback function should have one
 * parameter, `event`, that's a
 * DragEvent.
 *
 * @param called when a file loads. Called once for each file dropped.
 * @param called once when any files are dropped.
 * @example <div>
 * <code>
 * // Drop an image on the canvas to view
 * // this example.
 * let img;
 * 
 * function setup() {
 * let c = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call handleFile() when a file that's dropped on the canvas has loaded.
 * c.drop(handleFile);
 * 
 * describe('A gray square. When the user drops an image on the square, it is displayed.');
 * }
 * 
 * // Remove the existing image and display the new one.
 * function handleFile(file) {
 * // Remove the current image, if any.
 * if (img) {
 * img.remove();
 * }
 * 
 * // Create an <img> element with the
 * // dropped file.
 * img = createImg(file.data, '');
 * img.hide();
 * 
 * // Draw the image.
 * image(img, 0, 0, width, height);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Drop an image on the canvas to view
 * // this example.
 * let img;
 * let msg;
 * 
 * function setup() {
 * let c = createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Call functions when the user drops a file on the canvas
 * // and when the file loads.
 * c.drop(handleFile, handleDrop);
 * 
 * describe('A gray square. When the user drops an image on the square, it is displayed. The id attribute of canvas element is also displayed.');
 * }
 * 
 * // Display the image when it loads.
 * function handleFile(file) {
 * // Remove the current image, if any.
 * if (img) {
 * img.remove();
 * }
 * 
 * // Create an img element with the dropped file.
 * img = createImg(file.data, '');
 * img.hide();
 * 
 * // Draw the image.
 * image(img, 0, 0, width, height);
 * }
 * 
 * // Display the file's name when it loads.
 * function handleDrop(event) {
 * // Remove current paragraph, if any.
 * if (msg) {
 * msg.remove();
 * }
 * 
 * // Use event to get the drop target's id.
 * let id = event.target.id;
 * 
 * // Write the canvas' id beneath it.
 * msg = createP(id);
 * msg.position(0, 100);
 * 
 * // Set the font color randomly for each drop.
 * let c = random(['red', 'green', 'blue']);
 * msg.style('color', c);
 * msg.style('font-size', '12px');
 * }
 * </code>
 * </div>
 */
function drop(callback: Function, fxn?: Function): void;

/**
 * Makes the element draggable.The parameter, `elmnt`, is optional. If another
 * p5.Element object is passed, as in
 * `myElement.draggable(otherElement)`, the other element will become draggable.
 *
 * @param another <a href="#/p5.Element">p5.Element</a>.
 * @example <div>
 * <code>
 * let stickyNote;
 * let textInput;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a div element and style it.
 * stickyNote = createDiv('Note');
 * stickyNote.position(5, 5);
 * stickyNote.size(80, 20);
 * stickyNote.style('font-size', '16px');
 * stickyNote.style('font-family', 'Comic Sans MS');
 * stickyNote.style('background', 'orchid');
 * stickyNote.style('padding', '5px');
 * 
 * // Make the note draggable.
 * stickyNote.draggable();
 * 
 * // Create a panel div and style it.
 * let panel = createDiv('');
 * panel.position(5, 40);
 * panel.size(80, 50);
 * panel.style('background', 'orchid');
 * panel.style('font-size', '16px');
 * panel.style('padding', '5px');
 * panel.style('text-align', 'center');
 * 
 * // Make the panel draggable.
 * panel.draggable();
 * 
 * // Create a text input and style it.
 * textInput = createInput('Note');
 * textInput.size(70);
 * 
 * // Add the input to the panel.
 * textInput.parent(panel);
 * 
 * // Call handleInput() when text is input.
 * textInput.input(handleInput);
 * 
 * describe(
 * 'A gray square with two purple rectangles that move when dragged. The top rectangle displays the text that is typed into the bottom rectangle.'
 * );
 * }
 * 
 * // Update stickyNote's HTML when text is input.
 * function handleInput() {
 * stickyNote.html(textInput.value());
 * }
 * </code>
 * </div>
 */
function draggable(elmMove: any, elmnt?: p5.Element): void;

}

export default function p5_Element(p5: any, fn: any): void;
