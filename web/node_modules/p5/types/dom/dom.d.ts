// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';

declare module 'p5' {
/**
 * Helper function for select and selectAll
 *
 */
function _getContainer(p: any): void;

/**
 * Helper function for getElement and getElements.
 *
 */
function _wrapElement(elt: any): void;

/**
 * Searches the page for the first element that matches the given
 * CSS selector string.The selector string can be an ID, class, tag name, or a combination.
 * `select()` returns a p5.Element object if it
 * finds a match and `null` if not.The second parameter, `container`, is optional. It specifies a container to
 * search within. `container` can be CSS selector string, a
 * p5.Element object, or an
 * HTMLElement object.
 *
 * @param CSS selector string of element to search for.
 * @param CSS selector string, <a href="#/p5.Element">p5.Element</a>, or
 * <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement" target="_blank">HTMLElement</a> to search within.
 * @return <a href="#/p5.Element">p5.Element</a> containing the element.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(200);
 * 
 * // Select the canvas by its tag.
 * let cnv = select('canvas');
 * cnv.style('border', '5px deeppink dashed');
 * 
 * describe('A gray square with a dashed pink border.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * let cnv = createCanvas(100, 100);
 * 
 * // Add a class attribute to the canvas.
 * cnv.class('pinkborder');
 * 
 * background(200);
 * 
 * // Select the canvas by its class.
 * cnv = select('.pinkborder');
 * 
 * // Style its border.
 * cnv.style('border', '5px deeppink dashed');
 * 
 * describe('A gray square with a dashed pink border.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * let cnv = createCanvas(100, 100);
 * 
 * // Set the canvas' ID.
 * cnv.id('mycanvas');
 * 
 * background(200);
 * 
 * // Select the canvas by its ID.
 * cnv = select('#mycanvas');
 * 
 * // Style its border.
 * cnv.style('border', '5px deeppink dashed');
 * 
 * describe('A gray square with a dashed pink border.');
 * }
 * </code>
 * </div>
 */
function select(selectors: string, container?: string | p5.Element | HTMLElement): p5.Element | any;

/**
 * Searches the page for all elements that matches the given
 * CSS selector string.The selector string can be an ID, class, tag name, or a combination.
 * `selectAll()` returns an array of p5.Element
 * objects if it finds any matches and an empty array if none are found.The second parameter, `container`, is optional. It specifies a container to
 * search within. `container` can be CSS selector string, a
 * p5.Element object, or an
 * HTMLElement object.
 *
 * @param CSS selector string of element to search for.
 * @param CSS selector string, <a href="#/p5.Element">p5.Element</a>, or
 * <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement" target="_blank">HTMLElement</a> to search within.
 * @return array of <a href="#/p5.Element">p5.Element</a>s containing any elements found.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create three buttons.
 * createButton('1');
 * createButton('2');
 * createButton('3');
 * 
 * // Select the buttons by their tag.
 * let buttons = selectAll('button');
 * 
 * // Position the buttons.
 * for (let i = 0; i < 3; i += 1) {
 * buttons[i].position(0, i * 30);
 * }
 * 
 * describe('Three buttons stacked vertically. The buttons are labeled, "1", "2", and "3".');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * // Create three buttons and position them.
 * let b1 = createButton('1');
 * b1.position(0, 0);
 * let b2 = createButton('2');
 * b2.position(0, 30);
 * let b3 = createButton('3');
 * b3.position(0, 60);
 * 
 * // Add a class attribute to each button.
 * b1.class('btn');
 * b2.class('btn btn-pink');
 * b3.class('btn');
 * 
 * // Select the buttons by their class.
 * let buttons = selectAll('.btn');
 * let pinkButtons = selectAll('.btn-pink');
 * 
 * // Style the selected buttons.
 * buttons.forEach(setFont);
 * pinkButtons.forEach(setColor);
 * 
 * describe('Three buttons stacked vertically. The buttons are labeled, "1", "2", and "3". Buttons "1" and "3" are gray. Button "2" is pink.');
 * }
 * 
 * // Set a button's font to Comic Sans MS.
 * function setFont(btn) {
 * btn.style('font-family', 'Comic Sans MS');
 * }
 * 
 * // Set a button's background and font color.
 * function setColor(btn) {
 * btn.style('background', 'deeppink');
 * btn.style('color', 'white');
 * }
 * </code>
 * </div>
 */
function selectAll(selectors: string, container?: string | p5.Element | HTMLElement): p5.Element[];

/**
 * Creates a new p5.Element object.The first parameter, `tag`, is a string an HTML tag such as `'h5'`.The second parameter, `content`, is optional. It's a string that sets the
 * HTML content to insert into the new element. New elements have no content
 * by default.
 *
 * @param tag for the new element.
 * @param HTML content to insert into the element.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create an h5 element with nothing in it.
 * createElement('h5');
 * 
 * describe('A gray square.');
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
 * // Create an h5 element with the content "p5*js".
 * let h5 = createElement('h5', 'p5*js');
 * 
 * // Set the element's style and position.
 * h5.style('color', 'deeppink');
 * h5.position(30, 15);
 * 
 * describe('The text "p5*js" written in pink in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function createElement(tag: string, content?: string): p5.Element;

/**
 * Removes all elements created by p5.js, including any event handlers.There are two exceptions:
 * canvas elements created by createCanvas()
 * and p5.Render objects created by
 * createGraphics().
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a paragraph element and place
 * // it in the middle of the canvas.
 * let p = createP('p5*js');
 * p.position(25, 25);
 * 
 * describe('A gray square with the text "p5*js" written in its center. The text disappears when the mouse is pressed.');
 * }
 * 
 * // Remove all elements when the mouse is pressed.
 * function mousePressed() {
 * removeElements();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let slider;
 * 
 * function setup() {
 * createCanvas(200, 200);
 * 
 * // Create a paragraph element and place
 * // it at the top of the canvas.
 * let p = createP('p5*js');
 * p.position(25, 25);
 * 
 * // Create a slider element and place it
 * // beneath the canvas.
 * slider = createSlider(0, 255, 200);
 * slider.position(0, 100);
 * 
 * describe('A gray square with the text "p5*js" written in its center and a range slider beneath it. The square changes color when the slider is moved. The text and slider disappear when the square is double-clicked.');
 * }
 * 
 * function draw() {
 * // Use the slider value to change the background color.
 * let g = slider.value();
 * background(g);
 * }
 * 
 * // Remove all elements when the mouse is double-clicked.
 * function doubleClicked() {
 * removeElements();
 * }
 * </code>
 * </div>
 */
function removeElements(): void;

/**
 * Helpers for create methods.
 *
 */
function addElement(elt: any, pInst: any, media: any): void;

/**
 * Creates a `&lt;div&gt;&lt;/div&gt;` element.`&lt;div&gt;&lt;/div&gt;` elements are commonly used as containers for
 * other elements.The parameter `html` is optional. It accepts a string that sets the
 * inner HTML of the new `&lt;div&gt;&lt;/div&gt;`.
 *
 * @param inner HTML for the new `&lt;div&gt;&lt;/div&gt;` element.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a div element and set its position.
 * let div = createDiv('p5*js');
 * div.position(25, 35);
 * 
 * describe('A gray square with the text "p5*js" written in its center.');
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
 * // Create an h3 element within the div.
 * let div = createDiv('<h3>p5*js</h3>');
 * div.position(20, 5);
 * 
 * describe('A gray square with the text "p5*js" written in its center.');
 * }
 * </code>
 * </div>
 */
function createDiv(html?: string): p5.Element;

/**
 * Creates a paragraph element.`&lt;p&gt;&lt;/p&gt;` elements are commonly used for paragraph-length text.The parameter `html` is optional. It accepts a string that sets the
 * inner HTML of the new `&lt;p&gt;&lt;/p&gt;`.
 *
 * @param inner HTML for the new `&lt;p&gt;&lt;/p&gt;` element.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a paragraph element and set its position.
 * let p = createP('Tell me a story.');
 * p.position(5, 0);
 * 
 * describe('A gray square displaying the text "Tell me a story." written in black.');
 * }
 * </code>
 * </div>
 */
function createP(html?: string): p5.Element;

/**
 * Creates a `&lt;span&gt;&lt;/span&gt;` element.`&lt;span&gt;&lt;/span&gt;` elements are commonly used as containers
 * for inline elements. For example, a `&lt;span&gt;&lt;/span&gt;`
 * can hold part of a sentence that's a
 * different style.The parameter `html` is optional. It accepts a string that sets the
 * inner HTML of the new `&lt;span&gt;&lt;/span&gt;`.
 *
 * @param inner HTML for the new `&lt;span&gt;&lt;/span&gt;` element.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a span element and set its position.
 * let span = createSpan('p5*js');
 * span.position(25, 35);
 * 
 * describe('A gray square with the text "p5*js" written in its center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * background(200);
 * 
 * // Create a div element as a container.
 * let div = createDiv();
 * 
 * // Place the div at the center.
 * div.position(25, 35);
 * 
 * // Create a span element.
 * let s1 = createSpan('p5');
 * 
 * // Create a second span element.
 * let s2 = createSpan('*');
 * 
 * // Set the second span's font color.
 * s2.style('color', 'deeppink');
 * 
 * // Create a third span element.
 * let s3 = createSpan('js');
 * 
 * // Add all the spans to the container div.
 * s1.parent(div);
 * s2.parent(div);
 * s3.parent(div);
 * 
 * describe('A gray square with the text "p5*js" written in black at its center. The asterisk is pink.');
 * }
 * </code>
 * </div>
 */
function createSpan(html?: string): p5.Element;

/**
 * Creates an `&lt;img&gt;` element that can appear outside of the canvas.The first parameter, `src`, is a string with the path to the image file.
 * `src` should be a relative path, as in `'assets/image.png'`, or a URL, as
 * in `'https://example.com/image.png'`.The second parameter, `alt`, is a string with the
 * alternate text
 * for the image. An empty string `''` can be used for images that aren't displayed.The third parameter, `crossOrigin`, is optional. It's a string that sets the
 * crossOrigin property
 * of the image. Use `'anonymous'` or `'use-credentials'` to fetch the image
 * with cross-origin access.The fourth parameter, `callback`, is also optional. It sets a function to
 * call after the image loads. The new image is passed to the callback
 * function as a p5.Element object.
 *
 * @param relative path or URL for the image.
 * @param alternate text for the image.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * let img = createImg(
 * '/assets/cat.jpg',
 * 'image of a cat'
 * );
 * img.position(0, 10);
 * 
 * describe('A gray square with a magenta asterisk in its center.');
 * }
 * </code>
 * </div>
 */
function createImg(src: string, alt: string): p5.Element;

/**
 * @param crossOrigin property to use when fetching the image.
 * @param function to call once the image loads. The new image will be passed
 * to the function as a <a href="#/p5.Element">p5.Element</a> object.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 */
function createImg(src: string, alt: string, crossOrigin?: string, successCallback?: Function): p5.Element;

/**
 * Creates an `&lt;a&gt;&lt;/a&gt;` element that links to another web page.The first parmeter, `href`, is a string that sets the URL of the linked
 * page.The second parameter, `html`, is a string that sets the inner HTML of the
 * link. It's common to use text, images, or buttons as links.The third parameter, `target`, is optional. It's a string that tells the
 * web browser where to open the link. By default, links open in the current
 * browser tab. Passing `'_blank'` will cause the link to open in a new
 * browser tab. MDN describes a few
 * other options.
 *
 * @param URL of linked page.
 * @param inner HTML of link element to display.
 * @param target where the new link should open,
 * either `'_blank'`, `'_self'`, `'_parent'`, or `'_top'`.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create an anchor element that links to p5js.org.
 * let a = createA('https://p5js.org/', 'p5*js');
 * a.position(25, 35);
 * 
 * describe('The text "p5*js" written at the center of a gray square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * background(200);
 * 
 * // Create an anchor tag that links to p5js.org.
 * // Open the link in a new tab.
 * let a = createA('https://p5js.org/', 'p5*js', '_blank');
 * a.position(25, 35);
 * 
 * describe('The text "p5*js" written at the center of a gray square.');
 * }
 * </code>
 * </div>
 */
function createA(href: string, html: string, target?: string): p5.Element;

/**
 * Creates a slider `&lt;input&gt;&lt;/input&gt;` element.Range sliders are useful for quickly selecting numbers from a given range.The first two parameters, `min` and `max`, are numbers that set the
 * slider's minimum and maximum.The third parameter, `value`, is optional. It's a number that sets the
 * slider's default value.The fourth parameter, `step`, is also optional. It's a number that sets the
 * spacing between each value in the slider's range. Setting `step` to 0
 * allows the slider to move smoothly from `min` to `max`.
 *
 * @param minimum value of the slider.
 * @param maximum value of the slider.
 * @param default value of the slider.
 * @param size for each step in the slider's range.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * let slider;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a slider and place it at the top of the canvas.
 * slider = createSlider(0, 255);
 * slider.position(10, 10);
 * slider.size(80);
 * 
 * describe('A dark gray square with a range slider at the top. The square changes color when the slider is moved.');
 * }
 * 
 * function draw() {
 * // Use the slider as a grayscale value.
 * let g = slider.value();
 * background(g);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let slider;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a slider and place it at the top of the canvas.
 * // Set its default value to 0.
 * slider = createSlider(0, 255, 0);
 * slider.position(10, 10);
 * slider.size(80);
 * 
 * describe('A black square with a range slider at the top. The square changes color when the slider is moved.');
 * }
 * 
 * function draw() {
 * // Use the slider as a grayscale value.
 * let g = slider.value();
 * background(g);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let slider;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a slider and place it at the top of the canvas.
 * // Set its default value to 0.
 * // Set its step size to 50.
 * slider = createSlider(0, 255, 0, 50);
 * slider.position(10, 10);
 * slider.size(80);
 * 
 * describe('A black square with a range slider at the top. The square changes color when the slider is moved.');
 * }
 * 
 * function draw() {
 * // Use the slider as a grayscale value.
 * let g = slider.value();
 * background(g);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let slider;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a slider and place it at the top of the canvas.
 * // Set its default value to 0.
 * // Set its step size to 0 so that it moves smoothly.
 * slider = createSlider(0, 255, 0, 0);
 * slider.position(10, 10);
 * slider.size(80);
 * 
 * describe('A black square with a range slider at the top. The square changes color when the slider is moved.');
 * }
 * 
 * function draw() {
 * // Use the slider as a grayscale value.
 * let g = slider.value();
 * background(g);
 * }
 * </code>
 * </div>
 */
function createSlider(min: number, max: number, value?: number, step?: number): p5.Element;

/**
 * Creates a `&lt;button&gt;&lt;/button&gt;` element.The first parameter, `label`, is a string that sets the label displayed on
 * the button.The second parameter, `value`, is optional. It's a string that sets the
 * button's value. See
 * MDN
 * for more details.
 *
 * @param label displayed on the button.
 * @param value of the button.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a button and place it beneath the canvas.
 * let button = createButton('click me');
 * button.position(0, 100);
 * 
 * // Call repaint() when the button is pressed.
 * button.mousePressed(repaint);
 * 
 * describe('A gray square with a button that says "click me" beneath it. The square changes color when the button is clicked.');
 * }
 * 
 * // Change the background color.
 * function repaint() {
 * let g = random(255);
 * background(g);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let button;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a button and set its value to 0.
 * // Place the button beneath the canvas.
 * button = createButton('click me', 'red');
 * button.position(0, 100);
 * 
 * // Call randomColor() when the button is pressed.
 * button.mousePressed(randomColor);
 * 
 * describe('A red square with a button that says "click me" beneath it. The square changes color when the button is clicked.');
 * }
 * 
 * function draw() {
 * // Use the button's value to set the background color.
 * let c = button.value();
 * background(c);
 * }
 * 
 * // Set the button's value to a random color.
 * function randomColor() {
 * let c = random(['red', 'green', 'blue', 'yellow']);
 * button.value(c);
 * }
 * </code>
 * </div>
 */
function createButton(label: string, value?: string): p5.Element;

/**
 * Creates a checkbox `&lt;input&gt;&lt;/input&gt;` element.Checkboxes extend the p5.Element class with a
 * `checked()` method. Calling `myBox.checked()` returns `true` if it the box
 * is checked and `false` if not.The first parameter, `label`, is optional. It's a string that sets the label
 * to display next to the checkbox.The second parameter, `value`, is also optional. It's a boolean that sets the
 * checkbox's value.
 *
 * @param label displayed after the checkbox.
 * @param value of the checkbox. Checked is `true` and unchecked is `false`.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * let checkbox;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a checkbox and place it beneath the canvas.
 * checkbox = createCheckbox();
 * checkbox.position(0, 70);
 * 
 * describe('A black square with a checkbox beneath it. The square turns white when the box is checked.');
 * }
 * 
 * function draw() {
 * // Use the checkbox to set the background color.
 * if (checkbox.checked()) {
 * background(255);
 * } else {
 * background(0);
 * }
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
 * // Create a checkbox and place it beneath the canvas.
 * // Label the checkbox "white".
 * checkbox = createCheckbox(' white');
 * checkbox.position(0, 70);
 * 
 * describe('A black square with a checkbox labeled "white" beneath it. The square turns white when the box is checked.');
 * }
 * 
 * function draw() {
 * // Use the checkbox to set the background color.
 * if (checkbox.checked()) {
 * background(255);
 * } else {
 * background(0);
 * }
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
 * // Create a checkbox and place it beneath the canvas.
 * // Label the checkbox "white" and set its value to true.
 * checkbox = createCheckbox(' white', true);
 * checkbox.position(0, 70);
 * 
 * describe('A white square with a checkbox labeled "white" beneath it. The square turns black when the box is unchecked.');
 * }
 * 
 * function draw() {
 * // Use the checkbox to set the background color.
 * if (checkbox.checked()) {
 * background(255);
 * } else {
 * background(0);
 * }
 * }
 * </code>
 * </div>
 */
function createCheckbox(label?: string, value?: boolean): p5.Element;

/**
 * Creates a dropdown menu `&lt;select&gt;&lt;/select&gt;` element.The parameter is optional. If `true` is passed, as in
 * `let mySelect = createSelect(true)`, then the dropdown will support
 * multiple selections. If an existing `&lt;select&gt;&lt;/select&gt;` element
 * is passed, as in `let mySelect = createSelect(otherSelect)`, the existing
 * element will be wrapped in a new p5.Element
 * object.Dropdowns extend the p5.Element class with a few
 * helpful methods for managing options:
 *
 * @param support multiple selections.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * let mySelect;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a dropdown and place it beneath the canvas.
 * mySelect = createSelect();
 * mySelect.position(0, 100);
 * 
 * // Add color options.
 * mySelect.option('red');
 * mySelect.option('green');
 * mySelect.option('blue');
 * mySelect.option('yellow');
 * 
 * // Set the selected option to "red".
 * mySelect.selected('red');
 * 
 * describe('A red square with a dropdown menu beneath it. The square changes color when a new color is selected.');
 * }
 * 
 * function draw() {
 * // Use the selected value to paint the background.
 * let c = mySelect.selected();
 * background(c);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mySelect;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a dropdown and place it beneath the canvas.
 * mySelect = createSelect();
 * mySelect.position(0, 100);
 * 
 * // Add color options.
 * mySelect.option('red');
 * mySelect.option('green');
 * mySelect.option('blue');
 * mySelect.option('yellow');
 * 
 * // Set the selected option to "red".
 * mySelect.selected('red');
 * 
 * // Disable the "yellow" option.
 * mySelect.disable('yellow');
 * 
 * describe('A red square with a dropdown menu beneath it. The square changes color when a new color is selected.');
 * }
 * 
 * function draw() {
 * // Use the selected value to paint the background.
 * let c = mySelect.selected();
 * background(c);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mySelect;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a dropdown and place it beneath the canvas.
 * mySelect = createSelect();
 * mySelect.position(0, 100);
 * 
 * // Add color options with names and values.
 * mySelect.option('one', 'red');
 * mySelect.option('two', 'green');
 * mySelect.option('three', 'blue');
 * mySelect.option('four', 'yellow');
 * 
 * // Set the selected option to "one".
 * mySelect.selected('one');
 * 
 * describe('A red square with a dropdown menu beneath it. The square changes color when a new color is selected.');
 * }
 * 
 * function draw() {
 * // Use the selected value to paint the background.
 * let c = mySelect.selected();
 * background(c);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Hold CTRL to select multiple options on Windows and Linux.
 * // Hold CMD to select multiple options on macOS.
 * let mySelect;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a dropdown and allow multiple selections.
 * // Place it beneath the canvas.
 * mySelect = createSelect(true);
 * mySelect.position(0, 100);
 * 
 * // Add color options.
 * mySelect.option('red');
 * mySelect.option('green');
 * mySelect.option('blue');
 * mySelect.option('yellow');
 * 
 * describe('A gray square with a dropdown menu beneath it. Colorful circles appear when their color is selected.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Use the selected value(s) to draw circles.
 * let colors = mySelect.selected();
 * for (let i = 0; i < colors.length; i += 1) {
 * // Calculate the x-coordinate.
 * let x = 10 + i * 20;
 * 
 * // Access the color.
 * let c = colors[i];
 * 
 * // Draw the circle.
 * fill(c);
 * circle(x, 50, 20);
 * }
 * }
 * </code>
 * </div>
 */
function createSelect(multiple?: boolean): p5.Element;

/**
 * @param select element to wrap, either as a <a href="#/p5.Element">p5.Element</a> or
 * a <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement" target="_blank">HTMLSelectElement</a>.
 */
function createSelect(existing: object): p5.Element;

/**
 * Creates a radio button element.The parameter is optional. If a string is passed, as in
 * `let myRadio = createSelect('food')`, then each radio option will
 * have `"food"` as its `name` parameter: `&lt;input name="food"&gt;&lt;/input&gt;`.
 * If an existing `&lt;div&gt;&lt;/div&gt;` or `&lt;span&gt;&lt;/span&gt;`
 * element is passed, as in `let myRadio = createSelect(container)`, it will
 * become the radio button's parent element.Radio buttons extend the p5.Element class with a few
 * helpful methods for managing options:
 *
 * @param container HTML Element, either a `&lt;div&gt;&lt;/div&gt;`
 * or `&lt;span&gt;&lt;/span&gt;`.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * let style = document.createElement('style');
 * style.innerHTML = `
 * .p5-radio label {
 * display: flex;
 * align-items: center;
 * }
 * .p5-radio input {
 * margin-right: 5px;
 * }
 * `;
 * document.head.appendChild(style);
 * 
 * let myRadio;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a radio button element and place it
 * // in the top-left corner.
 * myRadio = createRadio();
 * myRadio.position(0, 0);
 * myRadio.class('p5-radio');
 * myRadio.size(60);
 * 
 * // Add a few color options.
 * myRadio.option('red');
 * myRadio.option('yellow');
 * myRadio.option('blue');
 * 
 * // Choose a default option.
 * myRadio.selected('yellow');
 * 
 * describe('A yellow square with three color options listed, "red", "yellow", and "blue". The square changes color when the user selects a new option.');
 * }
 * 
 * function draw() {
 * // Set the background color using the radio button.
 * let g = myRadio.value();
 * background(g);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myRadio;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a radio button element and place it
 * // in the top-left corner.
 * myRadio = createRadio();
 * myRadio.position(0, 0);
 * myRadio.size(50);
 * 
 * // Add a few color options.
 * // Color values are labeled with
 * // emotions they evoke.
 * myRadio.option('red', 'love');
 * myRadio.option('yellow', 'joy');
 * myRadio.option('blue', 'trust');
 * 
 * // Choose a default option.
 * myRadio.selected('yellow');
 * 
 * describe('A yellow square with three options listed, "love", "joy", and "trust". The square changes color when the user selects a new option.');
 * }
 * 
 * function draw() {
 * // Set the background color using the radio button.
 * let c = myRadio.value();
 * background(c);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myRadio;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a radio button element and place it
 * // in the top-left corner.
 * myRadio = createRadio();
 * myRadio.position(0, 0);
 * myRadio.size(50);
 * 
 * // Add a few color options.
 * myRadio.option('red');
 * myRadio.option('yellow');
 * myRadio.option('blue');
 * 
 * // Choose a default option.
 * myRadio.selected('yellow');
 * 
 * // Create a button and place it beneath the canvas.
 * let btn = createButton('disable');
 * btn.position(0, 100);
 * 
 * // Call disableRadio() when btn is pressed.
 * btn.mousePressed(disableRadio);
 * 
 * describe('A yellow square with three options listed, "red", "yellow", and "blue". The square changes color when the user selects a new option. A "disable" button beneath the canvas disables the color options when pressed.');
 * }
 * 
 * function draw() {
 * // Set the background color using the radio button.
 * let c = myRadio.value();
 * background(c);
 * }
 * 
 * // Disable myRadio.
 * function disableRadio() {
 * myRadio.disable(true);
 * }
 * </code>
 * </div>
 */
function createRadio(containerElement?: object): p5.Element;

/**
 * @param name parameter assigned to each option's `&lt;input&gt;&lt;/input&gt;` element.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 */
function createRadio(name?: string): p5.Element;

/**
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 */
function createRadio(): p5.Element;

/**
 * Creates a color picker element.The parameter, `value`, is optional. If a color string or
 * p5.Color object is passed, it will set the default
 * color.Color pickers extend the p5.Element class with a
 * couple of helpful methods for managing colors:
 *
 * @param default color as a <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/color" target="_blank">CSS color string</a>.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * let myPicker;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a color picker and set its position.
 * myPicker = createColorPicker('deeppink');
 * myPicker.position(0, 100);
 * 
 * describe('A pink square with a color picker beneath it. The square changes color when the user picks a new color.');
 * }
 * 
 * function draw() {
 * // Use the color picker to paint the background.
 * let c = myPicker.color();
 * background(c);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myPicker;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create a color picker and set its position.
 * myPicker = createColorPicker('deeppink');
 * myPicker.position(0, 100);
 * 
 * describe('A number with the format "#rrggbb" is displayed on a pink canvas. The background color and number change when the user picks a new color.');
 * }
 * 
 * function draw() {
 * // Use the color picker to paint the background.
 * let c = myPicker.value();
 * background(c);
 * 
 * // Display the current color as a hex string.
 * text(c, 25, 55);
 * }
 * </code>
 * </div>
 */
function createColorPicker(value?: string | p5.Color): p5.Element;

/**
 * Creates a text `&lt;input&gt;&lt;/input&gt;` element.Call `myInput.size()` to set the length of the text box.The first parameter, `value`, is optional. It's a string that sets the
 * input's default value. The input is blank by default.The second parameter, `type`, is also optional. It's a string that
 * specifies the type of text being input. See MDN for a full
 * list of options.
 * The default is `'text'`.
 *
 * @param default value of the input box. Defaults to an empty string `''`.
 * @param type of input. Defaults to `'text'`.
 * @return new <a href="#/p5.Element">p5.Element</a> object.
 * @example <div>
 * <code>
 * let myInput;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create an input element and place it
 * // beneath the canvas.
 * myInput = createInput();
 * myInput.position(0, 100);
 * 
 * describe('A gray square with a text box beneath it. The text in the square changes when the user types something new in the input bar.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Use the input to display a message.
 * let msg = myInput.value();
 * text(msg, 25, 55);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myInput;
 * 
 * function setup() {
 * createCanvas(100, 100);
 * 
 * // Create an input element and place it
 * // beneath the canvas. Set its default
 * // text to "hello!".
 * myInput = createInput('hello!');
 * myInput.position(0, 100);
 * 
 * describe('The text "hello!" written at the center of a gray square. A text box beneath the square also says "hello!". The text in the square changes when the user types something new in the input bar.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Use the input to display a message.
 * let msg = myInput.value();
 * text(msg, 25, 55);
 * }
 * </code>
 * </div>
 */
function createInput(value?: string, type?: string): p5.Element;

/**
 */
function createInput(value?: string): p5.Element;

/**
 * Creates an `&lt;input&gt;&lt;/input&gt;` element of type `'file'`.`createFileInput()` allows users to select local files for use in a sketch.
 * It returns a p5.File object.The first parameter, `callback`, is a function that's called when the file
 * loads. The callback function should have one parameter, `file`, that's a
 * p5.File object.The second parameter, `multiple`, is optional. It's a boolean value that
 * allows loading multiple files if set to `true`. If `true`, `callback`
 * will be called once per file.
 *
 * @param function to call once the file loads.
 * @param allow multiple files to be selected.
 * @return new <a href="#/p5.File">p5.File</a> object.
 * @example <div>
 * <code>
 * // Use the file input to select an image to
 * // load and display.
 * let input;
 * let img;
 * 
 * function setup() {
 * createCanvas(200, 200);
 * 
 * // Create a file input and place it beneath
 * // the canvas.
 * input = createFileInput(handleImage);
 * input.position(0, 100);
 * 
 * describe('A gray square with a file input beneath it. If the user selects an image file to load, it is displayed on the square.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw the image if loaded.
 * if (img) {
 * image(img, 0, 0, width, height);
 * }
 * }
 * 
 * // Create an image if the file is an image.
 * function handleImage(file) {
 * if (file.type === 'image') {
 * img = createImg(file.data, '');
 * img.hide();
 * } else {
 * img = null;
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Use the file input to select multiple images
 * // to load and display.
 * let input;
 * let images = [];
 * 
 * function setup() {
 * // Create a file input and place it beneath
 * // the canvas. Allow it to load multiple files.
 * input = createFileInput(handleImage, true);
 * input.position(0, 100);
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw the images if loaded. Each image
 * // is drawn 20 pixels lower than the
 * // previous image.
 * for (let i = 0; i < images.length; i += 1) {
 * // Calculate the y-coordinate.
 * let y = i * 20;
 * 
 * // Draw the image.
 * image(images[i], 0, y, 100, 100);
 * }
 * 
 * describe('A gray square with a file input beneath it. If the user selects multiple image files to load, they are displayed on the square.');
 * }
 * 
 * // Create an image if the file is an image,
 * // then add it to the images array.
 * function handleImage(file) {
 * if (file.type === 'image') {
 * let img = createImg(file.data, '');
 * img.hide();
 * images.push(img);
 * }
 * }
 * </code>
 * </div>
 */
function createFileInput(callback: Function, multiple?: boolean): p5.File;

}

export default function dom(p5: any, fn: any): void;
