// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Draws text to the canvas.The first parameter, `str`, is the text to be drawn. The second and third
 * parameters, `x` and `y`, set the coordinates of the text's bottom-left
 * corner. See textAlign() for other ways to
 * align text.The fourth and fifth parameters, `maxWidth` and `maxHeight`, are optional.
 * They set the dimensions of the invisible rectangle containing the text. By
 * default, they set its  maximum width and height. See
 * rectMode() for other ways to define the
 * rectangular text box. Text will wrap to fit within the text box. Text
 * outside of the box won't be drawn.Text can be styled a few ways. Call the fill()
 * function to set the text's fill color. Call
 * stroke() and
 * strokeWeight() to set the text's outline.
 * Call textSize() and
 * textFont() to set the text's size and font,
 * respectively.Note: `WEBGL` mode only supports fonts loaded with
 * loadFont(). Calling
 * stroke() has no effect in `WEBGL` mode.
 *
 * @param text to be displayed.
 * @param x-coordinate of the text box.
 * @param y-coordinate of the text box.
 * @param maximum width of the text box. See
 * <a href="#/p5/rectMode">rectMode()</a> for
 * other options.
 * @param maximum height of the text box. See
 * <a href="#/p5/rectMode">rectMode()</a> for
 * other options.
 * @for p5
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(200);
 * text('hi', 50, 50);
 * 
 * describe('The text "hi" written in black in the middle of a gray square.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background('skyblue');
 * textSize(100);
 * text('🌈', 0, 100);
 * 
 * describe('A rainbow in a blue sky.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * textSize(32);
 * fill(255);
 * stroke(0);
 * strokeWeight(4);
 * text('hi', 50, 50);
 * 
 * describe('The text "hi" written in white with a black outline.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background('black');
 * textSize(22);
 * fill('yellow');
 * text('rainbows', 6, 20);
 * fill('cornflowerblue');
 * text('rainbows', 6, 45);
 * fill('tomato');
 * text('rainbows', 6, 70);
 * fill('limegreen');
 * text('rainbows', 6, 95);
 * 
 * describe('The text "rainbows" written on several lines, each in a different color.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(200);
 * let s = 'The quick brown fox jumps over the lazy dog.';
 * text(s, 10, 10, 70, 80);
 * 
 * describe('The sample text "The quick brown fox..." written in black across several lines.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(200);
 * rectMode(CENTER);
 * let s = 'The quick brown fox jumps over the lazy dog.';
 * text(s, 50, 50, 70, 80);
 * 
 * describe('The sample text "The quick brown fox..." written in black across several lines.');
 * }
 * </code>
 * </div>
 * @example <div modernizr='webgl'>
 * <code>
 * let font;
 * 
 * async function setup() {
 * createCanvas(100, 100, WEBGL);
 * font = await loadFont('assets/inconsolata.otf');
 * textFont(font);
 * textSize(32);
 * textAlign(CENTER, CENTER);
 * }
 * 
 * function draw() {
 * background(200);
 * rotateY(frameCount / 30);
 * text('p5*js', 0, 0);
 * 
 * describe('The text "p5*js" written in white and spinning in 3D.');
 * }
 * </code>
 * </div>
 */
function text(str: string | object | Array | number | boolean, x: number, y: number, maxWidth?: number, maxHeight?: number): void;

/**
 * Sets the way text is aligned when text() is called.By default, calling `text('hi', 10, 20)` places the bottom-left corner of
 * the text's bounding box at (10, 20).The first parameter, `horizAlign`, changes the way
 * text() interprets x-coordinates. By default, the
 * x-coordinate sets the left edge of the bounding box. `textAlign()` accepts
 * the following values for `horizAlign`: `LEFT`, `CENTER`, or `RIGHT`.The second parameter, `vertAlign`, is optional. It changes the way
 * text() interprets y-coordinates. By default, the
 * y-coordinate sets the bottom edge of the bounding box. `textAlign()`
 * accepts the following values for `vertAlign`: `TOP`, `BOTTOM`, `CENTER`,
 * or `BASELINE`.
 *
 * @for p5
 * @param horizontal alignment
 * @param vertical alignment
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Draw a vertical line.
 * strokeWeight(0.5);
 * line(50, 0, 50, 100);
 * 
 * // Top line.
 * textSize(16);
 * textAlign(RIGHT);
 * text('ABCD', 50, 30);
 * 
 * // Middle line.
 * textAlign(CENTER);
 * text('EFGH', 50, 50);
 * 
 * // Bottom line.
 * textAlign(LEFT);
 * text('IJKL', 50, 70);
 * 
 * describe('The letters ABCD displayed at top-left, EFGH at center, and IJKL at bottom-right. A vertical line divides the canvas in half.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * strokeWeight(0.5);
 * 
 * // First line.
 * line(0, 12, width, 12);
 * textAlign(CENTER, TOP);
 * text('TOP', 50, 12);
 * 
 * // Second line.
 * line(0, 37, width, 37);
 * textAlign(CENTER, CENTER);
 * text('CENTER', 50, 37);
 * 
 * // Third line.
 * line(0, 62, width, 62);
 * textAlign(CENTER, BASELINE);
 * text('BASELINE', 50, 62);
 * 
 * // Fourth line.
 * line(0, 97, width, 97);
 * textAlign(CENTER, BOTTOM);
 * text('BOTTOM', 50, 97);
 * 
 * describe('The words "TOP", "CENTER", "BASELINE", and "BOTTOM" each drawn relative to a horizontal line. Their positions demonstrate different vertical alignments.');
 * }
 * </code>
 * </div>
 */
function textAlign(horizAlign: LEFT | CENTER | RIGHT, vertAlign?: TOP | BOTTOM | CENTER | BASELINE): void;

/**
 * Returns the ascent of the text.The `textAscent()` function calculates the distance from the baseline to the
 * highest point of the current font. This value represents the ascent, which is essential
 * for determining the overall height of the text along with `textDescent()`. If
 * a text string is provided as an argument, the ascent is calculated based on that specific
 * string; otherwise, the ascent of the current font is returned.
 *
 * @for p5
 * @param (Optional) The text string for which to calculate the ascent.
 * If omitted, the function returns the ascent for the current font.
 * @returns The ascent value in pixels.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(400, 300);
 * background(220);
 * 
 * textSize(48);
 * textAlign(LEFT, BASELINE);
 * textFont('Georgia');
 * 
 * let s = "Hello, p5.js!";
 * let x = 50, y = 150;
 * 
 * fill(0);
 * text(s, x, y);
 * 
 * // Get the ascent of the current font
 * let asc = textAscent();
 * 
 * // Draw a red line at the baseline and a blue line at the ascent position
 * stroke('red');
 * line(x, y, x + 200, y); // Baseline
 * stroke('blue');
 * line(x, y - asc, x + 200, y - asc); // Ascent (top of text)
 * 
 * noStroke();
 * fill(0);
 * textSize(16);
 * text("textAscent: " + asc.toFixed(2) + " pixels", x, y - asc - 10);
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * let font;
 * 
 * async function setup()  {
 * font = await loadFont('assets/inconsolata.otf');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textFont(font);
 * 
 * // Different for each font.
 * let fontScale = 0.8;
 * 
 * let baseY = 75;
 * strokeWeight(0.5);
 * 
 * // Draw small text.
 * textSize(24);
 * text('dp', 0, baseY);
 * 
 * // Draw baseline and ascent.
 * let a = textAscent() * fontScale;
 * line(0, baseY, 23, baseY);
 * line(23, baseY - a, 23, baseY);
 * 
 * // Draw large text.
 * textSize(48);
 * text('dp', 45, baseY);
 * 
 * // Draw baseline and ascent.
 * a = textAscent() * fontScale;
 * line(45, baseY, 91, baseY);
 * line(91, baseY - a, 91, baseY);
 * 
 * describe('The letters "dp" written twice in different sizes. Each version has a horizontal baseline. A vertical line extends upward from each baseline to the top of the "d".');
 * }
 * </code>
 * </div>
 */
function textAscent(txt?: string): number;

/**
 * Returns the descent of the text.The `textDescent()` function calculates the distance from the baseline to the
 * lowest point of the current font. This value represents the descent, which, when combined
 * with the ascent (from `textAscent()`), determines the overall vertical span of the text.
 * If a text string is provided as an argument, the descent is calculated based on that specific string;
 * otherwise, the descent of the current font is returned.
 *
 * @for p5
 * @param (Optional) The text string for which to calculate the descent.
 * If omitted, the function returns the descent for the current font.
 * @returns The descent value in pixels.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(400, 300);
 * background(220);
 * 
 * textSize(48);
 * textAlign(LEFT, BASELINE);
 * textFont('Georgia');
 * 
 * let s = "Hello, p5.js!";
 * let x = 50, y = 150;
 * 
 * fill(0);
 * text(s, x, y);
 * 
 * // Get the descent of the current font
 * let desc = textDescent();
 * 
 * // Draw a red line at the baseline and a blue line at the bottom of the text
 * stroke('red');
 * line(x, y, x + 200, y); // Baseline
 * stroke('blue');
 * line(x, y + desc, x + 200, y + desc); // Descent (bottom of text)
 * 
 * noStroke();
 * fill(0);
 * textSize(16);
 * text("textDescent: " + desc.toFixed(2) + " pixels", x, y + desc + 20);
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * let font;
 * 
 * async function setup()  {
 * font = await loadFont('assets/inconsolata.otf');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the font.
 * textFont(font);
 * 
 * // Different for each font.
 * let fontScale = 0.9;
 * 
 * let baseY = 75;
 * strokeWeight(0.5);
 * 
 * // Draw small text.
 * textSize(24);
 * text('dp', 0, baseY);
 * 
 * // Draw baseline and descent.
 * let d = textDescent() * fontScale;
 * line(0, baseY, 23, baseY);
 * line(23, baseY, 23, baseY + d);
 * 
 * // Draw large text.
 * textSize(48);
 * text('dp', 45, baseY);
 * 
 * // Draw baseline and descent.
 * d = textDescent() * fontScale;
 * line(45, baseY, 91, baseY);
 * line(91, baseY, 91, baseY + d);
 * 
 * describe('The letters "dp" written twice in different sizes. Each version has a horizontal baseline. A vertical line extends downward from each baseline to the bottom of the "p".');
 * }
 * </code>
 * </div>
 */
function textDescent(txt?: string): number;

/**
 * Sets the spacing between lines of text when
 * text() is called.Note: Spacing is measured in pixels.Calling `textLeading()` without an argument returns the current spacing.
 *
 * @for p5
 * @param The new text leading to apply, in pixels
 * @returns If no arguments are provided, the current text leading
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // "\n" starts a new line of text.
 * let lines = 'one\ntwo';
 * 
 * // Left.
 * text(lines, 10, 25);
 * 
 * // Right.
 * textLeading(30);
 * text(lines, 70, 25);
 * 
 * describe('The words "one" and "two" written on separate lines twice. The words on the left have less vertical spacing than the words on the right.');
 * }
 * </code>
 * </div>
 */
function textLeading(leading: number): number;

/**
 * Sets the font used by the text() function.The first parameter, `font`, sets the font. `textFont()` recognizes either
 * a p5.Font object or a string with the name of a
 * system font. For example, `'Courier New'`.The second parameter, `size`, is optional. It sets the font size in pixels.
 * This has the same effect as calling textSize().Note: `WEBGL` mode only supports fonts loaded with
 * loadFont().
 *
 * @param The font to apply
 * @param An optional text size to apply.
 * @for p5
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(200);
 * textFont('Courier New');
 * textSize(24);
 * text('hi', 35, 55);
 * 
 * describe('The text "hi" written in a black, monospace font on a gray background.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background('black');
 * fill('palegreen');
 * textFont('Courier New', 10);
 * text('You turn to the left and see a door. Do you enter?', 5, 5, 90, 90);
 * text('>', 5, 70);
 * 
 * describe('A text prompt from a game is written in a green, monospace font on a black background.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * background(200);
 * textFont('Verdana');
 * let currentFont = textFont();
 * text(currentFont, 25, 50);
 * 
 * describe('The text "Verdana" written in a black, sans-serif font on a gray background.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * let fontRegular;
 * let fontItalic;
 * let fontBold;
 * 
 * async function setup() {
 * createCanvas(100, 100);
 * fontRegular = await loadFont('assets/Regular.otf');
 * fontItalic = await loadFont('assets/Italic.ttf');
 * fontBold = await loadFont('assets/Bold.ttf');
 * 
 * background(200);
 * textFont(fontRegular);
 * text('I am Normal', 10, 30);
 * textFont(fontItalic);
 * text('I am Italic', 10, 50);
 * textFont(fontBold);
 * text('I am Bold', 10, 70);
 * 
 * describe('The statements "I am Normal", "I am Italic", and "I am Bold" written in black on separate lines. The statements have normal, italic, and bold fonts, respectively.');
 * }
 * </code>
 * </div>
 */
function textFont(font: p5.Font | string | object, size?: number): void;

/**
 * Sets or gets the current text size.The `textSize()` function is used to specify the size of the text
 * that will be rendered on the canvas. When called with an argument, it sets the
 * text size to the specified value (which can be a number representing pixels or a
 * CSS-style string, e.g., '32px', '2em'). When called without an argument, it
 * returns the current text size in pixels.
 *
 * @for p5
 * @param The size to set for the text.
 * @returns If no arguments are provided, the current text size in pixels.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(600, 200);
 * background(240);
 * 
 * // Set the text size to 48 pixels
 * textSize(48);
 * textAlign(CENTER, CENTER);
 * textFont("Georgia");
 * 
 * // Draw text using the current text size
 * fill(0);
 * text("Hello, p5.js!", width / 2, height / 2);
 * 
 * // Retrieve and display the current text size
 * let currentSize = textSize();
 * fill(50);
 * textSize(16);
 * text("Current text size: " + currentSize, width / 2, height - 20);
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Top.
 * textSize(12);
 * text('Font Size 12', 10, 30);
 * 
 * // Middle.
 * textSize(14);
 * text('Font Size 14', 10, 60);
 * 
 * // Bottom.
 * textSize(16);
 * text('Font Size 16', 10, 90);
 * 
 * describe('The text "Font Size 12" drawn small, "Font Size 14" drawn medium, and "Font Size 16" drawn large.');
 * }
 * </code>
 * </div>
 */
function textSize(size: number): number;

/**
 * @for p5
 * @returns The current text size in pixels.
 */
function textSize(): number;

/**
 * Sets the style for system fonts when
 * text() is called.The parameter, `style`, can be either `NORMAL`, `ITALIC`, `BOLD`, or
 * `BOLDITALIC`.`textStyle()` may be overridden by CSS styling. This function doesn't
 * affect fonts loaded with loadFont().
 *
 * @for p5
 * @param The style to use
 * @returns If no arguments are provided, the current style
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textSize(12);
 * textAlign(CENTER);
 * 
 * // First row.
 * textStyle(NORMAL);
 * text('Normal', 50, 15);
 * 
 * // Second row.
 * textStyle(ITALIC);
 * text('Italic', 50, 40);
 * 
 * // Third row.
 * textStyle(BOLD);
 * text('Bold', 50, 65);
 * 
 * // Fourth row.
 * textStyle(BOLDITALIC);
 * text('Bold Italic', 50, 90);
 * 
 * describe('The words "Normal" displayed normally, "Italic" in italic, "Bold" in bold, and "Bold Italic" in bold italics.');
 * }
 * </code>
 * </div>
 */
function textStyle(style: NORMAL | ITALIC | BOLD | BOLDITALIC): NORMAL | ITALIC | BOLD | BOLDITALIC;

/**
 * @for p5
 */
function textStyle(): NORMAL | BOLD | ITALIC | BOLDITALIC;

/**
 * Calculates the width of the given text string in pixels.The `textWidth()` function processes the provided text string to determine its tight bounding box
 * based on the current text properties such as font, textSize, and textStyle. Internally, it splits
 * the text into individual lines (if line breaks are present) and computes the bounding box for each
 * line using the renderer’s measurement functions. The final width is determined as the maximum width
 * among all these lines.For example, if the text contains multiple lines due to wrapping or explicit line breaks, textWidth()
 * will return the width of the longest line.
 *
 * @for p5
 * @param The text to measure
 * @returns The width of the text
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(200, 200);
 * background(220);
 * 
 * // Set text size and alignment
 * textSize(48);
 * textAlign(LEFT, TOP);
 * 
 * let myText = "Hello";
 * 
 * // Calculate the width of the text
 * let tw = textWidth(myText);
 * 
 * // Draw the text on the canvas
 * fill(0);
 * text(myText, 50, 50);
 * 
 * // Display the text width below
 * noStroke();
 * fill(0);
 * textSize(20);
 * text("Text width: " + tw, 10, 150);
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textSize(28);
 * strokeWeight(0.5);
 * 
 * // Calculate the text width.
 * let s = 'yoyo';
 * let w = textWidth(s);
 * 
 * // Display the text.
 * text(s, 22, 55);
 * 
 * // Underline the text.
 * line(22, 55, 22 + w, 55);
 * 
 * describe('The word "yoyo" underlined.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textSize(28);
 * strokeWeight(0.5);
 * 
 * // Calculate the text width.
 * // "\n" starts a new line.
 * let s = 'yo\nyo';
 * let w = textWidth(s);
 * 
 * // Display the text.
 * text(s, 22, 55);
 * 
 * // Underline the text.
 * line(22, 55, 22 + w, 55);
 * 
 * describe('The word "yo" written twice, one copy beneath the other. The words are divided by a horizontal line.');
 * }
 * </code>
 * </div>
 */
function textWidth(text: string): number;

/**
 * Sets the style for wrapping text when
 * text() is called.The parameter, `style`, can be one of the following values:`WORD` starts new lines of text at spaces. If a string of text doesn't
 * have spaces, it may overflow the text box and the canvas. This is the
 * default style.`CHAR` starts new lines as needed to stay within the text box.`textWrap()` only works when the maximum width is set for a text box. For
 * example, calling `text('Have a wonderful day', 0, 10, 100)` sets the
 * maximum width to 100 pixels.Calling `textWrap()` without an argument returns the current style.
 *
 * @for p5
 * @param The wrapping style to use
 * @returns If no arguments are provided, the current wrapping style
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textSize(20);
 * textWrap(WORD);
 * 
 * // Display the text.
 * text('Have a wonderful day', 0, 10, 100);
 * 
 * describe('The text "Have a wonderful day" written across three lines.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textSize(20);
 * textWrap(CHAR);
 * 
 * // Display the text.
 * text('Have a wonderful day', 0, 10, 100);
 * 
 * describe('The text "Have a wonderful day" written across two lines.');
 * }
 * </code>
 * </div>
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Style the text.
 * textSize(20);
 * textWrap(CHAR);
 * 
 * // Display the text.
 * text('祝你有美好的一天', 0, 10, 100);
 * 
 * describe('The text "祝你有美好的一天" written across two lines.');
 * }
 * </code>
 * </div>
 */
function textWrap(style: WORD | CHAR): CHAR | WORD;

/**
 * @for p5
 * @returns The current wrapping style
 */
function textWrap(): CHAR | WORD;

/**
 * Computes the tight bounding box for a block of text.The `textBounds()` function calculates the precise pixel boundaries that enclose
 * the rendered text based on the current text properties (such as font, textSize, textStyle, and
 * alignment). If the text spans multiple lines (due to line breaks or wrapping), the function
 * measures each line individually and then aggregates these measurements into a single bounding box.
 * The resulting object contains the x and y coordinates along with the width (w) and height (h)
 * of the text block.
 *
 * @for p5
 * @param The text string to measure.
 * @param The x-coordinate where the text is drawn.
 * @param The y-coordinate where the text is drawn.
 * @param (Optional) The maximum width available for the text block.
 * When specified, the text may be wrapped to fit within this width.
 * @param (Optional) The maximum height available for the text block.
 * Any lines exceeding this height will be truncated.
 * @returns An object with properties `x`, `y`, `w`, and `h` that represent the tight
 * bounding box of the rendered text.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 200);
 * background(220);
 * 
 * // Set up text properties for clarity
 * textSize(32);
 * textAlign(LEFT, TOP);
 * 
 * let txt = "Hello, World!";
 * // Compute the bounding box for the text starting at (50, 50)
 * let bounds = textBounds(txt, 50, 50);
 * 
 * // Draw the text
 * fill(0);
 * text(txt, 50, 50);
 * 
 * // Draw the computed bounding box in red to visualize the measured area
 * noFill();
 * stroke('red');
 * rect(bounds.x, bounds.y, bounds.w, bounds.h);
 * }
 * </code>
 * </div>
 */
function textBounds(str: string, x: number, y: number, width?: number, height?: number): object;

/**
 * Sets or gets the text drawing direction.The textDirection() function allows you to specify the direction in which text is
 * rendered on the canvas. When provided with a direction parameter (such as "ltr" for
 * left-to-right, "rtl" for right-to-left, or "inherit"), it updates the renderer's state with that
 * value and applies the new setting. When called without any arguments, it returns the current text
 * direction. This function is particularly useful for rendering text in languages with different
 * writing directions.
 *
 * @for p5
 * @param The text direction to set ("ltr", "rtl", or "inherit").
 * @returns If no arguments are provided, the current text direction, either "ltr", "rtl", or "inherit"
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 300);
 * background(240);
 * 
 * textSize(32);
 * textFont("Georgia");
 * textAlign(LEFT, TOP);
 * 
 * // Set text direction to right-to-left and draw Arabic text.
 * textDirection("rtl");
 * fill(0);
 * text("مرحبًا!", 50, 50);
 * 
 * // Set text direction to left-to-right and draw English text.
 * textDirection("ltr");
 * text("Hello, p5.js!", 50, 150);
 * 
 * // Display the current text direction.
 * textSize(16);
 * fill(50);
 * textAlign(LEFT, TOP);
 * text("Current textDirection: " + textDirection(), 50, 250);
 * }
 * </code>
 * </div>
 */
function textDirection(direction: string): string;

/**
 * @for p5
 * @returns The current text direction, either "ltr", "rtl", or "inherit"
 */
function textDirection(): string;

/**
 * Sets or gets a single text property for the renderer.The `textProperty()` function allows you to set or retrieve a single text-related property,
 * such as `textAlign`, `textBaseline`, `fontStyle`, or any other property
 * that may be part of the renderer's state, its drawing context, or the canvas style.When called with a `prop` and a `value`, the function sets the property by checking
 * for its existence in the renderer's state, the drawing context, or the canvas style. If the property is
 * successfully modified, the function applies the updated text properties. If called with only the
 * `prop` parameter, the function returns the current value of that property.
 *
 * @for p5
 * @param The name of the text property to set or get.
 * @param The value to set for the specified text property. If omitted, the current
 * value of the property is returned
 * @returns If no arguments are provided, the current value of the specified text property
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 300);
 * background(240);
 * 
 * // Set the text alignment to CENTER and the baseline to TOP using textProperty.
 * textProperty("textAlign", CENTER);
 * textProperty("textBaseline", TOP);
 * 
 * // Set additional text properties and draw the text.
 * textSize(32);
 * textFont("Georgia");
 * fill(0);
 * text("Hello, World!", width / 2, 50);
 * 
 * // Retrieve and display the current text properties.
 * let currentAlign = textProperty("textAlign");
 * let currentBaseline = textProperty("textBaseline");
 * 
 * textSize(16);
 * textAlign(LEFT, TOP);
 * fill(50);
 * text("Current textAlign: " + currentAlign, 50, 150);
 * text("Current textBaseline: " + currentBaseline, 50, 170);
 * }
 * </code>
 * </div>
 */
function textProperty(prop: string, value: any): void;

/**
 * @for p5
 * @param The name of the text property to set or get.
 * @returns The current value of the specified text property
 */
function textProperty(prop: string): void;

/**
 * Gets or sets text properties in batch, similar to calling `textProperty()`
 * multiple times.If an object is passed in, `textProperty(key, value)` will be called for you
 * on every key/value pair in the object.If no arguments are passed in, an object will be returned with all the current
 * properties.
 *
 * @for p5
 * @param An object whose keys are properties to set, and whose
 * values are what they should be set to.
 */
function textProperties(properties: object): void;

/**
 * @for p5
 * @returns An object with all the possible properties and their current values.
 */
function textProperties(): object;

/**
 * Computes a generic (non-tight) bounding box for a block of text.The `fontBounds()` function calculates the bounding box for the text based on the
 * font's intrinsic metrics (such as `fontBoundingBoxAscent` and
 * `fontBoundingBoxDescent`). Unlike `textBounds()`, which measures the exact
 * pixel boundaries of the rendered text, `fontBounds()` provides a looser measurement
 * derived from the font’s default spacing. This measurement is useful for layout purposes where
 * a consistent approximation of the text's dimensions is desired.
 *
 * @for p5
 * @param The text string to measure.
 * @param The x-coordinate where the text is drawn.
 * @param The y-coordinate where the text is drawn.
 * @param (Optional) The maximum width available for the text block.
 * When specified, the text may be wrapped to fit within this width.
 * @param (Optional) The maximum height available for the text block.
 * Any lines exceeding this height will be truncated.
 * @returns An object with properties `x`, `y`, `w`, and `h` representing the loose
 * bounding box of the text based on the font's intrinsic metrics.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 200);
 * background(240);
 * 
 * textSize(32);
 * textAlign(LEFT, TOP);
 * textFont('Georgia');
 * 
 * let txt = "Hello, World!";
 * // Compute the bounding box based on the font's intrinsic metrics
 * let bounds = fontBounds(txt, 50, 50);
 * 
 * fill(0);
 * text(txt, 50, 50);
 * 
 * noFill();
 * stroke('green');
 * rect(bounds.x, bounds.y, bounds.w, bounds.h);
 * 
 * noStroke();
 * fill(50);
 * textSize(15);
 * text("Font Bounds: x=" + bounds.x.toFixed(1) + ", y=" + bounds.y.toFixed(1) +
 * ", w=" + bounds.w.toFixed(1) + ", h=" + bounds.h.toFixed(1), 8, 100);
 * }
 * </code>
 * </div>
 */
function fontBounds(str: string, x: number, y: number, width?: number, height?: number): object;

/**
 * Returns the loose width of a text string based on the current font.The `fontWidth()` function measures the width of the provided text string using
 * the font's default measurement (i.e., the width property from the text metrics returned by
 * the browser). Unlike `textWidth()`, which calculates the tight pixel boundaries
 * of the text glyphs, `fontWidth()` uses the font's intrinsic spacing, which may include
 * additional space for character spacing and kerning. This makes it useful for scenarios where
 * an approximate width is sufficient for layout and positioning.
 *
 * @for p5
 * @param The text string to measure.
 * @returns The loose width of the text in pixels.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 200);
 * background(240);
 * 
 * textSize(32);
 * textAlign(LEFT, TOP);
 * textFont('Georgia');
 * 
 * let s = "Hello, World!";
 * let fw = fontWidth(s);
 * 
 * fill(0);
 * text(s, 50, 50);
 * 
 * stroke('blue');
 * line(50, 90, 50 + fw, 90);
 * 
 * noStroke();
 * fill(50);
 * textSize(16);
 * text("Font width: " + fw.toFixed(2) + " pixels", 50, 100);
 * }
 * </code>
 * </div>
 */
function fontWidth(theText: string): number;

/**
 * Returns the loose ascent of the text based on the font's intrinsic metrics.The `fontAscent()` function calculates the ascent of the text using the font's
 * intrinsic metrics (e.g., `fontBoundingBoxAscent`). This value represents the space
 * above the baseline that the font inherently occupies, and is useful for layout purposes when
 * an approximate vertical measurement is required.
 *
 * @for p5
 * @returns The loose ascent value in pixels.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 300);
 * background(220);
 * 
 * textSize(35);
 * textAlign(LEFT, BASELINE);
 * textFont('Georgia');
 * 
 * let s = "Hello, p5.js!";
 * let x = 50, y = 150;
 * 
 * fill(0);
 * text(s, x, y);
 * 
 * // Get the font descent of the current font
 * let fasc = fontAscent();
 * 
 * // Draw a red line at the baseline and a blue line at the ascent position
 * stroke('red');
 * line(x, y, x + 200, y); // Baseline
 * stroke('blue');
 * line(x, y - fasc, x + 200, y - fasc); // Font ascent position
 * 
 * noStroke();
 * fill(0);
 * textSize(16);
 * text("fontAscent: " + fasc.toFixed(2) + " pixels", x, y + fdesc + 20);
 * }
 * </code>
 * </div>
 */
function fontAscent(): number;

/**
 * Returns the loose descent of the text based on the font's intrinsic metrics.The `fontDescent()` function calculates the descent of the text using the font's
 * intrinsic metrics (e.g., `fontBoundingBoxDescent`). This value represents the space
 * below the baseline that the font inherently occupies, and is useful for layout purposes when
 * an approximate vertical measurement is required.
 *
 * @for p5
 * @returns The loose descent value in pixels.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 300);
 * background(220);
 * 
 * textSize(48);
 * textAlign(LEFT, BASELINE);
 * textFont('Georgia');
 * 
 * let s = "Hello, p5.js!";
 * let x = 50, y = 150;
 * 
 * fill(0);
 * text(s, x, y);
 * 
 * // Get the font descent of the current font
 * let fdesc = fontDescent();
 * 
 * // Draw a red line at the baseline and a blue line at the descent position
 * stroke('red');
 * line(x, y, x + 200, y); // Baseline
 * stroke('blue');
 * line(x, y + fdesc, x + 200, y + fdesc); // Font descent position
 * 
 * noStroke();
 * fill(0);
 * textSize(16);
 * text("fontDescent: " + fdesc.toFixed(2) + " pixels", x, y + fdesc + 20);
 * }
 * </code>
 * </div>
 */
function fontDescent(): number;

/**
 * Sets or gets the current font weight.The textWeight() function is used to specify the weight (thickness) of the text.
 * When a numeric value is provided, it sets the font weight to that value and updates the
 * rendering properties accordingly (including the "font-variation-settings" on the canvas style).
 * When called without an argument, it returns the current font weight setting.
 *
 * @for p5
 * @param The numeric weight value to set for the text.
 * @returns If no arguments are provided, the current font weight
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(300, 200);
 * background(240);
 * 
 * // Set text alignment, size, and font
 * textAlign(LEFT, TOP);
 * textSize(20);
 * textFont("Georgia");
 * 
 * // Draw text with a normal weight (lighter appearance)
 * push();
 * textWeight(400);  // Set font weight to 400
 * fill(0);
 * text("Normal", 50, 50);
 * let normalWeight = textWeight();  // Should return 400
 * pop();
 * 
 * // Draw text with a bold weight (heavier appearance)
 * push();
 * textWeight(900);  // Set font weight to 900
 * fill(0);
 * text("Bold", 50, 100);
 * let boldWeight = textWeight();  // Should return 900
 * pop();
 * 
 * // Display the current font weight values on the canvas
 * textSize(16);
 * fill(50);
 * text("Normal Weight: " + normalWeight, 150, 52);
 * text("Bold Weight: " + boldWeight, 150, 100);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let font;
 * 
 * async function setup() {
 * createCanvas(100, 100);
 * font = await loadFont(
 * 'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap'
 * );
 * }
 * 
 * function draw() {
 * background(255);
 * textFont(font);
 * textAlign(LEFT, TOP);
 * textSize(35);
 * textWeight(sin(millis() * 0.002) * 200 + 400);
 * text('p5*js', 0, 10);
 * describe('The text p5*js pulsing its weight over time');
 * }
 * </code>
 * </div>
 */
function textWeight(weight: number): number;

/**
 * @for p5
 * @returns The current font weight
 */
function textWeight(): number;

}

export default function textCore(p5: any, fn: any): void;
