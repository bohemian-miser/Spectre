// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class TableRow {
    constructor(row: any[]);

  /**
   * Stores a value in the TableRow's specified column.
   * The column may be specified by either its ID or title.
 *
   * @param
   * @param
   */
  set(column: string | number, value: string | number): void;

  /**
   * Stores a Float value in the TableRow's specified column.
   * The column may be specified by either its ID or title.
 *
   * @param
   * @param
   */
  setNum(column: string | number, value: number | string): void;

  /**
   * Stores a String value in the TableRow's specified column.
   * The column may be specified by either its ID or title.
 *
   * @param
   * @param
   */
  setString(column: string | number, value: string | number | boolean | object): void;

  /**
   * Retrieves a value from the TableRow's specified column.
   * The column may be specified by either its ID or title.
 *
   * @param
   */
  get(column: string | number): string | number;

  /**
   * Retrieves a Float value from the TableRow's specified
   * column. The column may be specified by either its ID or
   * title.
 *
   * @param
   */
  getNum(column: string | number): number;

  /**
   * Retrieves an String value from the TableRow's specified
   * column. The column may be specified by either its ID or
   * title.
 *
   * @param
   */
  getString(column: string | number): string;

  }

/**
 * Stores a value in the TableRow's specified column.
 * The column may be specified by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param Column ID (Number)
 * or Title (String)
 * @param The value to be stored
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas and set a white background
 * createCanvas(200, 200);
 * background(255);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Set every row's "name" to "Unicorn"
 * let rows = table.getRows();
 * for (let r = 0; r < rows.length; r++) {
 * rows[r].set('name', 'Unicorn');
 * }
 * 
 * // Convert the table to an array
 * let tableArray = table.getArray();
 * 
 * // Set text properties
 * fill(0);      // Set text color to black
 * textSize(12); // Set text size
 * 
 * // Display each row of the table on the canvas
 * let y = 20; // Starting y position
 * for (let i = 0; i < tableArray.length; i++) {
 * let rowText = tableArray[i].join(', ');
 * text(rowText, 10, y * 2.5);
 * y += 20; // Increment y position for the next row
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function set(column: string | number, value: string | number): void;

/**
 * Stores a Float value in the TableRow's specified column.
 * The column may be specified by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param Column ID (Number)
 * or Title (String)
 * @param The value to be stored
 * as a Float
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas and set a white background
 * createCanvas(200, 200);
 * background(255);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Update each row's "id" to (row index + 10)
 * let rows = table.getRows();
 * for (let r = 0; r < rows.length; r++) {
 * rows[r].setNum('id', r + 10);
 * }
 * 
 * // Convert the table to a 2D array for display
 * let tableArray = table.getArray();
 * 
 * // Set text properties
 * fill(0);      // Text color: black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display each row of the table on the canvas
 * let y = 20;   // Starting y position
 * for (let i = 0; i < tableArray.length; i++) {
 * // Join each row's values with a comma separator
 * let rowText = tableArray[i].join(', ');
 * text(rowText, 10, y * 2.5);
 * y += 20;  // Increment y for the next row
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function setNum(column: string | number, value: number | string): void;

/**
 * Stores a String value in the TableRow's specified column.
 * The column may be specified by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param Column ID (Number)
 * or Title (String)
 * @param The value to be stored
 * as a String
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 300x200 canvas and set a white background
 * createCanvas(300, 200);
 * background(255);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Update each row's "name" field
 * let rows = table.getRows();
 * for (let r = 0; r < rows.length; r++) {
 * let name = rows[r].getString('name');
 * rows[r].setString('name', 'A ' + name + ' named George');
 * }
 * 
 * // Convert the table to a 2D array for display
 * let tableArray = table.getArray();
 * 
 * // Set text properties
 * fill(0);      // Text color: black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display each row of the table on the canvas
 * let y = 20;   // Starting y position
 * for (let i = 0; i < tableArray.length; i++) {
 * let rowText = tableArray[i].join(', ');
 * text(rowText, 10, y * 2.5);
 * y += 20;    // Increment y for the next row
 * }
 * 
 * // describe('no image displayed');
 * }
 * </code>
 */
function setString(column: string | number, value: string | number | boolean | object): void;

/**
 * Retrieves a value from the TableRow's specified column.
 * The column may be specified by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param columnName (string) or
 * ID (number)
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x100 canvas and set a white background
 * createCanvas(200, 100);
 * background(255);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Extract the names from each row and store them in an array
 * let names = [];
 * let rows = table.getRows();
 * for (let r = 0; r < rows.length; r++) {
 * names.push(rows[r].get('name'));
 * }
 * 
 * // Set text properties and display the names on the canvas
 * fill(0);      // Set text color to black
 * textSize(12); // Set text size
 * 
 * // Join names into a single string separated by commas
 * let namesText = names.join(', ');
 * text(namesText, 35, 50);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function get(column: string | number): string | number;

/**
 * Retrieves a Float value from the TableRow's specified
 * column. The column may be specified by either its ID or
 * title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param columnName (string) or
 * ID (number)
 * @return Float Floating point number
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 300x100 canvas and set a white background
 * createCanvas(300, 100);
 * background(255);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * let rows = table.getRows();
 * let minId = Infinity;
 * let maxId = -Infinity;
 * 
 * for (let r = 0; r < rows.length; r++) {
 * let id = rows[r].getNum('id');
 * minId = min(minId, id);
 * maxId = max(maxId, id);
 * }
 * 
 * let result = 'minimum id = ' + minId + ', maximum id = ' + maxId;
 * 
 * // Set text properties and display the result on the canvas
 * fill(0);      // Set text color to black
 * textSize(12); // Set text size
 * text(result, 10, 50);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getNum(column: string | number): number;

/**
 * Retrieves an String value from the TableRow's specified
 * column. The column may be specified by either its ID or
 * title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param columnName (string) or
 * ID (number)
 * @return String
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x100 canvas and set a white background
 * createCanvas(200, 100);
 * background(255);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * let rows = table.getRows();
 * let longest = '';
 * for (let r = 0; r < rows.length; r++) {
 * let species = rows[r].getString('species');
 * if (longest.length < species.length) {
 * longest = species;
 * }
 * }
 * 
 * let result = 'longest: ' + longest;
 * 
 * // Set text properties and display the result on the canvas
 * fill(0);      // Set text color to black
 * textSize(12); // Set text size
 * text(result, 30, 50);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getString(column: string | number): string;

}

export default function p5_TableRow(p5: any, fn: any): void;
