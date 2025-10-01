// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Converts a `Number` into a `String` with a given number of digits.`nf()` converts numbers such as `123.45` into strings formatted with a set
 * number of digits, as in `'123.4500'`.The first parameter, `num`, is the number to convert to a string. For
 * example, calling `nf(123.45)` returns the string `'123.45'`. If an array of
 * numbers is passed, as in `nf([123.45, 67.89])`, an array of formatted
 * strings will be returned.The second parameter, `left`, is optional. If a number is passed, as in
 * `nf(123.45, 4)`, it sets the minimum number of digits to include to the
 * left of the decimal place. If `left` is larger than the number of digits in
 * `num`, then unused digits will be set to 0. For example, calling
 * `nf(123.45, 4)` returns the string `'0123.45'`.The third parameter, `right`, is also optional. If a number is passed, as
 * in `nf(123.45, 4, 1)`, it sets the minimum number of digits to include to
 * the right of the decimal place. If `right` is smaller than the number of
 * decimal places in `num`, then `num` will be rounded to the given number of
 * decimal places. For example, calling `nf(123.45, 4, 1)` returns the string
 * `'0123.5'`. If right is larger than the number of decimal places in `num`,
 * then unused decimal places will be set to 0. For example, calling
 * `nf(123.45, 4, 3)` returns the string `'0123.450'`.When the number is negative, for example, calling `nf(-123.45, 5, 2)`
 * returns the string `'-00123.45'`.
 *
 * @param number to format.
 * @param number of digits to include to the left of
 * the decimal point.
 * @param number of digits to include to the right
 * of the decimal point.
 * @return formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textSize(16);
 * 
 * // Create a number variable.
 * let number = 123.45;
 * 
 * // Display the number as a string.
 * let formatted = nf(number);
 * text(formatted, 20, 20);
 * 
 * let negative = nf(-number, 4, 2);
 * text(negative, 20, 40);
 * 
 * // Display the number with four digits
 * // to the left of the decimal.
 * let left = nf(number, 4);
 * text(left, 20, 60);
 * 
 * // Display the number with four digits
 * // to the left of the decimal and one
 * // to the right.
 * let right = nf(number, 4, 1);
 * text(right, 20, 80);
 * 
 * describe(
 * 'The numbers "123.45", "-0123.45", "0123.45", and "0123.5" written on four separate lines. The text is in black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function nf(num: number | string, left?: number | string, right?: number | string): string;

/**
 * @param numbers to format.
 * @return formatted strings.
 */
function nf(nums: number[], left?: number | string, right?: number | string): string[];

/**
 * Converts a `Number` into a `String` with commas to mark units of 1,000.`nfc()` converts numbers such as 12345 into strings formatted with commas
 * to mark the thousands place, as in `'12,345'`.The first parameter, `num`, is the number to convert to a string. For
 * example, calling `nfc(12345)` returns the string `'12,345'`.The second parameter, `right`, is optional. If a number is passed, as in
 * `nfc(12345, 1)`, it sets the minimum number of digits to include to the
 * right of the decimal place. If `right` is smaller than the number of
 * decimal places in `num`, then `num` will be rounded to the given number of
 * decimal places. For example, calling `nfc(12345.67, 1)` returns the string
 * `'12,345.7'`. If `right` is larger than the number of decimal places in
 * `num`, then unused decimal places will be set to 0. For example, calling
 * `nfc(12345.67, 3)` returns the string `'12,345.670'`.
 *
 * @param number to format.
 * @param number of digits to include to the right
 * of the decimal point.
 * @return formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textAlign(LEFT, CENTER);
 * textSize(16);
 * 
 * // Create a number variable.
 * let number = 12345;
 * 
 * // Display the number as a string.
 * let commas = nfc(number);
 * text(commas, 15, 33);
 * 
 * // Display the number with four digits
 * // to the left of the decimal.
 * let decimals = nfc(number, 2);
 * text(decimals, 15, 67);
 * 
 * describe(
 * 'The numbers "12,345" and "12,345.00" written on separate lines. The text is in black on a gray background.'
 * );
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
 * let numbers = [12345, 6789];
 * 
 * // Convert the numbers to formatted strings.
 * let formatted = nfc(numbers);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Iterate over the array.
 * for (let i = 0; i < formatted.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 33;
 * 
 * // Display the original and formatted numbers.
 * text(`${numbers[i]} : ${formatted[i]}`, 50, y);
 * }
 * 
 * describe(
 * 'The text "12345 : 12,345" and "6789 : 6,789" written on two separate lines. The text is in black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function nfc(num: number | string, right?: number | string): string;

/**
 * @param numbers to format.
 * @return formatted strings.
 */
function nfc(nums: number[], right?: number | string): string[];

/**
 * Converts a `Number` into a `String` with a plus or minus sign.`nfp()` converts numbers such as 123 into strings formatted with a `+` or
 * `-` symbol to mark whether they're positive or negative, as in `'+123'`.The first parameter, `num`, is the number to convert to a string. For
 * example, calling `nfp(123.45)` returns the string `'+123.45'`. If an array
 * of numbers is passed, as in `nfp([123.45, -6.78])`, an array of formatted
 * strings will be returned.The second parameter, `left`, is optional. If a number is passed, as in
 * `nfp(123.45, 4)`, it sets the minimum number of digits to include to the
 * left of the decimal place. If `left` is larger than the number of digits in
 * `num`, then unused digits will be set to 0. For example, calling
 * `nfp(123.45, 4)` returns the string `'+0123.45'`.The third parameter, `right`, is also optional. If a number is passed, as
 * in `nfp(123.45, 4, 1)`, it sets the minimum number of digits to include to
 * the right of the decimal place. If `right` is smaller than the number of
 * decimal places in `num`, then `num` will be rounded to the given number of
 * decimal places.  For example, calling `nfp(123.45, 4, 1)` returns the
 * string `'+0123.5'`. If `right` is larger than the number of decimal places
 * in `num`, then unused decimal places will be set to 0.  For example,
 * calling `nfp(123.45, 4, 3)` returns the string `'+0123.450'`.
 *
 * @param number to format.
 * @param number of digits to include to the left of the
 * decimal point.
 * @param number of digits to include to the right of the
 * decimal point.
 * @return formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create number variables.
 * let positive = 123;
 * let negative = -123;
 * 
 * // Convert the positive number to a formatted string.
 * let p = nfp(positive);
 * 
 * // Convert the negative number to a formatted string
 * // with four digits to the left of the decimal
 * // and two digits to the right of the decimal.
 * let n = nfp(negative, 4, 2);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Display the original and formatted numbers.
 * text(`${positive} : ${p}`, 50, 33);
 * text(`${negative} : ${n}`, 50, 67);
 * 
 * describe(
 * 'The text "123 : +123" and "-123 : -123.00" written on separate lines. The text is in black on a gray background.'
 * );
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
 * // Create number variables.
 * let numbers = [123, -4.56];
 * 
 * // Convert the numbers to formatted strings
 * // with four digits to the left of the decimal
 * // and one digit to the right of the decimal.
 * let formatted = nfp(numbers, 4, 1);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textSize(14);
 * 
 * // Iterate over the array.
 * for (let i = 0; i < formatted.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 33;
 * 
 * // Display the original and formatted numbers.
 * text(`${numbers[i]} : ${formatted[i]}`, 50, y);
 * }
 * 
 * describe(
 * 'The text "123 : +0123.0" and "-4.56 : 00-4.6" written on separate lines. The text is in black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function nfp(num: number, left?: number, right?: number): string;

/**
 * @param numbers to format.
 * @return formatted strings.
 */
function nfp(nums: number[], left?: number, right?: number): string[];

/**
 * Converts a positive `Number` into a `String` with an extra space in front.`nfs()` converts positive numbers such as 123.45 into strings formatted
 * with an extra space in front, as in ' 123.45'. Doing so can be helpful for
 * aligning positive and negative numbers.The first parameter, `num`, is the number to convert to a string. For
 * example, calling `nfs(123.45)` returns the string `' 123.45'`.The second parameter, `left`, is optional. If a number is passed, as in
 * `nfs(123.45, 4)`, it sets the minimum number of digits to include to the
 * left of the decimal place. If `left` is larger than the number of digits in
 * `num`, then unused digits will be set to 0. For example, calling
 * `nfs(123.45, 4)` returns the string `' 0123.45'`.The third parameter, `right`, is also optional. If a number is passed, as
 * in `nfs(123.45, 4, 1)`, it sets the minimum number of digits to include to
 * the right of the decimal place. If `right` is smaller than the number of
 * decimal places in `num`, then `num` will be rounded to the given number of
 * decimal places.  For example, calling `nfs(123.45, 4, 1)` returns the
 * string `' 0123.5'`. If `right` is larger than the number of decimal places
 * in `num`, then unused decimal places will be set to 0.  For example,
 * calling `nfs(123.45, 4, 3)` returns the string `' 0123.450'`.
 *
 * @param number to format.
 * @param number of digits to include to the left of the
 * decimal point.
 * @param number of digits to include to the right of the
 * decimal point.
 * @return formatted string.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create number variables.
 * let positive = 123;
 * let negative = -123;
 * 
 * // Convert the positive number to a formatted string.
 * let formatted = nfs(positive);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(16);
 * 
 * // Display the negative number and the formatted positive number.
 * text(negative, 50, 33);
 * text(formatted, 50, 67);
 * 
 * describe(
 * 'The numbers -123 and 123 written on separate lines. The numbers align vertically. The text is in black on a gray background.'
 * );
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
 * let number = 123.45;
 * 
 * // Convert the positive number to a formatted string.
 * // Use four digits to the left of the decimal and
 * // one digit to the right.
 * let formatted = nfs(number, 4, 1);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(16);
 * 
 * // Display a negative version of the number and
 * // the formatted positive version.
 * text('-0123.5', 50, 33);
 * text(formatted, 50, 67);
 * 
 * describe(
 * 'The numbers "-0123.5" and "0123.5" written on separate lines. The numbers align vertically. The text is in black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function nfs(num: number, left?: number, right?: number): string;

/**
 * @param numbers to format.
 * @return formatted strings.
 */
function nfs(nums: Array, left?: number, right?: number): string[];

/**
 * Splits a `String` into pieces and returns an array containing the pieces.`splitTokens()` is an enhanced version of
 * split(). It can split a string when any characters
 * from a list are detected.The first parameter, `value`, is the string to split.The second parameter, `delim`, is optional. It sets the character(s) that
 * should be used to split the string. `delim` can be a single string, as in
 * `splitTokens('rock...paper...scissors...shoot', '...')`, or an array of
 * strings, as in
 * `splitTokens('rock;paper,scissors...shoot, [';', ',', '...'])`. By default,
 * if no `delim` characters are specified, then any whitespace character is
 * used to split. Whitespace characters include tab (`\t`), line feed (`\n`),
 * carriage return (`\r`), form feed (`\f`), and space.
 *
 * @deprecated This will be removed in a future version of p5.js to make way for a new, friendlier version :)
 * @param string to split.
 * @param character(s) to use for splitting the string.
 * @return separated strings.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a string variable.
 * let string = 'rock paper scissors shoot';
 * 
 * // Split the string at each space.
 * let words = splitTokens(string);
 * 
 * // Print the array to the console.
 * print(words);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(12);
 * 
 * // Iterate over the words array.
 * for (let i = 0; i < words.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 20;
 * 
 * // Display the word.
 * text(words[i], 50, y);
 * }
 * 
 * describe(
 * 'The words "rock", "paper", "scissors", and "shoot" written on separate lines. The text is black on a gray background.'
 * );
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
 * let string = 'rock...paper...scissors...shoot';
 * 
 * // Split the string at each ...
 * let words = splitTokens(string, '...');
 * 
 * // Print the array to the console.
 * print(words);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(12);
 * 
 * // Iterate over the words array.
 * for (let i = 0; i < words.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 20;
 * 
 * // Display the word.
 * text(words[i], 50, y);
 * }
 * 
 * describe(
 * 'The words "rock", "paper", "scissors", and "shoot" written on separate lines. The text is black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 * 
 * <div class='notest'>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a string variable.
 * let string = 'rock;paper,scissors...shoot';
 * 
 * // Split the string at each semicolon, comma, or ...
 * let words = splitTokens(string, [';', ',', '...']);
 * 
 * // Print the array to the console.
 * print(words);
 * 
 * // Style the text.
 * textAlign(CENTER, CENTER);
 * textFont('Courier New');
 * textSize(12);
 * 
 * // Iterate over the words array.
 * for (let i = 0; i < words.length; i += 1) {
 * 
 * // Calculate the y-coordinate.
 * let y = (i + 1) * 20;
 * 
 * // Display the word.
 * text(words[i], 50, y);
 * }
 * 
 * describe(
 * 'The words "rock", "paper", "scissors", and "shoot" written on separate lines. The text is black on a gray background.'
 * );
 * }
 * </code>
 * </div>
 */
function splitTokens(value: string, delim?: string): string[];

/**
 * Shuffles the elements of an array.The first parameter, `array`, is the array to be shuffled. For example,
 * calling `shuffle(myArray)` will shuffle the elements of `myArray`. By
 * default, the original array won’t be modified. Instead, a copy will be
 * created, shuffled, and returned.The second parameter, `modify`, is optional. If `true` is passed, as in
 * `shuffle(myArray, true)`, then the array will be shuffled in place without
 * making a copy.
 *
 * @param array to shuffle.
 * @param if `true`, shuffle the original array in place. Defaults to `false`.
 * @return shuffled array.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create an array of colors.
 * let colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
 * 
 * // Create a shuffled copy of the array.
 * let shuffledColors = shuffle(colors);
 * 
 * // Draw  a row of circles using the original array.
 * for (let i = 0; i < colors.length; i += 1) {
 * // Calculate the x-coordinate.
 * let x = (i + 1) * 12.5;
 * 
 * // Style the circle.
 * let c = colors[i];
 * fill(c);
 * 
 * // Draw the circle.
 * circle(x, 33, 10);
 * }
 * 
 * // Draw  a row of circles using the original array.
 * for (let i = 0; i < shuffledColors.length; i += 1) {
 * // Calculate the x-coordinate.
 * let x = (i + 1) * 12.5;
 * 
 * // Style the circle.
 * let c = shuffledColors[i];
 * fill(c);
 * 
 * // Draw the circle.
 * circle(x, 67, 10);
 * }
 * 
 * describe(
 * 'Two rows of circles on a gray background. The top row follows the color sequence ROYGBIV. The bottom row has all the same colors but they are shuffled.'
 * );
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
 * // Create an array of colors.
 * let colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
 * 
 * // Shuffle the array.
 * shuffle(colors, true);
 * 
 * // Draw  a row of circles using the original array.
 * for (let i = 0; i < colors.length; i += 1) {
 * // Calculate the x-coordinate.
 * let x = (i + 1) * 12.5;
 * 
 * // Style the circle.
 * let c = colors[i];
 * fill(c);
 * 
 * // Draw the circle.
 * circle(x, 50, 10);
 * }
 * 
 * describe(
 * 'A row of colorful circles on a gray background. Their sequence changes each time the sketch runs.'
 * );
 * }
 * </code>
 * </div>
 */
function shuffle(array: Array, bool?: boolean): Array;

}

export default function utility_functions(p5: any, fn: any): void;
