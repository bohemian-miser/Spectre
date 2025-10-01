// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Allows the user to orbit around a 3D sketch using a mouse, trackpad, or
 * touchscreen.3D sketches are viewed through an imaginary camera. Calling
 * `orbitControl()` within the draw() function allows
 * the user to change the camera’s position:`function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Rest of sketch.
 * }`Left-clicking and dragging or swipe motion will rotate the camera position
 * about the center of the sketch. Right-clicking and dragging or multi-swipe
 * will pan the camera position without rotation. Using the mouse wheel
 * (scrolling) or pinch in/out will move the camera further or closer from the
 * center of the sketch.The first three parameters, `sensitivityX`, `sensitivityY`, and
 * `sensitivityZ`, are optional. They’re numbers that set the sketch’s
 * sensitivity to movement along each axis. For example, calling
 * `orbitControl(1, 2, -1)` keeps movement along the x-axis at its default
 * value, makes the sketch twice as sensitive to movement along the y-axis,
 * and reverses motion along the z-axis. By default, all sensitivity values
 * are 1.The fourth parameter, `options`, is also optional. It’s an object that
 * changes the behavior of orbiting. For example, calling
 * `orbitControl(1, 1, 1, options)` keeps the default sensitivity values while
 * changing the behaviors set with `options`. The object can have the
 * following properties:`let options = {
 * // Setting this to false makes mobile interactions smoother by
 * // preventing accidental interactions with the page while orbiting.
 * // By default, it's true.
 * disableTouchActions: true,
 * 
 * // Setting this to true makes the camera always rotate in the
 * // direction the mouse/touch is moving.
 * // By default, it's false.
 * freeRotation: false
 * };
 * 
 * orbitControl(1, 1, 1, options);`
 *
 * @for p5
 * @param sensitivity to movement along the x-axis. Defaults to 1.
 * @param sensitivity to movement along the y-axis. Defaults to 1.
 * @param sensitivity to movement along the z-axis. Defaults to 1.
 * @param object with two optional properties, `disableTouchActions`
 * and `freeRotation`. Both are `Boolean`s. `disableTouchActions`
 * defaults to `true` and `freeRotation` defaults to `false`.
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A multicolor box on a gray background. The camera angle changes when the user interacts using a mouse, trackpad, or touchscreen.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Style the box.
 * normalMaterial();
 * 
 * // Draw the box.
 * box(30, 50);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A multicolor box on a gray background. The camera angle changes when the user interacts using a mouse, trackpad, or touchscreen.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * // Make the interactions 3X sensitive.
 * orbitControl(3, 3, 3);
 * 
 * // Style the box.
 * normalMaterial();
 * 
 * // Draw the box.
 * box(30, 50);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A multicolor box on a gray background. The camera angle changes when the user interacts using a mouse, trackpad, or touchscreen.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Create an options object.
 * let options = {
 * disableTouchActions: false,
 * freeRotation: true
 * };
 * 
 * // Enable orbiting with the mouse.
 * // Prevent accidental touch actions on touchscreen devices
 * // and enable free rotation.
 * orbitControl(1, 1, 1, options);
 * 
 * // Style the box.
 * normalMaterial();
 * 
 * // Draw the box.
 * box(30, 50);
 * }
 * </code>
 * </div>
 */
function orbitControl(sensitivityX?: number, sensitivityY?: number, sensitivityZ?: number, options?: object): void;

/**
 * Adds a grid and an axes icon to clarify orientation in 3D sketches.`debugMode()` adds a grid that shows where the “ground” is in a sketch. By
 * default, the grid will run through the origin `(0, 0, 0)` of the sketch
 * along the XZ plane. `debugMode()` also adds an axes icon that points along
 * the positive x-, y-, and z-axes. Calling `debugMode()` displays the grid
 * and axes icon with their default size and position.There are four ways to call `debugMode()` with optional parameters to
 * customize the debugging environment.The first way to call `debugMode()` has one parameter, `mode`. If the
 * system constant `GRID` is passed, as in `debugMode(GRID)`, then the grid
 * will be displayed and the axes icon will be hidden. If the constant `AXES`
 * is passed, as in `debugMode(AXES)`, then the axes icon will be displayed
 * and the grid will be hidden.The second way to call `debugMode()` has six parameters. The first
 * parameter, `mode`, selects either `GRID` or `AXES` to be displayed. The
 * next five parameters, `gridSize`, `gridDivisions`, `xOff`, `yOff`, and
 * `zOff` are optional. They’re numbers that set the appearance of the grid
 * (`gridSize` and `gridDivisions`) and the placement of the axes icon
 * (`xOff`, `yOff`, and `zOff`). For example, calling
 * `debugMode(20, 5, 10, 10, 10)` sets the `gridSize` to 20 pixels, the number
 * of `gridDivisions` to 5, and offsets the axes icon by 10 pixels along the
 * x-, y-, and z-axes.The third way to call `debugMode()` has five parameters. The first
 * parameter, `mode`, selects either `GRID` or `AXES` to be displayed. The
 * next four parameters, `axesSize`, `xOff`, `yOff`, and `zOff` are optional.
 * They’re numbers that set the appearance of the size of the axes icon
 * (`axesSize`) and its placement (`xOff`, `yOff`, and `zOff`).The fourth way to call `debugMode()` has nine optional parameters. The
 * first five parameters, `gridSize`, `gridDivisions`, `gridXOff`, `gridYOff`,
 * and `gridZOff` are numbers that set the appearance of the grid. For
 * example, calling `debugMode(100, 5, 0, 0, 0)` sets the `gridSize` to 100,
 * the number of `gridDivisions` to 5, and sets all the offsets to 0 so that
 * the grid is centered at the origin. The next four parameters, `axesSize`,
 * `xOff`, `yOff`, and `zOff` are numbers that set the appearance of the size
 * of the axes icon (`axesSize`) and its placement (`axesXOff`, `axesYOff`,
 * and `axesZOff`). For example, calling
 * `debugMode(100, 5, 0, 0, 0, 50, 10, 10, 10)` sets the `gridSize` to 100,
 * the number of `gridDivisions` to 5, and sets all the offsets to 0 so that
 * the grid is centered at the origin. It then sets the `axesSize` to 50 and
 * offsets the icon 10 pixels along each axis.
 *
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Enable debug mode.
 * debugMode();
 * 
 * describe('A multicolor box on a gray background. A grid and axes icon are displayed near the box.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Style the box.
 * normalMaterial();
 * 
 * // Draw the box.
 * box(20, 40);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Enable debug mode.
 * // Only display the axes icon.
 * debugMode(AXES);
 * 
 * describe('A multicolor box on a gray background. A grid and axes icon are displayed near the box.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Style the box.
 * normalMaterial();
 * 
 * // Draw the box.
 * box(20, 40);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Enable debug mode.
 * // Only display the grid and customize it:
 * // - size: 50
 * // - divisions: 10
 * // - offsets: 0, 20, 0
 * debugMode(GRID, 50, 10, 0, 20, 0);
 * 
 * describe('A multicolor box on a gray background. A grid is displayed below the box.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Style the box.
 * normalMaterial();
 * 
 * // Draw the box.
 * box(20, 40);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Enable debug mode.
 * // Display the grid and axes icon and customize them:
 * // Grid
 * // ----
 * // - size: 50
 * // - divisions: 10
 * // - offsets: 0, 20, 0
 * // Axes
 * // ----
 * // - size: 50
 * // - offsets: 0, 0, 0
 * debugMode(50, 10, 0, 20, 0, 50, 0, 0, 0);
 * 
 * describe('A multicolor box on a gray background. A grid is displayed below the box. An axes icon is displayed at the center of the box.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Style the box.
 * normalMaterial();
 * 
 * // Draw the box.
 * box(20, 40);
 * }
 * </code>
 * </div>
 */
function debugMode(): void;

/**
 * @param either GRID or AXES
 */
function debugMode(mode: GRID | AXES): void;

/**
 * @param side length of the grid.
 * @param number of divisions in the grid.
 * @param offset from origin along the x-axis.
 * @param offset from origin along the y-axis.
 * @param offset from origin along the z-axis.
 */
function debugMode(mode: GRID | AXES, gridSize?: number, gridDivisions?: number, xOff?: number, yOff?: number, zOff?: number): void;

/**
 * @param length of axes icon markers.
 */
function debugMode(mode: GRID | AXES, axesSize?: number, xOff?: number, yOff?: number, zOff?: number): void;

/**
 * @param grid offset from the origin along the x-axis.
 * @param grid offset from the origin along the y-axis.
 * @param grid offset from the origin along the z-axis.
 * @param axes icon offset from the origin along the x-axis.
 * @param axes icon offset from the origin along the y-axis.
 * @param axes icon offset from the origin along the z-axis.
 */
function debugMode(gridSize?: number, gridDivisions?: number, gridXOff?: number, gridYOff?: number, gridZOff?: number, axesSize?: number, axesXOff?: number, axesYOff?: number, axesZOff?: number): void;

/**
 * Turns off debugMode() in a 3D sketch.
 *
 * @example <div>
 * <code>
 * // Click and drag the mouse to view the scene from different angles.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Enable debug mode.
 * debugMode();
 * 
 * describe('A multicolor box on a gray background. A grid and axes icon are displayed near the box. They disappear when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Enable orbiting with the mouse.
 * orbitControl();
 * 
 * // Style the box.
 * normalMaterial();
 * 
 * // Draw the box.  box(20, 40);
 * }
 * 
 * // Disable debug mode when the user double-clicks.
 * function doubleClicked() {
 * noDebugMode();
 * }
 * </code>
 * </div>
 */
function noDebugMode(): void;

}

export default function interaction(p5: any, fn: any): void;
