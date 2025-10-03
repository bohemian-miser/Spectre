// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class PrintWriter {
    constructor(filename: string, extension?: string);

  }

/**
 * Clears all data from the print stream.
 *
 * @example <div>
 * <code>
 * function setup() {
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
 * let myWriter = createWriter('numbers.txt');
 * 
 * // Add some data to the print stream.
 * myWriter.print('Hello p5*js!');
 * 
 * // Clear the print stream.
 * myWriter.clear();
 * 
 * // Save the file and close the print stream.
 * myWriter.close();
 * }
 * </code>
 * </div>
 */
function clear(): void;

/**
 * Writes data to the print stream with new lines added.The parameter, `data`, is the data to write. `data` can be a number or
 * string, as in `myWriter.print('hi')`, or an array of numbers and strings,
 * as in `myWriter.print([1, 2, 3])`. A comma will be inserted between array
 * array elements when they're added to the print stream.
 *
 * @param data to be written as a string, number,
 * or array of strings and numbers.
 * @example <div>
 * <code>
 * function setup() {
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
 * let myWriter = createWriter('numbers.txt');
 * 
 * // Add some data to the print stream.
 * myWriter.print('1,2,3,');
 * myWriter.print(['4', '5', '6']);
 * 
 * // Save the file and close the print stream.
 * myWriter.close();
 * }
 * </code>
 * </div>
 */
function print(data: string | number | Array): void;

/**
 * Loads a JSON file to create an `Object`.JavaScript Object Notation
 * (JSON)
 * is a standard format for sending data between applications. The format is
 * based on JavaScript objects which have keys and values. JSON files store
 * data in an object with strings as keys. Values can be strings, numbers,
 * Booleans, arrays, `null`, or other objects.The first parameter, `path`, is a string with the path to the file.
 * Paths to local files should be relative, as in
 * `loadJSON('assets/data.json')`. URLs such as
 * `'https://example.com/data.json'` may be blocked due to browser security.
 * The `path` parameter can also be defined as a
 * object for more advanced usage.The second parameter, `successCallback`, is optional. If a function is
 * passed, as in `loadJSON('assets/data.json', handleData)`, then the
 * `handleData()` function will be called once the data loads. The object
 * created from the JSON data will be passed to `handleData()` as its only argument.
 * The return value of the `handleData()` function will be used as the final return
 * value of `loadJSON('assets/data.json', handleData)`.The third parameter, `failureCallback`, is also optional. If a function is
 * passed, as in `loadJSON('assets/data.json', handleData, handleFailure)`,
 * then the `handleFailure()` function will be called if an error occurs while
 * loading. The `Error` object will be passed to `handleFailure()` as its only
 * argument. The return value of the `handleFailure()` function will be used as the
 * final return value of `loadJSON('assets/data.json', handleData, handleFailure)`.This function returns a `Promise` and should be used in an `async` setup with
 * `await`. See the examples for the usage syntax.
 *
 * @param path of the JSON file to be loaded.
 * @param function to call once the data is loaded. Will be passed the object.
 * @param function to call if the data fails to load. Will be passed an `Error` event object.
 * @return object containing the loaded data.
 * @example <div>
 * <code>
 * let myData;
 * 
 * async function setup() {
 * myData = await loadJSON('assets/data.json');
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the circle.
 * fill(myData.color);
 * noStroke();
 * 
 * // Draw the circle.
 * circle(myData.x, myData.y, myData.d);
 * 
 * describe('A pink circle on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myData;
 * 
 * async function setup() {
 * myData = await loadJSON('assets/data.json');
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Color object and make it transparent.
 * let c = color(myData.color);
 * c.setAlpha(80);
 * 
 * // Style the circles.
 * fill(c);
 * noStroke();
 * 
 * // Iterate over the myData.bubbles array.
 * for (let b of myData.bubbles) {
 * // Draw a circle for each bubble.
 * circle(b.x, b.y, b.d);
 * }
 * 
 * describe('Several pink bubbles floating in a blue sky.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let myData;
 * 
 * async function setup() {
 * myData = await loadJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get data about the most recent earthquake.
 * let quake = myData.features[0].properties;
 * 
 * // Draw a circle based on the earthquake's magnitude.
 * circle(50, 50, quake.mag * 10);
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(11);
 * 
 * // Display the earthquake's location.
 * text(quake.place, 5, 80, 100);
 * 
 * describe(`A white circle on a gray background. The text "${quake.place}" is written beneath the circle.`);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let bigQuake;
 * 
 * // Load the GeoJSON and preprocess it.
 * async function setup() {
 * await loadJSON(
 * 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
 * handleData
 * );
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Draw a circle based on the earthquake's magnitude.
 * circle(50, 50, bigQuake.mag * 10);
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(11);
 * 
 * // Display the earthquake's location.
 * text(bigQuake.place, 5, 80, 100);
 * 
 * describe(`A white circle on a gray background. The text "${bigQuake.place}" is written beneath the circle.`);
 * }
 * 
 * // Find the biggest recent earthquake.
 * function handleData(data) {
 * let maxMag = 0;
 * // Iterate over the earthquakes array.
 * for (let quake of data.features) {
 * // Reassign bigQuake if a larger
 * // magnitude quake is found.
 * if (quake.properties.mag > maxMag) {
 * bigQuake = quake.properties;
 * }
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let bigQuake;
 * 
 * // Load the GeoJSON and preprocess it.
 * async function setup() {
 * await loadJSON(
 * 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
 * handleData,
 * handleError
 * );
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Draw a circle based on the earthquake's magnitude.
 * circle(50, 50, bigQuake.mag * 10);
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(11);
 * 
 * // Display the earthquake's location.
 * text(bigQuake.place, 5, 80, 100);
 * 
 * describe(`A white circle on a gray background. The text "${bigQuake.place}" is written beneath the circle.`);
 * }
 * 
 * // Find the biggest recent earthquake.
 * function handleData(data) {
 * let maxMag = 0;
 * // Iterate over the earthquakes array.
 * for (let quake of data.features) {
 * // Reassign bigQuake if a larger
 * // magnitude quake is found.
 * if (quake.properties.mag > maxMag) {
 * bigQuake = quake.properties;
 * }
 * }
 * }
 * 
 * // Log any errors to the console.
 * function handleError(error) {
 * console.log('Oops!', error);
 * }
 * </code>
 * </div>
 */
function loadJSON(path: string | Request, successCallback?: Function, errorCallback?: Function): Promise<object>;

/**
 * Loads a text file to create an `Array`.The first parameter, `path`, is always a string with the path to the file.
 * Paths to local files should be relative, as in
 * `loadStrings('assets/data.txt')`. URLs such as
 * `'https://example.com/data.txt'` may be blocked due to browser security.
 * The `path` parameter can also be defined as a
 * object for more advanced usage.The second parameter, `successCallback`, is optional. If a function is
 * passed, as in `loadStrings('assets/data.txt', handleData)`, then the
 * `handleData()` function will be called once the data loads. The array
 * created from the text data will be passed to `handleData()` as its only
 * argument. The return value of the `handleData()` function will be used as
 * the final return value of `loadStrings('assets/data.txt', handleData)`.The third parameter, `failureCallback`, is also optional. If a function is
 * passed, as in `loadStrings('assets/data.txt', handleData, handleFailure)`,
 * then the `handleFailure()` function will be called if an error occurs while
 * loading. The `Error` object will be passed to `handleFailure()` as its only
 * argument. The return value of the `handleFailure()` function will be used as
 * the final return value of `loadStrings('assets/data.txt', handleData, handleFailure)`.This function returns a `Promise` and should be used in an `async` setup with
 * `await`. See the examples for the usage syntax.
 *
 * @param path of the text file to be loaded.
 * @param function to call once the data is
 * loaded. Will be passed the array.
 * @param function to call if the data fails to
 * load. Will be passed an `Error` event
 * object.
 * @return new array containing the loaded text.
 * @example <div>
 * <code>
 * let myData;
 * 
 * async function setup() {
 * myData = await loadStrings('assets/test.txt');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Select a random line from the text.
 * let phrase = random(myData);
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(12);
 * 
 * // Display the text.
 * text(phrase, 10, 50, 90);
 * 
 * describe(`The text "${phrase}" written in black on a gray background.`);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let lastLine;
 * 
 * // Load the text and preprocess it.
 * async function setup() {
 * await loadStrings('assets/test.txt', handleData);
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
 * // Display the text.
 * text(lastLine, 10, 50, 90);
 * 
 * describe('The text "I talk like an orange" written in black on a gray background.');
 * }
 * 
 * // Select the last line from the text.
 * function handleData(data) {
 * lastLine = data[data.length - 1];
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let lastLine;
 * 
 * // Load the text and preprocess it.
 * async function setup() {
 * await loadStrings('assets/test.txt', handleData, handleError);
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
 * // Display the text.
 * text(lastLine, 10, 50, 90);
 * 
 * describe('The text "I talk like an orange" written in black on a gray background.');
 * }
 * 
 * // Select the last line from the text.
 * function handleData(data) {
 * lastLine = data[data.length - 1];
 * }
 * 
 * // Log any errors to the console.
 * function handleError(error) {
 * console.error('Oops!', error);
 * }
 * </code>
 * </div>
 */
function loadStrings(path: string | Request, successCallback?: Function, errorCallback?: Function): Promise<string[]>;

/**
 * Reads the contents of a file or URL and creates a p5.Table object with
 * its values. If a file is specified, it must be located in the sketch's
 * "data" folder. The filename parameter can also be a URL to a file found
 * online. By default, the file is assumed to be comma-separated (in CSV
 * format). Table only looks for a header row if the 'header' option is
 * included.This function returns a `Promise` and should be used in an `async` setup with
 * `await`. See the examples for the usage syntax.All files loaded and saved use UTF-8 encoding. This method is suitable for fetching files up to size of 64MB.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param name of the file or URL to load
 * @param the separator character used by the file, defaults to `','`
 * @param "header" to indicate table has header row
 * @param function to be executed after
 * <a href="#/p5/loadTable">loadTable()</a> completes. On success, the
 * <a href="#/p5.Table">Table</a> object is passed in as the
 * first argument.
 * @param function to be executed if
 * there is an error, response is passed
 * in as first argument
 * @return <a href="#/p5.Table">Table</a> object containing data
 * @example <div class='norender'>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas
 * createCanvas(200, 200);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Get the second row (index 1)
 * let row = table.getRow(1);
 * 
 * // Set text properties
 * fill(0);       // Set text color to black
 * textSize(16);  // Adjust text size as needed
 * 
 * // Display each column value in the row on the canvas.
 * // Using an offset for y-position so each value appears on a new line.
 * for (let c = 0; c < table.getColumnCount(); c++) {
 * text(row.getString(c), 10, 30 + c * 20);
 * }
 * }
 * </code>
 * </div>
 */
function loadTable(filename: string | Request, separator?: string, header?: string, callback?: Function, errorCallback?: Function): Promise<object>;

/**
 * Loads an XML file to create a p5.XML object.Extensible Markup Language
 * (XML)
 * is a standard format for sending data between applications. Like HTML, the
 * XML format is based on tags and attributes, as in
 * `&lt;time units="s"&gt;1234&lt;/time&gt;`.The first parameter, `path`, is always a string with the path to the file.
 * Paths to local files should be relative, as in
 * `loadXML('assets/data.xml')`. URLs such as `'https://example.com/data.xml'`
 * may be blocked due to browser security. The `path` parameter can also be defined
 * as a
 * object for more advanced usage.The second parameter, `successCallback`, is optional. If a function is
 * passed, as in `loadXML('assets/data.xml', handleData)`, then the
 * `handleData()` function will be called once the data loads. The
 * p5.XML object created from the data will be passed
 * to `handleData()` as its only argument. The return value of the `handleData()`
 * function will be used as the final return value of `loadXML('assets/data.xml', handleData)`.The third parameter, `failureCallback`, is also optional. If a function is
 * passed, as in `loadXML('assets/data.xml', handleData, handleFailure)`, then
 * the `handleFailure()` function will be called if an error occurs while
 * loading. The `Error` object will be passed to `handleFailure()` as its only
 * argument. The return value of the `handleFailure()` function will be used as the
 * final return value of `loadXML('assets/data.xml', handleData, handleFailure)`.This function returns a `Promise` and should be used in an `async` setup with
 * `await`. See the examples for the usage syntax.
 *
 * @param path of the XML file to be loaded.
 * @param function to call once the data is
 * loaded. Will be passed the
 * <a href="#/p5.XML">p5.XML</a> object.
 * @param function to call if the data fails to
 * load. Will be passed an `Error` event
 * object.
 * @return XML data loaded into a <a href="#/p5.XML">p5.XML</a>
 * object.
 * @example <div>
 * <code>
 * let myXML;
 * 
 * // Load the XML and create a p5.XML object.
 * async function setup() {
 * myXML = await loadXML('assets/animals.xml');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Get an array with all mammal tags.
 * let mammals = myXML.getChildren('mammal');
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textFont('Courier New');
 * textSize(14);
 * 
 * // Iterate over the mammals array.
 * for (let i = 0; i < mammals.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 25;
 * 
 * // Get the mammal's common name.
 * let name = mammals[i].getContent();
 * 
 * // Display the mammal's name.
 * text(name, 20, y);
 * }
 * 
 * describe(
 * 'The words "Goat", "Leopard", and "Zebra" written on three separate lines. The text is black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let lastMammal;
 * 
 * // Load the XML and create a p5.XML object.
 * async function setup() {
 * await loadXML('assets/animals.xml', handleData);
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(16);
 * 
 * // Display the content of the last mammal element.
 * text(lastMammal, 50, 50);
 * 
 * describe('The word "Zebra" written in black on a gray background.');
 * }
 * 
 * // Get the content of the last mammal element.
 * function handleData(data) {
 * // Get an array with all mammal elements.
 * let mammals = data.getChildren('mammal');
 * 
 * // Get the content of the last mammal.
 * lastMammal = mammals[mammals.length - 1].getContent();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let lastMammal;
 * 
 * // Load the XML and preprocess it.
 * async function setup() {
 * await loadXML('assets/animals.xml', handleData, handleError);
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(16);
 * 
 * // Display the content of the last mammal element.
 * text(lastMammal, 50, 50);
 * 
 * describe('The word "Zebra" written in black on a gray background.');
 * }
 * 
 * // Get the content of the last mammal element.
 * function handleData(data) {
 * // Get an array with all mammal elements.
 * let mammals = data.getChildren('mammal');
 * 
 * // Get the content of the last mammal.
 * lastMammal = mammals[mammals.length - 1].getContent();
 * }
 * 
 * // Log any errors to the console.
 * function handleError(error) {
 * console.error('Oops!', error);
 * }
 * </code>
 * </div>
 */
function loadXML(path: string | Request, successCallback?: Function, errorCallback?: Function): Promise<p5.XML>;

/**
 * This method is suitable for fetching files up to size of 64MB.
 *
 * @param name of the file or URL to load
 * @param function to be executed after <a href="#/p5/loadBytes">loadBytes()</a>
 * completes
 * @param function to be executed if there
 * is an error
 * @returns a Uint8Array containing the loaded buffer
 * @example <div>
 * <code>
 * let data;
 * 
 * async function setup() {
 * createCanvas(100, 100); // Create a canvas
 * data = await loadBytes('assets/mammals.xml'); // Load the bytes from the XML file
 * 
 * background(255); // Set a white background
 * fill(0);       // Set text color to black
 * 
 * // Display the first 5 byte values on the canvas in hexadecimal format
 * for (let i = 0; i < 5; i++) {
 * let byteHex = data[i].toString(16);
 * text(byteHex, 10, 18 * (i + 1)); // Adjust spacing as needed
 * }
 * 
 * describe('no image displayed, displays first 5 bytes of mammals.xml in hexadecimal format');
 * }
 * </code>
 * </div>
 */
function loadBytes(file: string | Request, callback?: Function, errorCallback?: Function): Promise<Uint8Array>;

/**
 * Loads a file at the given path as a Blob, then returns the resulting data or
 * passes it to a success callback function, if provided. On load, this function
 * returns a `Promise` that resolves to a Blob containing the file data.
 *
 * @param The path or Request object pointing to the file
 * you want to load.
 * @param Optional. A function to be called if the
 * file successfully loads, receiving the
 * resulting Blob as its only argument.
 * @param Optional. A function to be called if an
 * error occurs during loading; receives the
 * error object as its only argument.
 * @returns A promise that resolves with the loaded Blob.
 * @example <div>
 * <code>
 * let myBlob;
 * 
 * async function setup() {
 * createCanvas(200, 200);
 * background(220);
 * try {
 * // 1. Load an image file as a Blob.
 * myBlob = await loadBlob('assets/flower-1.png');
 * 
 * // 2. Convert the Blob into an object URL.
 * const objectUrl = URL.createObjectURL(myBlob);
 * 
 * // 3. Load that object URL into a p5.Image.
 * loadImage(objectUrl, (img) => {
 * // 4. Display the loaded image.
 * image(img, 0, 0, width, height);
 * });
 * } catch (err) {
 * console.error('Error loading blob:', err);
 * }
 * }
 * </code>
 * </div>
 */
function loadBlob(path: string | Request, successCallback?: Function, errorCallback?: Function): Promise<Blob>;

/**
 * Method for executing an HTTP GET request. If data type is not specified,
 * it will default to `'text'`. This is equivalent to
 * calling httpDo(path, 'GET'). The 'binary' datatype will return
 * a Blob object, and the 'arrayBuffer' datatype will return an ArrayBuffer
 * which can be used to initialize typed arrays (such as Uint8Array).
 *
 * @param name of the file or url to load
 * @param "json", "jsonp", "binary", "arrayBuffer",
 * "xml", or "text"
 * @param function to be executed after
 * <a href="#/p5/httpGet">httpGet()</a> completes, data is passed in
 * as first argument
 * @param function to be executed if
 * there is an error, response is passed
 * in as first argument
 * @return A promise that resolves with the data when the operation
 * completes successfully or rejects with the error after
 * one occurs.
 * @example <div class='norender'><code>
 * // Examples use USGS Earthquake API:
 * //   https://earthquake.usgs.gov/fdsnws/event/1/#methods
 * let earthquakes;
 * async function setup() {
 * // Get the most recent earthquake in the database
 * let url =
 * 'https://earthquake.usgs.gov/fdsnws/event/1/query?' +
 * 'format=geojson&limit=1&orderby=time';
 * earthquakes = await httpGet(url, 'json');
 * }
 * 
 * function draw() {
 * if (!earthquakes) {
 * // Wait until the earthquake data has loaded before drawing.
 * return;
 * }
 * background(200);
 * // Get the magnitude and name of the earthquake out of the loaded JSON
 * let earthquakeMag = earthquakes.features[0].properties.mag;
 * let earthquakeName = earthquakes.features[0].properties.place;
 * ellipse(width / 2, height / 2, earthquakeMag * 10, earthquakeMag * 10);
 * textAlign(CENTER);
 * text(earthquakeName, 0, height - 30, width, 30);
 * noLoop();
 * }
 * </code></div>
 */
function httpGet(path: string | Request, datatype?: string, callback?: Function, errorCallback?: Function): Promise;

/**
 */
function httpGet(path: string | Request, callback: Function, errorCallback?: Function): Promise;

/**
 * Method for executing an HTTP POST request. If data type is not specified,
 * it will default to `'text'`. This is equivalent to
 * calling httpDo(path, 'POST').
 *
 * @param name of the file or url to load
 * @param param data passed sent with request
 * @param "json", "jsonp", "xml", or "text".
 * If omitted, <a href="#/p5/httpPost">httpPost()</a> will guess.
 * @param function to be executed after
 * <a href="#/p5/httpPost">httpPost()</a> completes, data is passed in
 * as first argument
 * @param function to be executed if
 * there is an error, response is passed
 * in as first argument
 * @return A promise that resolves with the data when the operation
 * completes successfully or rejects with the error after
 * one occurs.
 * @example <div>
 * <code>
 * // Examples use jsonplaceholder.typicode.com for a Mock Data API
 * 
 * let url = 'https://jsonplaceholder.typicode.com/posts';
 * let postData = { userId: 1, title: 'p5 Clicked!', body: 'p5.js is very cool.' };
 * 
 * function setup() {
 * createCanvas(100, 100);
 * background(200);
 * }
 * 
 * function mousePressed() {
 * httpPost(url, postData, 'json', function(result) {
 * strokeWeight(2);
 * text(result.body, mouseX, mouseY);
 * });
 * }
 * </code>
 * </div>
 * 
 * <div><code>
 * let url = 'ttps://invalidURL'; // A bad URL that will cause errors
 * let postData = { title: 'p5 Clicked!', body: 'p5.js is very cool.' };
 * 
 * function setup() {
 * createCanvas(100, 100);
 * background(200);
 * }
 * 
 * function mousePressed() {
 * httpPost(
 * url,
 * postData,
 * 'json',
 * function(result) {
 * // ... won't be called
 * },
 * function(error) {
 * strokeWeight(2);
 * text(error.toString(), mouseX, mouseY);
 * }
 * );
 * }
 * </code></div>
 */
function httpPost(path: string | Request, data?: object | boolean, datatype?: string, callback?: Function, errorCallback?: Function): Promise;

/**
 */
function httpPost(path: string | Request, data: object | boolean, callback?: Function, errorCallback?: Function): Promise;

/**
 */
function httpPost(path: string | Request, callback?: Function, errorCallback?: Function): Promise;

/**
 * Method for executing an HTTP request. If data type is not specified,
 * it will default to `'text'`.This function is meant for more advanced usage of HTTP requests in p5.js. It is
 * best used when a
 * object is passed to the `path` parameter.This method is suitable for fetching files up to size of 64MB when "GET" is used.
 *
 * @param name of the file or url to load
 * @param either "GET", "POST", "PUT", "DELETE",
 * or other HTTP request methods
 * @param "json", "jsonp", "xml", or "text"
 * @param param data passed sent with request
 * @param function to be executed after
 * <a href="#/p5/httpGet">httpGet()</a> completes, data is passed in
 * as first argument
 * @param function to be executed if
 * there is an error, response is passed
 * in as first argument
 * @return A promise that resolves with the data when the operation
 * completes successfully or rejects with the error after
 * one occurs.
 * @example <div>
 * <code>
 * // Examples use USGS Earthquake API:
 * // https://earthquake.usgs.gov/fdsnws/event/1/#methods
 * 
 * // displays an animation of all USGS earthquakes
 * let earthquakes;
 * let eqFeatureIndex = 0;
 * 
 * function setup() {
 * createCanvas(100,100);
 * 
 * let url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson';
 * 
 * const req = new Request(url, {
 * method: 'GET',
 * headers: {authorization: 'Bearer secretKey'}
 * });
 * // httpDo(path, method, datatype, success, error)
 * 
 * httpDo(
 * req,
 * 'GET',
 * 'json',
 * res => {
 * earthquakes = res;
 * },
 * err => {
 * console.error('Error loading data:', err);
 * }
 * );
 * }
 * 
 * function draw() {
 * // wait until the data is loaded
 * if (!earthquakes || !earthquakes.features[eqFeatureIndex]) {
 * return;
 * }
 * clear();
 * 
 * let feature = earthquakes.features[eqFeatureIndex];
 * let mag = feature.properties.mag;
 * let rad = mag / 11 * ((width + height) / 2);
 * fill(255, 0, 0, 100);
 * ellipse(width / 2 + random(-2, 2), height / 2 + random(-2, 2), rad, rad);
 * 
 * if (eqFeatureIndex >= earthquakes.features.length) {
 * eqFeatureIndex = 0;
 * } else {
 * eqFeatureIndex += 1;
 * }
 * }
 * </code>
 * </div>
 */
function httpDo(path: string | Request, method?: string, datatype?: string, data?: object, callback?: Function, errorCallback?: Function): Promise;

/**
 */
function httpDo(path: string | Request, callback?: Function, errorCallback?: Function): Promise;

/**
 * Creates a new p5.PrintWriter object.p5.PrintWriter objects provide a way to
 * save a sequence of text data, called the , to the user's
 * computer. They're low-level objects that enable precise control of text
 * output. Functions such as
 * saveStrings() and
 * saveJSON() are easier to use for simple file
 * saving.The first parameter, `filename`, is the name of the file to be written. If
 * a string is passed, as in `createWriter('words.txt')`, a new
 * p5.PrintWriter object will be created that
 * writes to a file named `words.txt`.The second parameter, `extension`, is optional. If a string is passed, as
 * in `createWriter('words', 'csv')`, the first parameter will be interpreted
 * as the file name and the second parameter as the extension.
 *
 * @param name of the file to create.
 * @param format to use for the file.
 * @return stream for writing data.
 * @example <div>
 * <code>
 * function setup() {
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
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * // Create a p5.PrintWriter object.
 * let myWriter = createWriter('xo.txt');
 * 
 * // Add some lines to the print stream.
 * myWriter.print('XOO');
 * myWriter.print('OXO');
 * myWriter.print('OOX');
 * 
 * // Save the file and close the print stream.
 * myWriter.close();
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
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * // Create a p5.PrintWriter object.
 * // Use the file format .csv.
 * let myWriter = createWriter('mauna_loa_co2', 'csv');
 * 
 * // Add some lines to the print stream.
 * myWriter.print('date,ppm_co2');
 * myWriter.print('1960-01-01,316.43');
 * myWriter.print('1970-01-01,325.06');
 * myWriter.print('1980-01-01,337.9');
 * myWriter.print('1990-01-01,353.86');
 * myWriter.print('2000-01-01,369.45');
 * myWriter.print('2020-01-01,413.61');
 * 
 * // Save the file and close the print stream.
 * myWriter.close();
 * }
 * }
 * </code>
 * </div>
 */
function createWriter(name: string, extension?: string): p5.PrintWriter;

/**
 * Writes data to the print stream without adding new lines.The parameter, `data`, is the data to write. `data` can be a number or
 * string, as in `myWriter.write('hi')`, or an array of numbers and strings,
 * as in `myWriter.write([1, 2, 3])`. A comma will be inserted between array
 * array elements when they're added to the print stream.
 *
 * @param data to be written as a string, number,
 * or array of strings and numbers.
 * @example <div>
 * <code>
 * function setup() {
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
 * let myWriter = createWriter('numbers.txt');
 * 
 * // Add some data to the print stream.
 * myWriter.write('1,2,3,');
 * myWriter.write(['4', '5', '6']);
 * 
 * // Save the file and close the print stream.
 * myWriter.close();
 * }
 * </code>
 * </div>
 */
function write(data: string | number | Array): void;

/**
 * Saves the file and closes the print stream.
 *
 * @example <div>
 * <code>
 * function setup() {
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
 * let myWriter = createWriter('cat.txt');
 * 
 * // Add some data to the print stream.
 * // ASCII art courtesy Wikipedia:
 * // https://en.wikipedia.org/wiki/ASCII_art
 * myWriter.print(' (\\_/) ');
 * myWriter.print("(='.'=)");
 * myWriter.print('(")_(")');
 * 
 * // Save the file and close the print stream.
 * myWriter.close();
 * }
 * </code>
 * </div>
 */
function close(): void;

/**
 * Saves a given element(image, text, json, csv, wav, or html) to the client's
 * computer. The first parameter can be a pointer to element we want to save.
 * The element can be one of p5.Element,an Array of
 * Strings, an Array of JSON, a JSON object, a p5.Table
 * , a p5.Image, or a p5.SoundFile (requires
 * p5.sound). The second parameter is a filename (including extension).The
 * third parameter is for options specific to this type of object. This method
 * will save a file that fits the given parameters.
 * If it is called without specifying an element, by default it will save the
 * whole canvas as an image file. You can optionally specify a filename as
 * the first parameter in such a case.
 *
 * @param If filename is provided, will
 * save canvas as an image with
 * either png or jpg extension
 * depending on the filename.
 * If object is provided, will
 * save depending on the object
 * and filename (see examples
 * above).
 * @param If an object is provided as the first
 * parameter, then the second parameter
 * indicates the filename,
 * and should include an appropriate
 * file extension (see examples above).
 * @param Additional options depend on
 * filetype. For example, when saving JSON,
 * <code>true</code> indicates that the
 * output will be optimized for filesize,
 * rather than readability.
 * @example <div class="norender"><code>
 * // Saves the canvas as an image
 * cnv = createCanvas(300, 300);
 * save(cnv, 'myCanvas.jpg');
 * 
 * // Saves the canvas as an image by default
 * save('myCanvas.jpg');
 * describe('An example for saving a canvas as an image.');
 * </code></div>
 * 
 * <div class="norender"><code>
 * // Saves p5.Image as an image
 * img = createImage(10, 10);
 * save(img, 'myImage.png');
 * describe('An example for saving a p5.Image element as an image.');
 * </code></div>
 * 
 * <div class="norender"><code>
 * // Saves p5.Renderer object as an image
 * obj = createGraphics(100, 100);
 * save(obj, 'myObject.png');
 * describe('An example for saving a p5.Renderer element.');
 * </code></div>
 * 
 * <div class="norender"><code>
 * let myTable = new p5.Table();
 * // Saves table as html file
 * save(myTable, 'myTable.html');
 * 
 * // Comma Separated Values
 * save(myTable, 'myTable.csv');
 * 
 * // Tab Separated Values
 * save(myTable, 'myTable.tsv');
 * 
 * describe(`An example showing how to save a table in formats of
 * HTML, CSV and TSV.`);
 * </code></div>
 * 
 * <div class="norender"><code>
 * let myJSON = { a: 1, b: true };
 * 
 * // Saves pretty JSON
 * save(myJSON, 'my.json');
 * 
 * // Optimizes JSON filesize
 * save(myJSON, 'my.json', true);
 * 
 * describe('An example for saving JSON to a txt file with some extra arguments.');
 * </code></div>
 * 
 * <div class="norender"><code>
 * // Saves array of strings to text file with line breaks after each item
 * let arrayOfStrings = ['a', 'b'];
 * save(arrayOfStrings, 'my.txt');
 * describe(`An example for saving an array of strings to text file
 * with line breaks.`);
 * </code></div>
 */
function save(objectOrFilename?: object | string, filename?: string, options?: boolean | string): void;

/**
 * Saves an `Object` or `Array` to a JSON file.JavaScript Object Notation
 * (JSON)
 * is a standard format for sending data between applications. The format is
 * based on JavaScript objects which have keys and values. JSON files store
 * data in an object with strings as keys. Values can be strings, numbers,
 * Booleans, arrays, `null`, or other objects.The first parameter, `json`, is the data to save. The data can be an array,
 * as in `[1, 2, 3]`, or an object, as in
 * `{ x: 50, y: 50, color: 'deeppink' }`.The second parameter, `filename`, is a string that sets the file's name.
 * For example, calling `saveJSON([1, 2, 3], 'data.json')` saves the array
 * `[1, 2, 3]` to a file called `data.json` on the user's computer.The third parameter, `optimize`, is optional. If `true` is passed, as in
 * `saveJSON([1, 2, 3], 'data.json', true)`, then all unneeded whitespace will
 * be removed to reduce the file size.Note: The browser will either save the file immediately or prompt the user
 * with a dialogue window.
 *
 * @param data to save.
 * @param name of the file to be saved.
 * @param whether to trim unneeded whitespace. Defaults
 * to `true`.
 * @example <div>
 * <code>
 * function setup() {
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
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * // Create an array.
 * let data = [1, 2, 3];
 * 
 * // Save the JSON file.
 * saveJSON(data, 'numbers.json');
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
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * // Create an object.
 * let data = { x: mouseX, y: mouseY };
 * 
 * // Save the JSON file.
 * saveJSON(data, 'state.json');
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
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * // Create an object.
 * let data = { x: mouseX, y: mouseY };
 * 
 * // Save the JSON file and reduce its size.
 * saveJSON(data, 'state.json', true);
 * }
 * }
 * </code>
 * </div>
 */
function saveJSON(json: Array | object, filename: string, optimize?: boolean): void;

/**
 * Saves an `Array` of `String`s to a file, one per line.The first parameter, `list`, is an array with the strings to save.The second parameter, `filename`, is a string that sets the file's name.
 * For example, calling `saveStrings(['0', '01', '011'], 'data.txt')` saves
 * the array `['0', '01', '011']` to a file called `data.txt` on the user's
 * computer.The third parameter, `extension`, is optional. If a string is passed, as in
 * `saveStrings(['0', '01', '0`1'], 'data', 'txt')`, the second parameter will
 * be interpreted as the file name and the third parameter as the extension.The fourth parameter, `isCRLF`, is also optional, If `true` is passed, as
 * in `saveStrings(['0', '01', '011'], 'data', 'txt', true)`, then two
 * characters, `\r\n` , will be added to the end of each string to create new
 * lines in the saved file. `\r` is a carriage return (CR) and `\n` is a line
 * feed (LF). By default, only `\n` (line feed) is added to each string in
 * order to create new lines.Note: The browser will either save the file immediately or prompt the user
 * with a dialogue window.
 *
 * @param data to save.
 * @param name of file to be saved.
 * @param format to use for the file.
 * @param whether to add `\r\n` to the end of each
 * string. Defaults to `false`.
 * @example <div>
 * <code>
 * function setup() {
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
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * // Create an array.
 * let data = ['0', '01', '011'];
 * 
 * // Save the text file.
 * saveStrings(data, 'data.txt');
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
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * // Create an array.
 * // ASCII art courtesy Wikipedia:
 * // https://en.wikipedia.org/wiki/ASCII_art
 * let data = [' (\\_/) ', "(='.'=)", '(")_(")'];
 * 
 * // Save the text file.
 * saveStrings(data, 'cat', 'txt');
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
 * if (mouseX > 0 && mouseX < 100 && mouseY > 0 && mouseY < 100) {
 * // Create an array.
 * //   +--+
 * //  /  /|
 * // +--+ +
 * // |  |/
 * // +--+
 * let data = ['  +--+', ' /  /|', '+--+ +', '|  |/', '+--+'];
 * 
 * // Save the text file.
 * // Use CRLF for line endings.
 * saveStrings(data, 'box', 'txt', true);
 * }
 * }
 * </code>
 * </div>
 */
function saveStrings(list: string[], filename: string, extension?: string, isCRLF?: boolean): void;

/**
 * Writes the contents of a Table object to a file. Defaults to a
 * text file with comma-separated-values ('csv') but can also
 * use tab separation ('tsv'), or generate an HTML table ('html').
 * The file saving process and location of the saved file will
 * vary between web browsers.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param the <a href="#/p5.Table">Table</a> object to save to a file
 * @param the filename to which the Table should be saved
 * @param can be one of "tsv", "csv", or "html"
 * @example <div><code>
 * let table;
 * 
 * function setup() {
 * table = new p5.Table();
 * 
 * table.addColumn('id');
 * table.addColumn('species');
 * table.addColumn('name');
 * 
 * let newRow = table.addRow();
 * newRow.setNum('id', table.getRowCount() - 1);
 * newRow.setString('species', 'Panthera leo');
 * newRow.setString('name', 'Lion');
 * 
 * // To save, un-comment next line then click 'run'
 * // saveTable(table, 'new.csv');
 * 
 * describe('no image displayed');
 * }
 * 
 * // Saves the following to a file called 'new.csv':
 * // id,species,name
 * // 0,Panthera leo,Lion
 * </code></div>
 */
function saveTable(Table: p5.Table, filename: string, options?: string): void;

}

export default function files(p5: any, fn: any): void;
