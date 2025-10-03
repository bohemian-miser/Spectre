// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Converts a `String` to a floating point (decimal) `Number`.`float()` converts strings that resemble numbers, such as `'12.34'`, into
 * numbers.The parameter, `str`, is the string value to convert. For example, calling
 * `float('12.34')` returns the number `12.34`.  If an array of strings is
 * passed, as in `float(['12.34', '56.78'])`, then an array of numbers will be
 * returned.Note: If a string can't be converted to a number, as in `float('giraffe')`,
 * then the value `NaN` (not a number) will be returned.
 *
 * @param string to convert.
 * @return converted number.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a string variable.
 * let original = '12.3';
 * 
 * // Convert the string to a number.
 * let converted = float(original);
 * 
 * // Double the converted value.
 * let twice = converted * 2;
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(12);
 * 
 * // Display the original and converted values.
 * text(`${original} × 2 = ${twice}`, 50, 50);
 * 
 * describe('The text "12.3 × 2 = 24.6" written in black on a gray background.');
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
 * // Create an array of strings.
 * let original = ['60', '30', '15'];
 * 
 * // Convert the strings to numbers.
 * let diameters = float(original);
 * 
 * for (let d of diameters) {
 * // Draw a circle.
 * circle(50, 50, d);
 * }
 * 
 * describe('Three white, concentric circles on a gray background.');
 * }
 * </code>
 * </div>
 */
function float(str: string): number;

/**
 * @param array of strings to convert.
 * @return converted numbers.
 */
function float(ns: string[]): number[];

/**
 * Converts a `Boolean`, `String`, or decimal `Number` to an integer.`int()` converts values to integers. Integers are positive or negative
 * numbers without decimals. If the original value has decimals, as in -34.56,
 * they're removed to produce an integer such as -34.The parameter, `n`, is the value to convert. If `n` is a Boolean, as in
 * `int(false)` or `int(true)`, then the number 0 (`false`) or 1 (`true`) will
 * be returned. If `n` is a string or number, as in `int('45')` or
 * `int(67.89)`, then an integer will be returned. If an array is passed, as
 * in `int([12.34, 56.78])`, then an array of integers will be returned.Note: If a value can't be converted to a number, as in `int('giraffe')`,
 * then the value `NaN` (not a number) will be returned.
 *
 * @param value to convert.
 * @return converted number.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a Boolean variable.
 * let original = false;
 * 
 * // Convert the Boolean to an integer.
 * let converted = int(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} : ${converted}`, 50, 50);
 * 
 * describe('The text "false : 0" written in black on a gray background.');
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
 * // Create a string variable.
 * let original = '12.34';
 * 
 * // Convert the string to an integer.
 * let converted = int(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Display the original and converted values.
 * text(`${original} ≈ ${converted}`, 50, 50);
 * 
 * describe('The text "12.34 ≈ 12" written in black on a gray background.');
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
 * // Create a decimal number variable.
 * let original = 12.34;
 * 
 * // Convert the decimal number to an integer.
 * let converted = int(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Display the original and converted values.
 * text(`${original} ≈ ${converted}`, 50, 50);
 * 
 * describe('The text "12.34 ≈ 12" written in black on a gray background.');
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
 * // Create an array of strings.
 * let original = ['60', '30', '15'];
 * 
 * // Convert the strings to integers.
 * let diameters = int(original);
 * 
 * for (let d of diameters) {
 * // Draw a circle.
 * circle(50, 50, d);
 * }
 * 
 * describe('Three white, concentric circles on a gray background.');
 * }
 * </code>
 * </div>
 */
function int(n: string | boolean | number): number;

/**
 * @param values to convert.
 * @return converted numbers.
 */
function int(ns: Array): number[];

/**
 * Converts a `Boolean` or `Number` to `String`.`str()` converts values to strings. See the
 * String reference page for guidance on using
 * template literals instead.The parameter, `n`, is the value to convert. If `n` is a Boolean, as in
 * `str(false)` or `str(true)`, then the value will be returned as a string,
 * as in `'false'` or `'true'`. If `n` is a number, as in `str(123)`, then its
 * value will be returned as a string, as in `'123'`. If an array is passed,
 * as in `str([12.34, 56.78])`, then an array of strings will be returned.
 *
 * @param value to convert.
 * @return converted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a Boolean variable.
 * let original = false;
 * 
 * // Convert the Boolean to a string.
 * let converted = str(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} : ${converted}`, 50, 50);
 * 
 * describe('The text "false : false" written in black on a gray background.');
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
 * // Create a number variable.
 * let original = 123;
 * 
 * // Convert the number to a string.
 * let converted = str(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} = ${converted}`, 50, 50);
 * 
 * describe('The text "123 = 123" written in black on a gray background.');
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
 * // Create an array of numbers.
 * let original = [12, 34, 56];
 * 
 * // Convert the numbers to strings.
 * let strings = str(original);
 * 
 * // Create an empty string variable.
 * let final = '';
 * 
 * // Concatenate all the strings.
 * for (let s of strings) {
 * final += s;
 * }
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the concatenated string.
 * text(final, 50, 50);
 * 
 * describe('The text "123456" written in black on a gray background.');
 * }
 * </code>
 * </div>
 */
function str(n: string | boolean | number): string;

/**
 * Converts a `String` or `Number` to a `Boolean`.`boolean()` converts values to `true` or `false`.The parameter, `n`, is the value to convert. If `n` is a string, then
 * `boolean('true')` will return `true` and every other string value will
 * return `false`. If `n` is a number, then `boolean(0)` will return `false`
 * and every other numeric value will return `true`. If an array is passed, as
 * `in boolean([0, 1, 'true', 'blue'])`, then an array of Boolean values will
 * be returned.
 *
 * @param value to convert.
 * @return converted Boolean value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a number variable.
 * let original = 0;
 * 
 * // Convert the number to a Boolean value.
 * let converted = boolean(original);
 * 
 * // Style the circle based on the converted value.
 * if (converted === true) {
 * fill('blue');
 * } else {
 * fill('red');
 * }
 * 
 * // Draw the circle.
 * circle(50, 50, 40);
 * 
 * describe('A red circle on a gray background.');
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
 * // Create a string variable.
 * let original = 'true';
 * 
 * // Convert the string to a Boolean value.
 * let converted = boolean(original);
 * 
 * // Style the circle based on the converted value.
 * if (converted === true) {
 * fill('blue');
 * } else {
 * fill('red');
 * }
 * 
 * // Draw the circle.
 * circle(50, 50, 40);
 * 
 * describe('A blue circle on a gray background.');
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
 * // Create an array of values.
 * let original = [0, 'hi', 123, 'true'];
 * 
 * // Convert the array to a Boolean values.
 * let converted = boolean(original);
 * 
 * // Iterate over the array of converted Boolean values.
 * for (let i = 0; i < converted.length; i += 1) {
 * 
 * // Style the circle based on the converted value.
 * if (converted[i] === true) {
 * fill('blue');
 * } else {
 * fill('red');
 * }
 * 
 * // Calculate the x-coordinate.
 * let x = (i + 1) * 20;
 * 
 * // Draw the circle.
 * circle(x, 50, 15);
 * }
 * 
 * describe(
 * 'A row of circles on a gray background. The two circles on the left are red and the two on the right are blue.'
 * );
 * }
 * </code>
 * </div>
 */
function boolean(n: string | boolean | number): boolean;

/**
 * @param values to convert.
 * @return converted Boolean values.
 */
function boolean(ns: Array): boolean[];

/**
 * Converts a `Boolean`, `String`, or `Number` to its byte value.`byte()` converts a value to an integer (whole number) between -128 and
 * 127. Values greater than 127 wrap around while negative values are
 * unchanged. For example, 128 becomes -128 and -129 remains the same.The parameter, `n`, is the value to convert. If `n` is a Boolean, as in
 * `byte(false)` or `byte(true)`, the number 0 (`false`) or 1 (`true`) will be
 * returned. If `n` is a string or number, as in `byte('256')` or `byte(256)`,
 * then the byte value will be returned. Decimal values are ignored. If an
 * array is passed, as in `byte([true, 123, '456'])`, then an array of byte
 * values will be returned.Note: If a value can't be converted to a number, as in `byte('giraffe')`,
 * then the value `NaN` (not a number) will be returned.
 *
 * @param value to convert.
 * @return converted byte value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a Boolean variable.
 * let original = true;
 * 
 * // Convert the Boolean to its byte value.
 * let converted = byte(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} : ${converted}`, 50, 50);
 * 
 * describe('The text "true : 1" written in black on a gray background.');
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
 * // Create a string variable.
 * let original = '256';
 * 
 * // Convert the string to its byte value.
 * let converted = byte(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} : ${converted}`, 50, 50);
 * 
 * describe('The text "256 : 0" written in black on a gray background.');
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
 * // Create a number variable.
 * let original = 256;
 * 
 * // Convert the number to its byte value.
 * let converted = byte(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} : ${converted}`, 50, 50);
 * 
 * describe('The text "256 : 0" written in black on a gray background.');
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
 * // Create an array of values.
 * let original = [false, '64', 383];
 * 
 * // Convert the array elements to their byte values.
 * let converted = byte(original);
 * 
 * // Iterate over the converted array elements.
 * for (let i = 0; i < converted.length; i += 1) {
 * 
 * // Style the circle.
 * fill(converted[i]);
 * 
 * // Calculate the x-coordinate.
 * let x = (i + 1) * 25;
 * 
 * // Draw the circle.
 * circle(x, 50, 20);
 * }
 * 
 * describe(
 * 'Three gray circles on a gray background. The circles get lighter from left to right.'
 * );
 * }
 * </code>
 * </div>
 */
function byte(n: string | boolean | number): number;

/**
 * @param values to convert.
 * @return converted byte values.
 */
function byte(ns: Array): number[];

/**
 * Converts a `Number` or `String` to a single-character `String`.`char()` converts numbers to their single-character string representations.The parameter, `n`, is the value to convert. If a number is passed, as in
 * `char(65)`, the corresponding single-character string is returned. If a
 * string is passed, as in `char('65')`, the string is converted to an integer
 * (whole number) and the corresponding single-character string is returned.
 * If an array is passed, as in `char([65, 66, 67])`, an array of
 * single-character strings is returned.See MDN
 * for more information about conversions.
 *
 * @param value to convert.
 * @return converted single-character string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a number variable.
 * let original = 65;
 * 
 * // Convert the number to a char.
 * let converted = char(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} : ${converted}`, 50, 50);
 * 
 * describe('The text "65 : A" written in black on a gray background.');
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
 * // Create a string variable.
 * let original = '65';
 * 
 * // Convert the string to a char.
 * let converted = char(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} : ${converted}`, 50, 50);
 * 
 * describe('The text "65 : A" written in black on a gray background.');
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
 * // Create an array of numbers.
 * let original = ['65', 66, '67'];
 * 
 * // Convert the string to a char.
 * let converted = char(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Iterate over elements of the converted array.
 * for (let i = 0; i < converted.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 25;
 * 
 * // Display the original and converted values.
 * text(`${original[i]} : ${converted[i]}`, 50, y);
 * }
 * 
 * describe(
 * 'The text "65 : A", "66 : B", and "67 : C" written on three separate lines. The text is in black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function char(n: string | number): string;

/**
 * @param values to convert.
 * @return converted single-character strings.
 */
function char(ns: Array): string[];

/**
 * Converts a single-character `String` to a `Number`.`unchar()` converts single-character strings to their corresponding
 * integer (whole number).The parameter, `n`, is the character to convert. For example,
 * `unchar('A')`, returns the number 65. If an array is passed, as in
 * `unchar(['A', 'B', 'C'])`, an array of integers is returned.
 *
 * @param value to convert.
 * @return converted number.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a string variable.
 * let original = 'A';
 * 
 * // Convert the string to a number.
 * let converted = unchar(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} : ${converted}`, 50, 50);
 * 
 * describe('The text "A : 65" written in black on a gray background.');
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
 * // Create an array of characters.
 * let original = ['A', 'B', 'C'];
 * 
 * // Convert the string to a number.
 * let converted = unchar(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Iterate over elements of the converted array.
 * for (let i = 0; i < converted.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 25;
 * 
 * // Display the original and converted values.
 * text(`${original[i]} : ${converted[i]}`, 50, y);
 * }
 * 
 * describe(
 * 'The text "A : 65", "B : 66", and "C :67" written on three separate lines. The text is in black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function unchar(n: string): number;

/**
 * @param values to convert.
 * @return converted numbers.
 */
function unchar(ns: string[]): number[];

/**
 * Converts a `Number` to a `String` with its hexadecimal value.`hex()` converts a number to a string with its hexadecimal number value.
 * Hexadecimal (hex) numbers are base-16, which means there are 16 unique
 * digits. Hex extends the numbers 0–9 with the letters A–F. For example, the
 * number `11` (eleven) in base-10 is written as the letter `B` in hex.The first parameter, `n`, is the number to convert. For example, `hex(20)`,
 * returns the string `'00000014'`. If an array is passed, as in
 * `hex([1, 10, 100])`, an array of hexadecimal strings is returned.The second parameter, `digits`, is optional. If a number is passed, as in
 * `hex(20, 2)`, it sets the number of hexadecimal digits to display. For
 * example, calling `hex(20, 2)` returns the string `'14'`.
 *
 * @param value to convert.
 * @param number of digits to include.
 * @return converted hexadecimal value.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a number variable.
 * let original = 20;
 * 
 * // Convert the number to a hex string.
 * let converted = hex(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Display the original and converted values.
 * text(`${original} = ${converted}`, 50, 50);
 * 
 * describe('The text "20 = 00000014" written in black on a gray background.');
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
 * // Create a number variable.
 * let original = 20;
 * 
 * // Convert the number to a hex string.
 * // Only display two hex digits.
 * let converted = hex(original, 2);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} = ${converted}`, 50, 50);
 * 
 * describe('The text "20 = 14" written in black on a gray background.');
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
 * // Create an array of numbers.
 * let original = [1, 10, 100];
 * 
 * // Convert the numbers to hex strings.
 * // Only use two hex digits.
 * let converted = hex(original, 2);
 * 
 * // Style the text.
 * textAlign(RIGHT, CENTER);
 * textSize(16);
 * 
 * // Iterate over the converted values.
 * for (let i = 0; i < converted.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 25;
 * 
 * // Display the original and converted values.
 * text(`${ original[i]} = ${converted[i]}`, 75, y);
 * }
 * 
 * describe(
 * 'The text "1 = 01", "10 = 0A", and "100 = 64" written on three separate lines. The text is in black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function hex(n: number, digits?: number): string;

/**
 * @param values to convert.
 * @return converted hexadecimal values.
 */
function hex(ns: number[], digits?: number): string[];

/**
 * Converts a `String` with a hexadecimal value to a  `Number`.`unhex()` converts a string with its hexadecimal number value to a number.
 * Hexadecimal (hex) numbers are base-16, which means there are 16 unique
 * digits. Hex extends the numbers 0–9 with the letters A–F. For example, the
 * number `11` (eleven) in base-10 is written as the letter `B` in hex.The first parameter, `n`, is the hex string to convert. For example,
 * `unhex('FF')`, returns the number 255. If an array is passed, as in
 * `unhex(['00', '80', 'FF'])`, an array of numbers is returned.
 *
 * @param value to convert.
 * @return converted number.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a a hex string variable
 * let original = 'FF';
 * 
 * // Convert the hex string to a number.
 * let converted = unhex(original);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(16);
 * 
 * // Display the original and converted values.
 * text(`${original} = ${converted}`, 50, 50);
 * 
 * describe('The text "FF = 255" written in black on a gray background.');
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
 * // Create an array of numbers.
 * let original = ['00', '80', 'FF'];
 * 
 * // Convert the numbers to hex strings.
 * // Only use two hex digits.
 * let converted = unhex(original, 2);
 * 
 * // Style the text.
 * textAlign(RIGHT, CENTER);
 * textSize(16);
 * 
 * // Iterate over the converted values.
 * for (let i = 0; i < converted.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 25;
 * 
 * // Display the original and converted values.
 * text(`${ original[i]} = ${converted[i]}`, 80, y);
 * }
 * 
 * describe(
 * 'The text "00 = 0", "80 = 128", and "FF = 255" written on three separate lines. The text is in black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function unhex(n: string): number;

/**
 * @param values to convert.
 * @return converted numbers.
 */
function unhex(ns: string[]): number[];

}

export default function conversion(p5: any, fn: any): void;
