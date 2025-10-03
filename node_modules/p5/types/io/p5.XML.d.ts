// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class XML {
  /**
   * Returns the element's parent element as a new p5.XML
   * object.
   */
  getParent(): p5.XML;

  /**
   * Returns the element's name as a `String`.An XML element's name is given by its tag. For example, the element
   * `&lt;language&gt;JavaScript&lt;/language&gt;` has the name `language`.
   */
  getName(): string;

  /**
   * Sets the element's tag name.An XML element's name is given by its tag. For example, the element
   * `&lt;language&gt;JavaScript&lt;/language&gt;` has the name `language`.The parameter, `name`, is the element's new name as a string. For example,
   * calling `myXML.setName('planet')` will make the element's new tag name
   * `&lt;planet&gt;&lt;/planet&gt;`.
 *
   * @param
   */
  setName(name: string): void;

  /**
   * Returns `true` if the element has child elements and `false` if not.
   */
  hasChildren(): boolean;

  /**
   * Returns an array with the names of the element's child elements as
   * `String`s.
   */
  listChildren(): string[];

  /**
   * Returns an array with the element's child elements as new
   * p5.XML objects.The parameter, `name`, is optional. If a string is passed, as in
   * `myXML.getChildren('cat')`, then the method will only return child elements
   * with the tag `&lt;cat&gt;`.
 *
   * @param
   * @param
   */
  getChildren(param: any, name: string): p5.XML[];

  /**
   * Returns the first matching child element as a new
   * p5.XML object.The parameter, `name`, is optional. If a string is passed, as in
   * `myXML.getChild('cat')`, then the first child element with the tag
   * `&lt;cat&gt;` will be returned. If a number is passed, as in
   * `myXML.getChild(1)`, then the child element at that index will be returned.
 *
   * @param
   * @param
   */
  getChild(param: any, name: string | number): p5.XML;

  /**
   * Adds a new child element and returns a reference to it.The parameter, `child`, is the p5.XML object to add
   * as a child element. For example, calling `myXML.addChild(otherXML)` inserts
   * `otherXML` as a child element of `myXML`.
 *
   * @param
   * @param
   */
  addChild(node: any, child: p5.XML): p5.XML;

  /**
   * Removes the first matching child element.The parameter, `name`, is the child element to remove. If a string is
   * passed, as in `myXML.removeChild('cat')`, then the first child element
   * with the tag `&lt;cat&gt;` will be removed. If a number is passed, as in
   * `myXML.removeChild(1)`, then the child element at that index will be
   * removed.
 *
   * @param
   * @param
   */
  removeChild(param: any, name: string | number): void;

  /**
   * Returns the number of attributes the element has.
   */
  getAttributeCount(): number;

  /**
   * Returns an `Array` with the names of the element's attributes.Note: Use
   * myXML.getString() or
   * myXML.getNum() to return an attribute's value.
   */
  listAttributes(): string[];

  /**
   * Returns `true` if the element has a given attribute and `false` if not.The parameter, `name`, is a string with the name of the attribute being
   * checked.Note: Use
   * myXML.getString() or
   * myXML.getNum() to return an attribute's value.
 *
   * @param
   */
  hasAttribute(name: string): boolean;

  /**
   * Return an attribute's value as a `Number`.The first parameter, `name`, is a string with the name of the attribute
   * being checked. For example, calling `myXML.getNum('id')` returns the
   * element's `id` attribute as a number.The second parameter, `defaultValue`, is optional. If a number is passed,
   * as in `myXML.getNum('id', -1)`, it will be returned if the attribute
   * doesn't exist or can't be converted to a number.Note: Use
   * myXML.getString() or
   * myXML.getNum() to return an attribute's value.
 *
   * @param
   * @param
   */
  getNum(name: string, defaultValue: number): number;

  /**
   * Return an attribute's value as a string.The first parameter, `name`, is a string with the name of the attribute
   * being checked. For example, calling `myXML.getString('color')` returns the
   * element's `id` attribute as a string.The second parameter, `defaultValue`, is optional. If a string is passed,
   * as in `myXML.getString('color', 'deeppink')`, it will be returned if the
   * attribute doesn't exist.Note: Use
   * myXML.getString() or
   * myXML.getNum() to return an attribute's value.
 *
   * @param
   * @param
   */
  getString(name: string, defaultValue: number): string;

  /**
   * Sets an attribute to a given value.The first parameter, `name`, is a string with the name of the attribute
   * being set.The second parameter, `value`, is the attribute's new value. For example,
   * calling `myXML.setAttribute('id', 123)` sets the `id` attribute to the
   * value 123.
 *
   * @param
   * @param
   */
  setAttribute(name: string, value: number | string | boolean): void;

  /**
   * Returns the element's content as a `String`.The parameter, `defaultValue`, is optional. If a string is passed, as in
   * `myXML.getContent('???')`, it will be returned if the element has no
   * content.
 *
   * @param
   */
  getContent(defaultValue: string): string;

  /**
   * Returns the element as a `String`.`myXML.serialize()` is useful for sending the element over the network or
   * saving it to a file.
   */
  serialize(): string;

  }

/**
 * Returns the element's parent element as a new p5.XML
 * object.
 *
 * @return parent element.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get an array with all mammal elements.
 * let mammals = myXML.getChildren('mammal');
 * 
 * // Get the first mammal element.
 * let firstMammal = mammals[0];
 * 
 * // Get the parent element.
 * let parent = firstMammal.getParent();
 * 
 * // Get the parent element's name.
 * let name = parent.getName();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the parent element's name.
 * text(name, 50, 50);
 * 
 * describe('The word "animals" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function getParent(): p5.XML;

/**
 * Returns the element's name as a `String`.An XML element's name is given by its tag. For example, the element
 * `&lt;language&gt;JavaScript&lt;/language&gt;` has the name `language`.
 *
 * @return name of the element.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get an array with all mammal elements.
 * let mammals = myXML.getChildren('mammal');
 * 
 * // Get the first mammal element.
 * let firstMammal = mammals[0];
 * 
 * // Get the mammal element's name.
 * let name = firstMammal.getName();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the element's name.
 * text(name, 50, 50);
 * 
 * describe('The word "mammal" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function getName(): string;

/**
 * Sets the element's tag name.An XML element's name is given by its tag. For example, the element
 * `&lt;language&gt;JavaScript&lt;/language&gt;` has the name `language`.The parameter, `name`, is the element's new name as a string. For example,
 * calling `myXML.setName('planet')` will make the element's new tag name
 * `&lt;planet&gt;&lt;/planet&gt;`.
 *
 * @param new tag name of the element.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the element's original name.
 * let oldName = myXML.getName();
 * 
 * // Set the element's name.
 * myXML.setName('monsters');
 * 
 * // Get the element's new name.
 * let newName = myXML.getName();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the element's names.
 * text(oldName, 50, 33);
 * text(newName, 50, 67);
 * 
 * describe(
 * 'The words "animals" and "monsters" written on separate lines. The text is black on a gray background.'
 * );
 * }
 * </code></div>
 */
function setName(name: string): void;

/**
 * Returns `true` if the element has child elements and `false` if not.
 *
 * @return whether the element has children.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Check whether the element has child elements.
 * let isParent = myXML.hasChildren();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Style the text.
 * if (isParent === true) {
 * text('Parent', 50, 50);
 * } else {
 * text('Not Parent', 50, 50);
 * }
 * 
 * describe('The word "Parent" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function hasChildren(): boolean;

/**
 * Returns an array with the names of the element's child elements as
 * `String`s.
 *
 * @return names of the child elements.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the names of the element's children as an array.
 * let children = myXML.listChildren();
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Iterate over the array.
 * for (let i = 0; i < children.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 25;
 * 
 * // Display the child element's name.
 * text(children[i], 10, y);
 * }
 * 
 * describe(
 * 'The words "mammal", "mammal", "mammal", and "reptile" written on separate lines. The text is black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function listChildren(): string[];

/**
 * Returns an array with the element's child elements as new
 * p5.XML objects.The parameter, `name`, is optional. If a string is passed, as in
 * `myXML.getChildren('cat')`, then the method will only return child elements
 * with the tag `&lt;cat&gt;`.
 *
 * @param name of the elements to return.
 * @return child elements.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get an array of the child elements.
 * let children = myXML.getChildren();
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Iterate over the array.
 * for (let i = 0; i < children.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 20;
 * 
 * // Get the child element's content.
 * let content = children[i].getContent();
 * 
 * // Display the child element's content.
 * text(content, 10, y);
 * }
 * 
 * describe(
 * 'The words "Goat", "Leopard", "Zebra", and "Turtle" written on separate lines. The text is black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get an array of the child elements
 * // that are mammals.
 * let children = myXML.getChildren('mammal');
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Iterate over the array.
 * for (let i = 0; i < children.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 20;
 * 
 * // Get the child element's content.
 * let content = children[i].getContent();
 * 
 * // Display the child element's content.
 * text(content, 10, y);
 * }
 * 
 * describe(
 * 'The words "Goat", "Leopard", and "Zebra" written on separate lines. The text is black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function getChildren(param: any, name?: string): p5.XML[];

/**
 * Returns the first matching child element as a new
 * p5.XML object.The parameter, `name`, is optional. If a string is passed, as in
 * `myXML.getChild('cat')`, then the first child element with the tag
 * `&lt;cat&gt;` will be returned. If a number is passed, as in
 * `myXML.getChild(1)`, then the child element at that index will be returned.
 *
 * @param element name or index.
 * @return child element.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first child element that is a mammal.
 * let goat = myXML.getChild('mammal');
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Get the child element's content.
 * let content = goat.getContent();
 * 
 * // Display the child element's content.
 * text(content, 50, 50);
 * 
 * describe('The word "Goat" written in black on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the child element at index 1.
 * let leopard = myXML.getChild(1);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Get the child element's content.
 * let content = leopard.getContent();
 * 
 * // Display the child element's content.
 * text(content, 50, 50);
 * 
 * describe('The word "Leopard" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function getChild(param: any, name: string | number): p5.XML;

/**
 * Adds a new child element and returns a reference to it.The parameter, `child`, is the p5.XML object to add
 * as a child element. For example, calling `myXML.addChild(otherXML)` inserts
 * `otherXML` as a child element of `myXML`.
 *
 * @param child element to add.
 * @return added child element.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a new p5.XML object.
 * let newAnimal = new p5.XML();
 * 
 * // Set its properties.
 * newAnimal.setName('hydrozoa');
 * newAnimal.setAttribute('id', 4);
 * newAnimal.setAttribute('species', 'Physalia physalis');
 * newAnimal.setContent('Bluebottle');
 * 
 * // Add the child element.
 * myXML.addChild(newAnimal);
 * 
 * // Get the first child element that is a hydrozoa.
 * let blueBottle = myXML.getChild('hydrozoa');
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Get the child element's content.
 * let content = blueBottle.getContent();
 * 
 * // Display the child element's content.
 * text(content, 50, 50);
 * 
 * describe('The word "Bluebottle" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function addChild(node: any, child: p5.XML): p5.XML;

/**
 * Removes the first matching child element.The parameter, `name`, is the child element to remove. If a string is
 * passed, as in `myXML.removeChild('cat')`, then the first child element
 * with the tag `&lt;cat&gt;` will be removed. If a number is passed, as in
 * `myXML.removeChild(1)`, then the child element at that index will be
 * removed.
 *
 * @param name or index of the child element to remove.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Remove the first mammal element.
 * myXML.removeChild('mammal');
 * 
 * // Get an array of child elements.
 * let children = myXML.getChildren();
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Iterate over the array.
 * for (let i = 0; i < children.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 25;
 * 
 * // Get the child element's content.
 * let content = children[i].getContent();
 * 
 * // Display the child element's content.
 * text(content, 10, y);
 * }
 * 
 * describe(
 * 'The words "Leopard", "Zebra", and "Turtle" written on separate lines. The text is black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Remove the element at index 2.
 * myXML.removeChild(2);
 * 
 * // Get an array of child elements.
 * let children = myXML.getChildren();
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Iterate over the array.
 * for (let i = 0; i < children.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 25;
 * 
 * // Get the child element's content.
 * let content = children[i].getContent();
 * 
 * // Display the child element's content.
 * text(content, 10, y);
 * }
 * 
 * describe(
 * 'The words "Goat", "Leopard", and "Turtle" written on separate lines. The text is black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function removeChild(param: any, name: string | number): void;

/**
 * Returns the number of attributes the element has.
 *
 * @return number of attributes.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first child element.
 * let first = myXML.getChild(0);
 * 
 * // Get the number of attributes.
 * let numAttributes = first.getAttributeCount();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the number of attributes.
 * text(numAttributes, 50, 50);
 * 
 * describe('The number "2" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function getAttributeCount(): number;

/**
 * Returns an `Array` with the names of the element's attributes.Note: Use
 * myXML.getString() or
 * myXML.getNum() to return an attribute's value.
 *
 * @return attribute names.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first child element.
 * let first = myXML.getChild(0);
 * 
 * // Get the number of attributes.
 * let attributes = first.listAttributes();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the element's attributes.
 * text(attributes, 50, 50);
 * 
 * describe('The text "id,species" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function listAttributes(): string[];

/**
 * Returns `true` if the element has a given attribute and `false` if not.The parameter, `name`, is a string with the name of the attribute being
 * checked.Note: Use
 * myXML.getString() or
 * myXML.getNum() to return an attribute's value.
 *
 * @param name of the attribute to be checked.
 * @return whether the element has the attribute.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first mammal child element.
 * let mammal = myXML.getChild('mammal');
 * 
 * // Check whether the element has an
 * // species attribute.
 * let hasSpecies = mammal.hasAttribute('species');
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display whether the element has a species attribute.
 * if (hasSpecies === true) {
 * text('Species', 50, 50);
 * } else {
 * text('No species', 50, 50);
 * }
 * 
 * describe('The text "Species" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function hasAttribute(name: string): boolean;

/**
 * Return an attribute's value as a `Number`.The first parameter, `name`, is a string with the name of the attribute
 * being checked. For example, calling `myXML.getNum('id')` returns the
 * element's `id` attribute as a number.The second parameter, `defaultValue`, is optional. If a number is passed,
 * as in `myXML.getNum('id', -1)`, it will be returned if the attribute
 * doesn't exist or can't be converted to a number.Note: Use
 * myXML.getString() or
 * myXML.getNum() to return an attribute's value.
 *
 * @param name of the attribute to be checked.
 * @param value to return if the attribute doesn't exist.
 * @return attribute value as a number.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first reptile child element.
 * let reptile = myXML.getChild('reptile');
 * 
 * // Get the reptile's content.
 * let content = reptile.getContent();
 * 
 * // Get the reptile's ID.
 * let id = reptile.getNum('id');
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the ID attribute.
 * text(`${content} is ${id + 1}th`, 5, 50, 90);
 * 
 * describe(`The text "${content} is ${id + 1}th" written in black on a gray background.`);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first reptile child element.
 * let reptile = myXML.getChild('reptile');
 * 
 * // Get the reptile's content.
 * let content = reptile.getContent();
 * 
 * // Get the reptile's size.
 * let weight = reptile.getNum('weight', 135);
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the ID attribute.
 * text(`${content} is ${weight}kg`, 5, 50, 90);
 * 
 * describe(
 * `The text "${content} is ${weight}kg" written in black on a gray background.`
 * );
 * }
 * </code>
 * </div>
 */
function getNum(name: string, defaultValue?: number): number;

/**
 * Return an attribute's value as a string.The first parameter, `name`, is a string with the name of the attribute
 * being checked. For example, calling `myXML.getString('color')` returns the
 * element's `id` attribute as a string.The second parameter, `defaultValue`, is optional. If a string is passed,
 * as in `myXML.getString('color', 'deeppink')`, it will be returned if the
 * attribute doesn't exist.Note: Use
 * myXML.getString() or
 * myXML.getNum() to return an attribute's value.
 *
 * @param name of the attribute to be checked.
 * @param value to return if the attribute doesn't exist.
 * @return attribute value as a string.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first reptile child element.
 * let reptile = myXML.getChild('reptile');
 * 
 * // Get the reptile's content.
 * let content = reptile.getContent();
 * 
 * // Get the reptile's species.
 * let species = reptile.getString('species');
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the species attribute.
 * text(`${content}: ${species}`, 5, 50, 90);
 * 
 * describe(`The text "${content}: ${species}" written in black on a gray background.`);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first reptile child element.
 * let reptile = myXML.getChild('reptile');
 * 
 * // Get the reptile's content.
 * let content = reptile.getContent();
 * 
 * // Get the reptile's color.
 * let attribute = reptile.getString('color', 'green');
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * fill(attribute);
 * 
 * // Display the element's content.
 * text(content, 50, 50);
 * 
 * describe(`The text "${content}" written in green on a gray background.`);
 * }
 * </code>
 * </div>
 */
function getString(name: string, defaultValue?: number): string;

/**
 * Sets an attribute to a given value.The first parameter, `name`, is a string with the name of the attribute
 * being set.The second parameter, `value`, is the attribute's new value. For example,
 * calling `myXML.setAttribute('id', 123)` sets the `id` attribute to the
 * value 123.
 *
 * @param name of the attribute to be set.
 * @param attribute's new value.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first reptile child element.
 * let reptile = myXML.getChild('reptile');
 * 
 * // Set the reptile's color.
 * reptile.setAttribute('color', 'green');
 * 
 * // Get the reptile's content.
 * let content = reptile.getContent();
 * 
 * // Get the reptile's color.
 * let attribute = reptile.getString('color');
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the element's content.
 * text(`${content} is ${attribute}`, 5, 50, 90);
 * 
 * describe(
 * `The text "${content} is ${attribute}" written in green on a gray background.`
 * );
 * }
 * </code>
 * </div>
 */
function setAttribute(name: string, value: number | string | boolean): void;

/**
 * Returns the element's content as a `String`.The parameter, `defaultValue`, is optional. If a string is passed, as in
 * `myXML.getContent('???')`, it will be returned if the element has no
 * content.
 *
 * @param value to return if the element has no
 * content.
 * @return element's content as a string.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first reptile child element.
 * let reptile = myXML.getChild('reptile');
 * 
 * // Get the reptile's content.
 * let content = reptile.getContent();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the element's content.
 * text(content, 5, 50, 90);
 * 
 * describe(`The text "${content}" written in green on a gray background.`);
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
 * // Create a p5.XML object.
 * let blankSpace = new p5.XML();
 * 
 * // Get the element's content and use a default value.
 * let content = blankSpace.getContent('Your name');
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the element's content.
 * text(content, 5, 50, 90);
 * 
 * describe(`The text "${content}" written in green on a gray background.`);
 * }
 * </code>
 * </div>
 */
function getContent(defaultValue?: string): string;

/**
 * Returns the element as a `String`.`myXML.serialize()` is useful for sending the element over the network or
 * saving it to a file.
 *
 * @return element as a string.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(12);
 * 
 * // Display instructions.
 * text('Double-click to save', 5, 50, 90);
 * 
 * describe('The text "Double-click to save" written in black on a gray background.');
 * }
 * 
 * // Save the file when the user double-clicks.
 * function doubleClicked() {
 * // Create a p5.PrintWriter object.
 * // Use the file format .xml.
 * let myWriter = createWriter('animals', 'xml');
 * 
 * // Serialize the XML data to a string.
 * let data = myXML.serialize();
 * 
 * // Write the data to the print stream.
 * myWriter.write(data);
 * 
 * // Save the file and close the print stream.
 * myWriter.close();
 * }
 * </code>
 * </div>
 */
function serialize(): string;

/**
 * Sets the element's content.An element's content is the text between its tags. For example, the element
 * `&lt;language&gt;JavaScript&lt;/language&gt;` has the content `JavaScript`.The parameter, `content`, is a string with the element's new content.
 *
 * @param new content for the element.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * async function setup() {
 * // Load the XML and create a p5.XML object.
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get the first reptile child element.
 * let reptile = myXML.getChild('reptile');
 * 
 * // Get the reptile's original content.
 * let oldContent = reptile.getContent();
 * 
 * // Set the reptile's content.
 * reptile.setContent('Loggerhead');
 * 
 * // Get the reptile's new content.
 * let newContent = reptile.getContent();
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Display the element's old and new content.
 * text(`${oldContent}: ${newContent}`, 5, 50, 90);
 * 
 * describe(
 * `The text "${oldContent}: ${newContent}" written in green on a gray background.`
 * );
 * }
 * </code>
 * </div>
 */
function setContent(content: string): void;

}

export default function p5_XML(p5: any, fn: any): void;
