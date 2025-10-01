// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class Table {
    constructor(rows?: p5.TableRow[]);

  /**
   * Use addRow() to add a new row of data to a p5.Table object. By default,
   * an empty row is created. Typically, you would store a reference to
   * the new row in a TableRow object (see newRow in the example above),
   * and then set individual values using set().If a p5.TableRow object is included as a parameter, then that row is
   * duplicated and added to the table.
 *
   * @param
   */
  addRow(row: p5.TableRow): p5.TableRow;

  /**
   * Removes a row from the table object.
 *
   * @param
   */
  removeRow(id: number): void;

  /**
   * Returns a reference to the specified p5.TableRow. The reference
   * can then be used to get and set values of the selected row.
 *
   * @param
   * @param
   */
  getRow(r: any, rowID: number): p5.TableRow;

  /**
   * Gets all rows from the table. Returns an array of p5.TableRows.
   */
  getRows(): p5.TableRow[];

  /**
   * Finds the first row in the Table that contains the value
   * provided, and returns a reference to that row. Even if
   * multiple rows are possible matches, only the first matching
   * row is returned. The column to search may be specified by
   * either its ID or title.
 *
   * @param
   * @param
   */
  findRow(value: string, column: number | string): p5.TableRow;

  /**
   * Finds the rows in the Table that contain the value
   * provided, and returns references to those rows. Returns an
   * Array, so for must be used to iterate through all the rows,
   * as shown in the example above. The column to search may be
   * specified by either its ID or title.
 *
   * @param
   * @param
   */
  findRows(value: string, column: number | string): p5.TableRow[];

  /**
   * Finds the first row in the Table that matches the regular
   * expression provided, and returns a reference to that row.
   * Even if multiple rows are possible matches, only the first
   * matching row is returned. The column to search may be
   * specified by either its ID or title.
 *
   * @param
   * @param
   */
  matchRow(regexp: string | RegExp, column: string | number): p5.TableRow;

  /**
   * Finds the rows in the Table that match the regular expression provided,
   * and returns references to those rows. Returns an array, so for must be
   * used to iterate through all the rows, as shown in the example. The
   * column to search may be specified by either its ID or title.
 *
   * @param
   * @param
   */
  matchRows(regexp: string, column: string | number): p5.TableRow[];

  /**
   * Retrieves all values in the specified column, and returns them
   * as an array. The column may be specified by either its ID or title.
 *
   * @param
   * @param
   */
  getColumn(value: any, column: string | number): Array;

  /**
   * Removes all rows from a Table. While all rows are removed,
   * columns and column titles are maintained.
   */
  clearRows(): void;

  /**
   * Use addColumn() to add a new column to a Table object.
   * Typically, you will want to specify a title, so the column
   * may be easily referenced later by name. (If no title is
   * specified, the new column's title will be null.)
 *
   * @param
   */
  addColumn(title: string): void;

  /**
   * Returns the total number of columns in a Table.
   */
  getColumnCount(): number;

  /**
   * Returns the total number of rows in a Table.
   */
  getRowCount(): number;

  /**
   * Removes any of the specified characters (or "tokens").If no column is specified, then the values in all columns and
   * rows are processed. A specific column may be referenced by
   * either its ID or title.
 *
   * @param
   * @param
   */
  removeTokens(chars: string, column: string | number): void;

  /**
   * Trims leading and trailing whitespace, such as spaces and tabs,
   * from String table values. If no column is specified, then the
   * values in all columns and rows are trimmed. A specific column
   * may be referenced by either its ID or title.
 *
   * @param
   */
  trim(column: string | number): void;

  /**
   * Use removeColumn() to remove an existing column from a Table
   * object. The column to be removed may be identified by either
   * its title (a String) or its index value (an int).
   * removeColumn(0) would remove the first column, removeColumn(1)
   * would remove the second column, and so on.
 *
   * @param
   * @param
   */
  removeColumn(c: any, column: string | number): void;

  /**
   * Stores a value in the Table's specified row and column.
   * The row is specified by its ID, while the column may be specified
   * by either its ID or title.
 *
   * @param
   * @param
   * @param
   */
  set(row: number, column: string | number, value: string | number): void;

  /**
   * Stores a Float value in the Table's specified row and column.
   * The row is specified by its ID, while the column may be specified
   * by either its ID or title.
 *
   * @param
   * @param
   * @param
   */
  setNum(row: number, column: string | number, value: number): void;

  /**
   * Stores a String value in the Table's specified row and column.
   * The row is specified by its ID, while the column may be specified
   * by either its ID or title.
 *
   * @param
   * @param
   * @param
   */
  setString(row: number, column: string | number, value: string): void;

  /**
   * Retrieves a value from the Table's specified row and column.
   * The row is specified by its ID, while the column may be specified by
   * either its ID or title.
 *
   * @param
   * @param
   */
  get(row: number, column: string | number): string | number;

  /**
   * Retrieves a Float value from the Table's specified row and column.
   * The row is specified by its ID, while the column may be specified by
   * either its ID or title.
 *
   * @param
   * @param
   */
  getNum(row: number, column: string | number): number;

  /**
   * Retrieves a String value from the Table's specified row and column.
   * The row is specified by its ID, while the column may be specified by
   * either its ID or title.
 *
   * @param
   * @param
   */
  getString(row: number, column: string | number): string;

  /**
   * Retrieves all table data and returns as an object. If a column name is
   * passed in, each row object will be stored with that attribute as its
   * title.
 *
   * @param
   */
  getObject(headerColumn: string): object;

  /**
   * Retrieves all table data and returns it as a multidimensional array.
   */
  getArray(): Array;

  }

/**
 * Use addRow() to add a new row of data to a p5.Table object. By default,
 * an empty row is created. Typically, you would store a reference to
 * the new row in a TableRow object (see newRow in the example above),
 * and then set individual values using set().If a p5.TableRow object is included as a parameter, then that row is
 * duplicated and added to the table.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param row to be added to the table
 * @return the row that was added
 * @example <div>
 * <code>
 * // Given the CSV file "mammals.csv"
 * // in the project's "assets" folder:
 * //
 * // id,species,name
 * // 0,Capra hircus,Goat
 * // 1,Panthera pardus,Leopard
 * // 2,Equus zebra,Zebra
 * 
 * let table;
 * 
 * async function setup() {
 * // Create a 300x300 canvas
 * createCanvas(300, 300);
 * 
 * // Load the CSV file from the assets folder with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Add a new row for "Wolf"
 * let newRow = table.addRow();
 * newRow.setString('id', table.getRowCount() - 1);
 * newRow.setString('species', 'Canis Lupus');
 * newRow.setString('name', 'Wolf');
 * 
 * // Set text properties
 * fill(0);       // Text color: black
 * textSize(12);  // Adjust text size as needed
 * 
 * // Display the table data on the canvas
 * // Each cell is positioned based on its row and column
 * for (let r = 0; r < table.getRowCount(); r++) {
 * for (let c = 0; c < table.getColumnCount(); c++) {
 * let x = c * 50 + 10;  // Horizontal spacing for each column
 * let y = r * 30 + 20;  // Vertical spacing for each row
 * text(table.getString(r, c), x * c, y);
 * }
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function addRow(row?: p5.TableRow): p5.TableRow;

/**
 * Removes a row from the table object.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param ID number of the row to remove
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
 * // Remove the first row from the table
 * table.removeRow(0);
 * 
 * // Set text properties for drawing on the canvas
 * fill(0);      // Set text color to black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display the table values on the canvas:
 * // Each row's cell values are joined into a single string and drawn on a new line.
 * let y = 20; // Starting vertical position
 * for (let r = 0; r < table.getRowCount(); r++) {
 * let rowText = "";
 * for (let c = 0; c < table.getColumnCount(); c++) {
 * rowText += table.getString(r, c) + " ";
 * }
 * text(rowText, 18, y * 3);
 * y += 20;
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function removeRow(id: number): void;

/**
 * Returns a reference to the specified p5.TableRow. The reference
 * can then be used to get and set values of the selected row.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param ID number of the row to get
 * @return <a href="#/p5.TableRow">p5.TableRow</a> object
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas
 * createCanvas(200, 200);
 * background(255); // Set background to white
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Get the row at index 1 (second row)
 * let row = table.getRow(1);
 * 
 * // Set text properties for drawing on the canvas
 * fill(0);      // Set text color to black
 * textSize(12); // Set the text size
 * 
 * // Loop over each column in the row and display its value on the canvas
 * for (let c = 0; c < table.getColumnCount(); c++) {
 * text(row.getString(c), 10, 20 + c * 50 + 20);
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getRow(r: any, rowID: number): p5.TableRow;

/**
 * Gets all rows from the table. Returns an array of p5.TableRows.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @return Array of <a href="#/p5.TableRow">p5.TableRow</a>s
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
 * let rows = table.getRows();
 * 
 * // Warning: rows is an array of objects.
 * // Set the 'name' of each row to 'Unicorn'
 * for (let r = 0; r < rows.length; r++) {
 * rows[r].set('name', 'Unicorn');
 * }
 * 
 * // Set text properties
 * fill(0);      // Set text color to black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display the modified table values on the canvas
 * // We'll join each row's values with a space and display each row on a new line.
 * let y = 20; // Starting y position
 * for (let r = 0; r < table.getRowCount(); r++) {
 * let rowText = "";
 * for (let c = 0; c < table.getColumnCount(); c++) {
 * rowText += table.getString(r, c) + " ";
 * }
 * text(rowText, 10, y * 2);
 * y += 20; // Move to next line
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getRows(): p5.TableRow[];

/**
 * Finds the first row in the Table that contains the value
 * provided, and returns a reference to that row. Even if
 * multiple rows are possible matches, only the first matching
 * row is returned. The column to search may be specified by
 * either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param The value to match
 * @param ID number or title of the
 * column to search
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 100x100 canvas
 * createCanvas(100, 100);
 * background(255); // Set background to white
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Find the row with the animal named "Zebra"
 * let row = table.findRow('Zebra', 'name');
 * 
 * // Get the species from the found row
 * let species = row.getString('species');
 * 
 * // Set text properties and display the species on the canvas
 * fill(0);      // Set text color to black
 * textSize(12); // Adjust text size as needed
 * text(species, 10, 30);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function findRow(value: string, column: number | string): p5.TableRow;

/**
 * Finds the rows in the Table that contain the value
 * provided, and returns references to those rows. Returns an
 * Array, so for must be used to iterate through all the rows,
 * as shown in the example above. The column to search may be
 * specified by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param The value to match
 * @param ID number or title of the
 * column to search
 * @return An Array of TableRow objects
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas
 * createCanvas(200, 200);
 * background(255); // Set background to white
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Add another goat entry
 * let newRow = table.addRow();
 * newRow.setString('id', table.getRowCount() - 1);
 * newRow.setString('species', 'Scape Goat');
 * newRow.setString('name', 'Goat');
 * 
 * // Find rows where the name is "Goat"
 * let rows = table.findRows('Goat', 'name');
 * 
 * // Set text properties
 * fill(0);      // Set text color to black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display the result on the canvas
 * text(rows.length + ' Goats found', 10, 30);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function findRows(value: string, column: number | string): p5.TableRow[];

/**
 * Finds the first row in the Table that matches the regular
 * expression provided, and returns a reference to that row.
 * Even if multiple rows are possible matches, only the first
 * matching row is returned. The column to search may be
 * specified by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param The regular expression to match
 * @param The column ID (number) or
 * title (string)
 * @return TableRow object
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas
 * createCanvas(200, 200);
 * background(255); // Set background to white
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Search using the specified regex on column index 1 (species)
 * let mammal = table.matchRow(new RegExp('ant'), 1);
 * let species = mammal.getString(1);  // "Panthera pardus"
 * 
 * // Set text properties for drawing on the canvas
 * fill(0);       // Text color: black
 * textSize(12);  // Adjust text size as needed
 * 
 * // Display the species on the canvas
 * text(species, 10, 30);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function matchRow(regexp: string | RegExp, column: string | number): p5.TableRow;

/**
 * Finds the rows in the Table that match the regular expression provided,
 * and returns references to those rows. Returns an array, so for must be
 * used to iterate through all the rows, as shown in the example. The
 * column to search may be specified by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param The regular expression to match
 * @param The column ID (number) or
 * title (string)
 * @return An Array of TableRow objects
 * @example <div>
 * <code>
 * let table;
 * 
 * function setup() {
 * // Create a 200x200 canvas and set a white background
 * createCanvas(200, 200);
 * background(255);
 * 
 * // Create a new p5.Table and add columns
 * table = new p5.Table();
 * table.addColumn('name');
 * table.addColumn('type');
 * 
 * // Add rows to the table
 * let newRow = table.addRow();
 * newRow.setString('name', 'Lion');
 * newRow.setString('type', 'Mammal');
 * 
 * newRow = table.addRow();
 * newRow.setString('name', 'Snake');
 * newRow.setString('type', 'Reptile');
 * 
 * newRow = table.addRow();
 * newRow.setString('name', 'Mosquito');
 * newRow.setString('type', 'Insect');
 * 
 * newRow = table.addRow();
 * newRow.setString('name', 'Lizard');
 * newRow.setString('type', 'Reptile');
 * 
 * // Search for rows where the "type" starts with "R"
 * let rows = table.matchRows('R.*', 'type');
 * 
 * // Set text properties for drawing on the canvas
 * fill(0);       // Text color: black
 * textSize(12);  // Text size
 * 
 * // Display each matching row on the canvas
 * let y = 20;
 * for (let i = 0; i < rows.length; i++) {
 * let output = rows[i].getString('name') + ': ' + rows[i].getString('type');
 * text(output, 10, y);
 * y += 20;
 * }
 * }
 * </code>
 * </div>
 */
function matchRows(regexp: string, column?: string | number): p5.TableRow[];

/**
 * Retrieves all values in the specified column, and returns them
 * as an array. The column may be specified by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param String or Number of the column to return
 * @return Array of column values
 * @example <div class="norender">
 * <code>
 * // Given the CSV file "mammals.csv"
 * // in the project's "assets" folder:
 * //
 * // id,species,name
 * // 0,Capra hircus,Goat
 * // 1,Panthera pardus,Leopard
 * // 2,Equus zebra,Zebra
 * 
 * let table;
 * *
 * async function setup() {
 * // The table is comma separated value "csv"
 * // and has a header specifying the columns labels.
 * table = await loadTable('assets/mammals.csv', 'csv', 'header');
 * 
 * //getColumn returns an array that can be printed directly
 * print(table.getColumn('species'));
 * //outputs ["Capra hircus", "Panthera pardus", "Equus zebra"]
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getColumn(value: any, column: string | number): Array;

/**
 * Removes all rows from a Table. While all rows are removed,
 * columns and column titles are maintained.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @example <div>
 * <code>
 * // Given the CSV file "mammals.csv"
 * // in the project's "assets" folder:
 * //
 * // id,species,name
 * // 0,Capra hircus,Goat
 * // 1,Panthera pardus,Leopard
 * // 2,Equus zebra,Zebra
 * 
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas
 * createCanvas(200, 200);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Clear all rows from the table
 * table.clearRows();
 * 
 * // Set text properties
 * fill(0);       // Text color: black
 * textSize(12);  // Adjust text size as needed
 * 
 * // Display the number of rows and columns on the canvas
 * text(table.getRowCount() + ' total rows in table', 10, 30);
 * text(table.getColumnCount() + ' total columns in table', 10, 60);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function clearRows(): void;

/**
 * Use addColumn() to add a new column to a Table object.
 * Typically, you will want to specify a title, so the column
 * may be easily referenced later by name. (If no title is
 * specified, the new column's title will be null.)
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param title of the given column
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * createCanvas(300, 300);
 * table = await loadTable('/assets/mammals.csv', ',', 'header');
 * 
 * table.addColumn('carnivore');
 * table.set(0, 'carnivore', 'no');
 * table.set(1, 'carnivore', 'yes');
 * table.set(2, 'carnivore', 'no');
 * 
 * fill(0);      // Set text color to black
 * textSize(11); // Adjust text size as needed
 * 
 * for (let r = 0; r < table.getRowCount(); r++) {
 * for (let c = 0; c < table.getColumnCount(); c++) {
 * // Keep column spacing consistent (e.g. 80 pixels apart).
 * let x = c * 80 + 10;
 * let y = r * 30 + 20;
 * // Use x directly, rather than multiplying by c again
 * text(table.getString(r, c), x, y);
 * }
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function addColumn(title?: string): void;

/**
 * Returns the total number of columns in a Table.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @return Number of columns in this table
 * @example <div>
 * <code>
 * // given the cvs file "blobs.csv" in /assets directory
 * // ID, Name, Flavor, Shape, Color
 * // Blob1, Blobby, Sweet, Blob, Pink
 * // Blob2, Saddy, Savory, Blob, Blue
 * 
 * let table;
 * 
 * async function setup() {
 * table = await loadTable('assets/blobs.csv');
 * 
 * createCanvas(200, 100);
 * textAlign(CENTER);
 * background(255);
 * }
 * 
 * function draw() {
 * let numOfColumn = table.getColumnCount();
 * text('There are ' + numOfColumn + ' columns in the table.', 100, 50);
 * }
 * </code>
 * </div>
 */
function getColumnCount(): number;

/**
 * Returns the total number of rows in a Table.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @return Number of rows in this table
 * @example <div>
 * <code>
 * // given the cvs file "blobs.csv" in /assets directory
 * //
 * // ID, Name, Flavor, Shape, Color
 * // Blob1, Blobby, Sweet, Blob, Pink
 * // Blob2, Saddy, Savory, Blob, Blue
 * 
 * let table;
 * 
 * async function setup() {
 * table = await loadTable('assets/blobs.csv');
 * 
 * createCanvas(200, 100);
 * textAlign(CENTER);
 * background(255);
 * }
 * 
 * function draw() {
 * text('There are ' + table.getRowCount() + ' rows in the table.', 100, 50);
 * }
 * </code>
 * </div>
 */
function getRowCount(): number;

/**
 * Removes any of the specified characters (or "tokens").If no column is specified, then the values in all columns and
 * rows are processed. A specific column may be referenced by
 * either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param String listing characters to be removed
 * @param Column ID (number)
 * or name (string)
 * @example <div class="norender"><code>
 * function setup() {
 * let table = new p5.Table();
 * 
 * table.addColumn('name');
 * table.addColumn('type');
 * 
 * let newRow = table.addRow();
 * newRow.setString('name', '   $Lion  ,');
 * newRow.setString('type', ',,,Mammal');
 * 
 * newRow = table.addRow();
 * newRow.setString('name', '$Snake  ');
 * newRow.setString('type', ',,,Reptile');
 * 
 * table.removeTokens(',$ ');
 * print(table.getArray());
 * }
 * 
 * // prints:
 * //  0  "Lion"   "Mamal"
 * //  1  "Snake"  "Reptile"
 * </code></div>
 */
function removeTokens(chars: string, column?: string | number): void;

/**
 * Trims leading and trailing whitespace, such as spaces and tabs,
 * from String table values. If no column is specified, then the
 * values in all columns and rows are trimmed. A specific column
 * may be referenced by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param Column ID (number)
 * or name (string)
 * @example <div class="norender"><code>
 * function setup() {
 * let table = new p5.Table();
 * 
 * table.addColumn('name');
 * table.addColumn('type');
 * 
 * let newRow = table.addRow();
 * newRow.setString('name', '   Lion  ,');
 * newRow.setString('type', ' Mammal  ');
 * 
 * newRow = table.addRow();
 * newRow.setString('name', '  Snake  ');
 * newRow.setString('type', '  Reptile  ');
 * 
 * table.trim();
 * print(table.getArray());
 * }
 * 
 * // prints:
 * //  0  "Lion"   "Mamal"
 * //  1  "Snake"  "Reptile"
 * </code></div>
 */
function trim(column?: string | number): void;

/**
 * Use removeColumn() to remove an existing column from a Table
 * object. The column to be removed may be identified by either
 * its title (a String) or its index value (an int).
 * removeColumn(0) would remove the first column, removeColumn(1)
 * would remove the second column, and so on.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param columnName (string) or ID (number)
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 100x100 canvas
 * createCanvas(100, 100);
 * background(255); // Set background to white
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Remove the "id" column
 * table.removeColumn('id');
 * 
 * // Get the remaining column count
 * let colCount = table.getColumnCount();
 * 
 * // Set text properties
 * fill(0);      // Text color: black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display the column count on the canvas
 * text(colCount, 40, 50);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function removeColumn(c: any, column: string | number): void;

/**
 * Stores a value in the Table's specified row and column.
 * The row is specified by its ID, while the column may be specified
 * by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param row ID
 * @param column ID (Number)
 * or title (String)
 * @param value to assign
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
 * // Update the first row: change species to "Canis Lupus" and name to "Wolf"
 * table.set(0, 'species', 'Canis Lupus');
 * table.set(0, 'name', 'Wolf');
 * 
 * // Set text properties for drawing on the canvas
 * fill(0);      // Text color: black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display the table values on the canvas:
 * // Each row's values are concatenated into a single string and displayed on a new line.
 * let y = 20; // Starting vertical position
 * for (let r = 0; r < table.getRowCount(); r++) {
 * let rowText = "";
 * for (let c = 0; c < table.getColumnCount(); c++) {
 * rowText += table.getString(r, c) + " ";
 * }
 * text(rowText, 10, y * 2.5);
 * y += 20;
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function set(row: number, column: string | number, value: string | number): void;

/**
 * Stores a Float value in the Table's specified row and column.
 * The row is specified by its ID, while the column may be specified
 * by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param row ID
 * @param column ID (Number)
 * or title (String)
 * @param value to assign
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 100x100 canvas and set a white background
 * createCanvas(100, 100);
 * background(255);
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Set the value in row 1, column "id" to the number 1
 * table.setNum(1, 'id', 1);
 * 
 * // Get the first column as an array and join its values into a string for display.
 * let col0 = table.getColumn(0);  // Expected output: ["0", 1, "2"]
 * let output = col0.join(", ");
 * 
 * // Set text properties and display the output on the canvas
 * fill(0);      // Text color: black
 * textSize(12); // Adjust text size as needed
 * text(output, 30, 50);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function setNum(row: number, column: string | number, value: number): void;

/**
 * Stores a String value in the Table's specified row and column.
 * The row is specified by its ID, while the column may be specified
 * by either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param row ID
 * @param column ID (Number)
 * or title (String)
 * @param value to assign
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas and set a white background
 * createCanvas(200, 200);
 * background(255);
 * 
 * // Load the CSV file from the assets folder with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Add a new row with the new animal data
 * let newRow = table.addRow();
 * newRow.setString('id', table.getRowCount() - 1);
 * newRow.setString('species', 'Canis Lupus');
 * newRow.setString('name', 'Wolf');
 * 
 * // Convert the table to a 2D array
 * let tableArray = table.getArray();
 * 
 * // Set text properties
 * fill(0);       // Set text color to black
 * textSize(12);  // Adjust text size as needed
 * 
 * // Display each row of the table on the canvas
 * let y = 20;  // Starting y position
 * for (let i = 0; i < tableArray.length; i++) {
 * // Join the values of each row with a comma separator
 * let rowText = tableArray[i].join(', ');
 * text(rowText, 15, y * 2);
 * y += 20;  // Increment y position for the next row
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function setString(row: number, column: string | number, value: string): void;

/**
 * Retrieves a value from the Table's specified row and column.
 * The row is specified by its ID, while the column may be specified by
 * either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param row ID
 * @param columnName (string) or
 * ID (number)
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 100x100 canvas
 * createCanvas(100, 100);
 * background(255); // Set background to white
 * 
 * // Load the CSV file from the assets folder with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Set text properties for drawing on the canvas
 * fill(0);      // Text color: black
 * textSize(12); // Adjust text size as needed
 * 
 * // Get the values from the table
 * let value1 = table.get(0, 1);       // Using column index (1) => "Capra hircus"
 * let value2 = table.get(0, 'species'); // Using column name => "Capra hircus"
 * 
 * // Display the values on the canvas
 * text(value1, 10, 30);
 * text(value2, 10, 60);
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function get(row: number, column: string | number): string | number;

/**
 * Retrieves a Float value from the Table's specified row and column.
 * The row is specified by its ID, while the column may be specified by
 * either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param row ID
 * @param columnName (string) or
 * ID (number)
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 100x100 canvas
 * createCanvas(100, 100);
 * background(255); // Set background to white
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Compute the result: id at row 1, column 0 plus 100 (i.e. 1 + 100 = 101)
 * let result = table.getNum(1, 0) + 100;
 * 
 * // Set text properties and display the result on the canvas
 * fill(0);      // Set text color to black
 * textSize(12); // Adjust text size as needed
 * text(result, 10, 30);  // Display the result at position (10, 30)
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getNum(row: number, column: string | number): number;

/**
 * Retrieves a String value from the Table's specified row and column.
 * The row is specified by its ID, while the column may be specified by
 * either its ID or title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param row ID
 * @param columnName (string) or
 * ID (number)
 * @example <div>
 * <code>
 * let table;
 * 
 * async function setup() {
 * // Create a 200x200 canvas
 * createCanvas(200, 200);
 * background(255); // Set background to white
 * 
 * // Load the CSV file with a header row
 * table = await loadTable('assets/mammals.csv', ',', 'header');
 * 
 * // Set text properties
 * fill(0);      // Text color: black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display each table cell value on the canvas one below the other.
 * // We use a variable 'y' to increment the vertical position.
 * let y = 20;
 * text(table.getString(0, 0), 10, y); // 0
 * y += 20;
 * text(table.getString(0, 1), 10, y); // Capra hircus
 * y += 20;
 * text(table.getString(0, 2), 10, y); // Goat
 * y += 20;
 * text(table.getString(1, 0), 10, y); // 1
 * y += 20;
 * text(table.getString(1, 1), 10, y); // Panthera pardus
 * y += 20;
 * text(table.getString(1, 2), 10, y); // Leopard
 * y += 20;
 * text(table.getString(2, 0), 10, y); // 2
 * y += 20;
 * text(table.getString(2, 1), 10, y); // Equus zebra
 * y += 20;
 * text(table.getString(2, 2), 10, y); // Zebra
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getString(row: number, column: string | number): string;

/**
 * Retrieves all table data and returns as an object. If a column name is
 * passed in, each row object will be stored with that attribute as its
 * title.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param Name of the column which should be used to
 * title each row object (optional)
 * @example <div class="norender">
 * <code>
 * // Given the CSV file "mammals.csv"
 * // in the project's "assets" folder:
 * //
 * // id,species,name
 * // 0,Capra hircus,Goat
 * // 1,Panthera pardus,Leopard
 * // 2,Equus zebra,Zebra
 * 
 * let table;
 * 
 * async function setup() {
 * // The table is comma separated value "csv"
 * // and has a header specifying the columns labels.
 * table = await loadTable('assets/mammals.csv', 'csv', 'header');
 * 
 * let tableObject = table.getObject();
 * 
 * print(tableObject);
 * //outputs an object
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getObject(headerColumn?: string): object;

/**
 * Retrieves all table data and returns it as a multidimensional array.
 *
 * @deprecated p5.Table will be removed in a future version of p5.js to make way for a new, friendlier version :)
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
 * // Get the CSV data as a 2D array
 * let tableArray = table.getArray();
 * 
 * // Set text properties
 * fill(0);      // Set text color to black
 * textSize(12); // Adjust text size as needed
 * 
 * // Display each row of the CSV on the canvas
 * // Each row is displayed on a separate line
 * for (let i = 0; i < tableArray.length; i++) {
 * let rowText = tableArray[i].join(", ");
 * text(rowText, 10, 20 + i * 50 + 30);
 * }
 * 
 * describe('no image displayed');
 * }
 * </code>
 * </div>
 */
function getArray(): Array;

}

export default function p5_Table(p5: any, fn: any): void;
