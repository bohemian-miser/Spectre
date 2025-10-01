// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  class Camera {
    constructor(rendererGL: rendererGL);

  /**
   * The camera’s x-coordinate.By default, the camera’s x-coordinate is set to 0 in "world" space.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * The camera’s y-coordinate.By default, the camera’s y-coordinate is set to 0 in "world" space.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * The camera’s z-coordinate.By default, the camera’s z-coordinate is set to 800 in "world" space.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * The x-coordinate of the place where the camera looks.By default, the camera looks at the origin `(0, 0, 0)` in "world" space, so
   * `myCamera.centerX` is 0.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * The y-coordinate of the place where the camera looks.By default, the camera looks at the origin `(0, 0, 0)` in "world" space, so
   * `myCamera.centerY` is 0.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * The y-coordinate of the place where the camera looks.By default, the camera looks at the origin `(0, 0, 0)` in "world" space, so
   * `myCamera.centerZ` is 0.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * The x-component of the camera's "up" vector.The camera's "up" vector orients its y-axis. By default, the "up" vector is
   * `(0, 1, 0)`, so its x-component is 0 in "local" space.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * The y-component of the camera's "up" vector.The camera's "up" vector orients its y-axis. By default, the "up" vector is
   * `(0, 1, 0)`, so its y-component is 1 in "local" space.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * The z-component of the camera's "up" vector.The camera's "up" vector orients its y-axis. By default, the "up" vector is
   * `(0, 1, 0)`, so its z-component is 0 in "local" space.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: any, aspect: any, near: any, far: any): void;

  /**
   * Sets a perspective projection for the camera.In a perspective projection, shapes that are further from the camera appear
   * smaller than shapes that are near the camera. This technique, called
   * foreshortening, creates realistic 3D scenes. It’s applied by default in new
   * `p5.Camera` objects.`myCamera.perspective()` changes the camera’s perspective by changing its
   * viewing frustum. The frustum is the volume of space that’s visible to the
   * camera. The frustum’s shape is a pyramid with its top cut off. The camera
   * is placed where the top of the pyramid should be and points towards the
   * base of the pyramid. It views everything within the frustum.The first parameter, `fovy`, is the camera’s vertical field of view. It’s
   * an angle that describes how tall or narrow a view the camera has. For
   * example, calling `myCamera.perspective(0.5)` sets the camera’s vertical
   * field of view to 0.5 radians. By default, `fovy` is calculated based on the
   * sketch’s height and the camera’s default z-coordinate, which is 800. The
   * formula for the default `fovy` is `2 * atan(height / 2 / 800)`.The second parameter, `aspect`, is the camera’s aspect ratio. It’s a number
   * that describes the ratio of the top plane’s width to its height. For
   * example, calling `myCamera.perspective(0.5, 1.5)` sets the camera’s field
   * of view to 0.5 radians and aspect ratio to 1.5, which would make shapes
   * appear thinner on a square canvas. By default, `aspect` is set to
   * `width / height`.The third parameter, `near`, is the distance from the camera to the near
   * plane. For example, calling `myCamera.perspective(0.5, 1.5, 100)` sets the
   * camera’s field of view to 0.5 radians, its aspect ratio to 1.5, and places
   * the near plane 100 pixels from the camera. Any shapes drawn less than 100
   * pixels from the camera won’t be visible. By default, `near` is set to
   * `0.1 * 800`, which is 1/10th the default distance between the camera and
   * the origin.The fourth parameter, `far`, is the distance from the camera to the far
   * plane. For example, calling `myCamera.perspective(0.5, 1.5, 100, 10000)`
   * sets the camera’s field of view to 0.5 radians, its aspect ratio to 1.5,
   * places the near plane 100 pixels from the camera, and places the far plane
   * 10,000 pixels from the camera. Any shapes drawn more than 10,000 pixels
   * from the camera won’t be visible. By default, `far` is set to `10 * 800`,
   * which is 10 times the default distance between the camera and the origin.
 *
   * @param
   * @param
   * @param
   * @param
   */
  perspective(fovy: number, aspect: number, near: number, far: number): void;

  /**
   * Sets an orthographic projection for the camera.In an orthographic projection, shapes with the same size always appear the
   * same size, regardless of whether they are near or far from the camera.`myCamera.ortho()` changes the camera’s perspective by changing its viewing
   * frustum from a truncated pyramid to a rectangular prism. The frustum is the
   * volume of space that’s visible to the camera. The camera is placed in front
   * of the frustum and views everything within the frustum. `myCamera.ortho()`
   * has six optional parameters to define the viewing frustum.The first four parameters, `left`, `right`, `bottom`, and `top`, set the
   * coordinates of the frustum’s sides, bottom, and top. For example, calling
   * `myCamera.ortho(-100, 100, 200, -200)` creates a frustum that’s 200 pixels
   * wide and 400 pixels tall. By default, these dimensions are set based on
   * the sketch’s width and height, as in
   * `myCamera.ortho(-width / 2, width / 2, -height / 2, height / 2)`.The last two parameters, `near` and `far`, set the distance of the
   * frustum’s near and far plane from the camera. For example, calling
   * `myCamera.ortho(-100, 100, 200, -200, 50, 1000)` creates a frustum that’s
   * 200 pixels wide, 400 pixels tall, starts 50 pixels from the camera, and
   * ends 1,000 pixels from the camera. By default, `near` and `far` are set to
   * 0 and `max(width, height) + 800`, respectively.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): void;

  /**
   * Sets the camera's frustum.In a frustum projection, shapes that are further from the camera appear
   * smaller than shapes that are near the camera. This technique, called
   * foreshortening, creates realistic 3D scenes.`myCamera.frustum()` changes the camera’s perspective by changing its
   * viewing frustum. The frustum is the volume of space that’s visible to the
   * camera. The frustum’s shape is a pyramid with its top cut off. The camera
   * is placed where the top of the pyramid should be and points towards the
   * base of the pyramid. It views everything within the frustum.The first four parameters, `left`, `right`, `bottom`, and `top`, set the
   * coordinates of the frustum’s sides, bottom, and top. For example, calling
   * `myCamera.frustum(-100, 100, 200, -200)` creates a frustum that’s 200
   * pixels wide and 400 pixels tall. By default, these coordinates are set
   * based on the sketch’s width and height, as in
   * `myCamera.frustum(-width / 20, width / 20, height / 20, -height / 20)`.The last two parameters, `near` and `far`, set the distance of the
   * frustum’s near and far plane from the camera. For example, calling
   * `myCamera.frustum(-100, 100, 200, -200, 50, 1000)` creates a frustum that’s
   * 200 pixels wide, 400 pixels tall, starts 50 pixels from the camera, and ends
   * 1,000 pixels from the camera. By default, near is set to `0.1 * 800`, which
   * is 1/10th the default distance between the camera and the origin. `far` is
   * set to `10 * 800`, which is 10 times the default distance between the
   * camera and the origin.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  frustum(left: number, right: number, bottom: number, top: number, near: number, far: number): void;

  /**
   * Rotates the camera left and right.Panning rotates the camera without changing its position. The rotation
   * happens in the camera’s "local" space.The parameter, `angle`, is the angle the camera should rotate. Passing a
   * positive angle, as in `myCamera.pan(0.001)`, rotates the camera to the
   * right. Passing a negative angle, as in `myCamera.pan(-0.001)`, rotates the
   * camera to the left.Note: Angles are interpreted based on the current
   * angleMode().
 *
   * @param
   * @param
   */
  pan(amount: any, angle: number): void;

  /**
   * Rotates the camera up and down.Tilting rotates the camera without changing its position. The rotation
   * happens in the camera’s "local" space.The parameter, `angle`, is the angle the camera should rotate. Passing a
   * positive angle, as in `myCamera.tilt(0.001)`, rotates the camera down.
   * Passing a negative angle, as in `myCamera.tilt(-0.001)`, rotates the camera
   * up.Note: Angles are interpreted based on the current
   * angleMode().
 *
   * @param
   * @param
   */
  tilt(amount: any, angle: number): void;

  /**
   * Points the camera at a location.`myCamera.lookAt()` changes the camera’s orientation without changing its
   * position.The parameters, `x`, `y`, and `z`, are the coordinates in "world" space
   * where the camera should point. For example, calling
   * `myCamera.lookAt(10, 20, 30)` points the camera at the coordinates
   * `(10, 20, 30)`.
 *
   * @param
   * @param
   * @param
   */
  lookAt(x: number, y: number, z: number): void;

  /**
   * Sets the position and orientation of the camera.`myCamera.camera()` allows objects to be viewed from different angles. It
   * has nine parameters that are all optional.The first three parameters, `x`, `y`, and `z`, are the coordinates of the
   * camera’s position in "world" space. For example, calling
   * `myCamera.camera(0, 0, 0)` places the camera at the origin `(0, 0, 0)`. By
   * default, the camera is placed at `(0, 0, 800)`.The next three parameters, `centerX`, `centerY`, and `centerZ` are the
   * coordinates of the point where the camera faces in "world" space. For
   * example, calling `myCamera.camera(0, 0, 0, 10, 20, 30)` places the camera
   * at the origin `(0, 0, 0)` and points it at `(10, 20, 30)`. By default, the
   * camera points at the origin `(0, 0, 0)`.The last three parameters, `upX`, `upY`, and `upZ` are the components of
   * the "up" vector in "local" space. The "up" vector orients the camera’s
   * y-axis. For example, calling
   * `myCamera.camera(0, 0, 0, 10, 20, 30, 0, -1, 0)` places the camera at the
   * origin `(0, 0, 0)`, points it at `(10, 20, 30)`, and sets the "up" vector
   * to `(0, -1, 0)` which is like holding it upside-down. By default, the "up"
   * vector is `(0, 1, 0)`.
 *
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   * @param
   */
  camera(eyeX: any, eyeY: any, eyeZ: any, centerX: number, centerY: number, centerZ: number, upX: number, upY: number, upZ: number, x: number, y: number, z: number): void;

  /**
   * Moves the camera along its "local" axes without changing its orientation.The parameters, `x`, `y`, and `z`, are the distances the camera should
   * move. For example, calling `myCamera.move(10, 20, 30)` moves the camera 10
   * pixels to the right, 20 pixels down, and 30 pixels backward in its "local"
   * space.
 *
   * @param
   * @param
   * @param
   */
  move(x: number, y: number, z: number): void;

  /**
   * Sets the camera’s position in "world" space without changing its
   * orientation.The parameters, `x`, `y`, and `z`, are the coordinates where the camera
   * should be placed. For example, calling `myCamera.setPosition(10, 20, 30)`
   * places the camera at coordinates `(10, 20, 30)` in "world" space.
 *
   * @param
   * @param
   * @param
   */
  setPosition(x: number, y: number, z: number): void;

  /**
   * Sets the camera’s position, orientation, and projection by copying another
   * camera.The parameter, `cam`, is the `p5.Camera` object to copy. For example, calling
   * `cam2.set(cam1)` will set `cam2` using `cam1`’s configuration.
 *
   * @param
   */
  set(cam: p5.Camera): void;

  /**
   * Sets the camera’s position and orientation to values that are in-between
   * those of two other cameras.`myCamera.slerp()` uses spherical linear interpolation to calculate a
   * position and orientation that’s in-between two other cameras. Doing so is
   * helpful for transitioning smoothly between two perspectives.The first two parameters, `cam0` and `cam1`, are the `p5.Camera` objects
   * that should be used to set the current camera.The third parameter, `amt`, is the amount to interpolate between `cam0` and
   * `cam1`. 0.0 keeps the camera’s position and orientation equal to `cam0`’s,
   * 0.5 sets them halfway between `cam0`’s and `cam1`’s , and 1.0 sets the
   * position and orientation equal to `cam1`’s.For example, calling `myCamera.slerp(cam0, cam1, 0.1)` sets cam’s position
   * and orientation very close to `cam0`’s. Calling
   * `myCamera.slerp(cam0, cam1, 0.9)` sets cam’s position and orientation very
   * close to `cam1`’s.Note: All of the cameras must use the same projection.
 *
   * @param
   * @param
   * @param
   */
  slerp(cam0: p5.Camera, cam1: p5.Camera, amt: number): void;

  }

/**
 * The camera’s x-coordinate.By default, the camera’s x-coordinate is set to 0 in "world" space.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The text "eyeX: 0" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of eyeX, rounded to the nearest integer.
 * text(`eyeX: ${round(cam.eyeX)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The cube appears to move left and right as the camera moves. The text "eyeX: X" is written in black beneath the cube. X oscillates between -25 and 25.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the new x-coordinate.
 * let x = 25 * sin(frameCount * 0.01);
 * 
 * // Set the camera's position.
 * cam.setPosition(x, -400, 800);
 * 
 * // Display the value of eyeX, rounded to the nearest integer.
 * text(`eyeX: ${round(cam.eyeX)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * The camera’s y-coordinate.By default, the camera’s y-coordinate is set to 0 in "world" space.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * // Set the camera.
 * setCamera(cam);
 * 
 * describe(
 * 'A white cube on a gray background. The text "eyeY: -400" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of eyeY, rounded to the nearest integer.
 * text(`eyeY: ${round(cam.eyeY)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The cube appears to move up and down as the camera moves. The text "eyeY: Y" is written in black beneath the cube. Y oscillates between -374 and -425.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the new y-coordinate.
 * let y = 25 * sin(frameCount * 0.01) - 400;
 * 
 * // Set the camera's position.
 * cam.setPosition(0, y, 800);
 * 
 * // Display the value of eyeY, rounded to the nearest integer.
 * text(`eyeY: ${round(cam.eyeY)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * The camera’s z-coordinate.By default, the camera’s z-coordinate is set to 800 in "world" space.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The text "eyeZ: 800" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of eyeZ, rounded to the nearest integer.
 * text(`eyeZ: ${round(cam.eyeZ)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The cube appears to move forward and back as the camera moves. The text "eyeZ: Z" is written in black beneath the cube. Z oscillates between 700 and 900.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the new z-coordinate.
 * let z = 100 * sin(frameCount * 0.01) + 800;
 * 
 * // Set the camera's position.
 * cam.setPosition(0, -400, z);
 * 
 * // Display the value of eyeZ, rounded to the nearest integer.
 * text(`eyeZ: ${round(cam.eyeZ)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * The x-coordinate of the place where the camera looks.By default, the camera looks at the origin `(0, 0, 0)` in "world" space, so
 * `myCamera.centerX` is 0.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at (10, 20, -30).
 * cam.lookAt(10, 20, -30);
 * 
 * describe(
 * 'A white cube on a gray background. The text "centerX: 10" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of centerX, rounded to the nearest integer.
 * text(`centerX: ${round(cam.centerX)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-right.
 * cam.setPosition(100, -400, 800);
 * 
 * // Point the camera at (10, 20, -30).
 * cam.lookAt(10, 20, -30);
 * 
 * describe(
 * 'A white cube on a gray background. The cube appears to move left and right as the camera shifts its focus. The text "centerX: X" is written in black beneath the cube. X oscillates between -15 and 35.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the new x-coordinate.
 * let x = 25 * sin(frameCount * 0.01) + 10;
 * 
 * // Point the camera.
 * cam.lookAt(x, 20, -30);
 * 
 * // Display the value of centerX, rounded to the nearest integer.
 * text(`centerX: ${round(cam.centerX)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * The y-coordinate of the place where the camera looks.By default, the camera looks at the origin `(0, 0, 0)` in "world" space, so
 * `myCamera.centerY` is 0.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at (10, 20, -30).
 * cam.lookAt(10, 20, -30);
 * 
 * describe(
 * 'A white cube on a gray background. The text "centerY: 20" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of centerY, rounded to the nearest integer.
 * text(`centerY: ${round(cam.centerY)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-right.
 * cam.setPosition(100, -400, 800);
 * 
 * // Point the camera at (10, 20, -30).
 * cam.lookAt(10, 20, -30);
 * 
 * describe(
 * 'A white cube on a gray background. The cube appears to move up and down as the camera shifts its focus. The text "centerY: Y" is written in black beneath the cube. Y oscillates between -5 and 45.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the new y-coordinate.
 * let y = 25 * sin(frameCount * 0.01) + 20;
 * 
 * // Point the camera.
 * cam.lookAt(10, y, -30);
 * 
 * // Display the value of centerY, rounded to the nearest integer.
 * text(`centerY: ${round(cam.centerY)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * The y-coordinate of the place where the camera looks.By default, the camera looks at the origin `(0, 0, 0)` in "world" space, so
 * `myCamera.centerZ` is 0.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at (10, 20, -30).
 * cam.lookAt(10, 20, -30);
 * 
 * describe(
 * 'A white cube on a gray background. The text "centerZ: -30" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of centerZ, rounded to the nearest integer.
 * text(`centerZ: ${round(cam.centerZ)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Place the camera at the top-right.
 * cam.setPosition(100, -400, 800);
 * 
 * // Point the camera at (10, 20, -30).
 * cam.lookAt(10, 20, -30);
 * 
 * describe(
 * 'A white cube on a gray background. The cube appears to move forward and back as the camera shifts its focus. The text "centerZ: Z" is written in black beneath the cube. Z oscillates between -55 and -25.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the new z-coordinate.
 * let z = 25 * sin(frameCount * 0.01) - 30;
 * 
 * // Point the camera.
 * cam.lookAt(10, 20, z);
 * 
 * // Display the value of centerZ, rounded to the nearest integer.
 * text(`centerZ: ${round(cam.centerZ)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * The x-component of the camera's "up" vector.The camera's "up" vector orients its y-axis. By default, the "up" vector is
 * `(0, 1, 0)`, so its x-component is 0 in "local" space.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-right: (100, -400, 800)
 * // Point it at the origin: (0, 0, 0)
 * // Set its "up" vector: (0, 1, 0).
 * cam.camera(100, -400, 800, 0, 0, 0, 0, 1, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The text "upX: 0" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of upX, rounded to the nearest tenth.
 * text(`upX: ${round(cam.upX, 1)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-right: (100, -400, 800)
 * // Point it at the origin: (0, 0, 0)
 * // Set its "up" vector: (0, 1, 0).
 * cam.camera(100, -400, 800, 0, 0, 0, 0, 1, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The cube appears to rock back and forth. The text "upX: X" is written in black beneath it. X oscillates between -1 and 1.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the x-component.
 * let x = sin(frameCount * 0.01);
 * 
 * // Update the camera's "up" vector.
 * cam.camera(100, -400, 800, 0, 0, 0, x, 1, 0);
 * 
 * // Display the value of upX, rounded to the nearest tenth.
 * text(`upX: ${round(cam.upX, 1)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * The y-component of the camera's "up" vector.The camera's "up" vector orients its y-axis. By default, the "up" vector is
 * `(0, 1, 0)`, so its y-component is 1 in "local" space.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-right: (100, -400, 800)
 * // Point it at the origin: (0, 0, 0)
 * // Set its "up" vector: (0, 1, 0).
 * cam.camera(100, -400, 800, 0, 0, 0, 0, 1, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The text "upY: 1" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of upY, rounded to the nearest tenth.
 * text(`upY: ${round(cam.upY, 1)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-right: (100, -400, 800)
 * // Point it at the origin: (0, 0, 0)
 * // Set its "up" vector: (0, 1, 0).
 * cam.camera(100, -400, 800, 0, 0, 0, 0, 1, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The cube flips upside-down periodically. The text "upY: Y" is written in black beneath it. Y oscillates between -1 and 1.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the y-component.
 * let y = sin(frameCount * 0.01);
 * 
 * // Update the camera's "up" vector.
 * cam.camera(100, -400, 800, 0, 0, 0, 0, y, 0);
 * 
 * // Display the value of upY, rounded to the nearest tenth.
 * text(`upY: ${round(cam.upY, 1)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * The z-component of the camera's "up" vector.The camera's "up" vector orients its y-axis. By default, the "up" vector is
 * `(0, 1, 0)`, so its z-component is 0 in "local" space.
 *
 * @example <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-right: (100, -400, 800)
 * // Point it at the origin: (0, 0, 0)
 * // Set its "up" vector: (0, 1, 0).
 * cam.camera(100, -400, 800, 0, 0, 0, 0, 1, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The text "upZ: 0" is written in black beneath it.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Display the value of upZ, rounded to the nearest tenth.
 * text(`upZ: ${round(cam.upZ, 1)}`, 0, 45);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let cam;
 * let font;
 * 
 * async function setup() {
 * // Load a font and create a p5.Font object.
 * font = await loadFont('assets/inconsolata.otf');
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-right: (100, -400, 800)
 * // Point it at the origin: (0, 0, 0)
 * // Set its "up" vector: (0, 1, 0).
 * cam.camera(100, -400, 800, 0, 0, 0, 0, 1, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The cube appears to rock back and forth. The text "upZ: Z" is written in black beneath it. Z oscillates between -1 and 1.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Style the box.
 * fill(255);
 * 
 * // Draw the box.
 * box();
 * 
 * // Style the text.
 * textAlign(CENTER);
 * textSize(16);
 * textFont(font);
 * fill(0);
 * 
 * // Calculate the z-component.
 * let z = sin(frameCount * 0.01);
 * 
 * // Update the camera's "up" vector.
 * cam.camera(100, -400, 800, 0, 0, 0, 0, 1, z);
 * 
 * // Display the value of upZ, rounded to the nearest tenth.
 * text(`upZ: ${round(cam.upZ, 1)}`, 0, 45);
 * }
 * </code>
 * </div>
 */
function perspective(fovy: any, aspect: any, near: any, far: any): void;

/**
 * Sets a perspective projection for the camera.In a perspective projection, shapes that are further from the camera appear
 * smaller than shapes that are near the camera. This technique, called
 * foreshortening, creates realistic 3D scenes. It’s applied by default in new
 * `p5.Camera` objects.`myCamera.perspective()` changes the camera’s perspective by changing its
 * viewing frustum. The frustum is the volume of space that’s visible to the
 * camera. The frustum’s shape is a pyramid with its top cut off. The camera
 * is placed where the top of the pyramid should be and points towards the
 * base of the pyramid. It views everything within the frustum.The first parameter, `fovy`, is the camera’s vertical field of view. It’s
 * an angle that describes how tall or narrow a view the camera has. For
 * example, calling `myCamera.perspective(0.5)` sets the camera’s vertical
 * field of view to 0.5 radians. By default, `fovy` is calculated based on the
 * sketch’s height and the camera’s default z-coordinate, which is 800. The
 * formula for the default `fovy` is `2 * atan(height / 2 / 800)`.The second parameter, `aspect`, is the camera’s aspect ratio. It’s a number
 * that describes the ratio of the top plane’s width to its height. For
 * example, calling `myCamera.perspective(0.5, 1.5)` sets the camera’s field
 * of view to 0.5 radians and aspect ratio to 1.5, which would make shapes
 * appear thinner on a square canvas. By default, `aspect` is set to
 * `width / height`.The third parameter, `near`, is the distance from the camera to the near
 * plane. For example, calling `myCamera.perspective(0.5, 1.5, 100)` sets the
 * camera’s field of view to 0.5 radians, its aspect ratio to 1.5, and places
 * the near plane 100 pixels from the camera. Any shapes drawn less than 100
 * pixels from the camera won’t be visible. By default, `near` is set to
 * `0.1 * 800`, which is 1/10th the default distance between the camera and
 * the origin.The fourth parameter, `far`, is the distance from the camera to the far
 * plane. For example, calling `myCamera.perspective(0.5, 1.5, 100, 10000)`
 * sets the camera’s field of view to 0.5 radians, its aspect ratio to 1.5,
 * places the near plane 100 pixels from the camera, and places the far plane
 * 10,000 pixels from the camera. Any shapes drawn more than 10,000 pixels
 * from the camera won’t be visible. By default, `far` is set to `10 * 800`,
 * which is 10 times the default distance between the camera and the origin.
 *
 * @for p5.Camera
 * @param camera frustum vertical field of view. Defaults to
 * `2 * atan(height / 2 / 800)`.
 * @param camera frustum aspect ratio. Defaults to
 * `width / height`.
 * @param distance from the camera to the near clipping plane.
 * Defaults to `0.1 * 800`.
 * @param distance from the camera to the far clipping plane.
 * Defaults to `10 * 800`.
 * @example <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Place it at the top-right.
 * cam2.camera(400, -400, 800);
 * 
 * // Set its fovy to 0.2.
 * // Set its aspect to 1.5.
 * // Set its near to 600.
 * // Set its far to 1200.
 * cam2.perspective(0.2, 1.5, 600, 1200);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe('A white cube on a gray background. The camera toggles between a frontal view and a skewed aerial view when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw the box.
 * box();
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Place it at the top-right.
 * cam2.camera(400, -400, 800);
 * 
 * // Set its fovy to 0.2.
 * // Set its aspect to 1.5.
 * // Set its near to 600.
 * // Set its far to 1200.
 * cam2.perspective(0.2, 1.5, 600, 1200);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe('A white cube moves left and right on a gray background. The camera toggles between a frontal and a skewed aerial view when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the origin left and right.
 * let x = 100 * sin(frameCount * 0.01);
 * translate(x, 0, 0);
 * 
 * // Draw the box.
 * box();
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 */
function perspective(fovy?: number, aspect?: number, near?: number, far?: number): void;

/**
 * Sets an orthographic projection for the camera.In an orthographic projection, shapes with the same size always appear the
 * same size, regardless of whether they are near or far from the camera.`myCamera.ortho()` changes the camera’s perspective by changing its viewing
 * frustum from a truncated pyramid to a rectangular prism. The frustum is the
 * volume of space that’s visible to the camera. The camera is placed in front
 * of the frustum and views everything within the frustum. `myCamera.ortho()`
 * has six optional parameters to define the viewing frustum.The first four parameters, `left`, `right`, `bottom`, and `top`, set the
 * coordinates of the frustum’s sides, bottom, and top. For example, calling
 * `myCamera.ortho(-100, 100, 200, -200)` creates a frustum that’s 200 pixels
 * wide and 400 pixels tall. By default, these dimensions are set based on
 * the sketch’s width and height, as in
 * `myCamera.ortho(-width / 2, width / 2, -height / 2, height / 2)`.The last two parameters, `near` and `far`, set the distance of the
 * frustum’s near and far plane from the camera. For example, calling
 * `myCamera.ortho(-100, 100, 200, -200, 50, 1000)` creates a frustum that’s
 * 200 pixels wide, 400 pixels tall, starts 50 pixels from the camera, and
 * ends 1,000 pixels from the camera. By default, `near` and `far` are set to
 * 0 and `max(width, height) + 800`, respectively.
 *
 * @for p5.Camera
 * @param x-coordinate of the frustum’s left plane. Defaults to `-width / 2`.
 * @param x-coordinate of the frustum’s right plane. Defaults to `width / 2`.
 * @param y-coordinate of the frustum’s bottom plane. Defaults to `height / 2`.
 * @param y-coordinate of the frustum’s top plane. Defaults to `-height / 2`.
 * @param z-coordinate of the frustum’s near plane. Defaults to 0.
 * @param z-coordinate of the frustum’s far plane. Defaults to `max(width, height) + 800`.
 * @example <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Apply an orthographic projection.
 * cam2.ortho();
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe('A row of white cubes against a gray background. The camera toggles between a perspective and an orthographic projection when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 500);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -40);
 * box(10);
 * }
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Apply an orthographic projection.
 * cam2.ortho();
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe('A row of white cubes slither like a snake against a gray background. The camera toggles between a perspective and an orthographic projection when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 500);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * push();
 * // Calculate the box's coordinates.
 * let x = 10 * sin(frameCount * 0.02 + i * 0.6);
 * let z = -40 * i;
 * // Translate the origin.
 * translate(x, 0, z);
 * // Draw the box.
 * box(10);
 * pop();
 * }
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 */
function ortho(left?: number, right?: number, bottom?: number, top?: number, near?: number, far?: number): void;

/**
 * Sets the camera's frustum.In a frustum projection, shapes that are further from the camera appear
 * smaller than shapes that are near the camera. This technique, called
 * foreshortening, creates realistic 3D scenes.`myCamera.frustum()` changes the camera’s perspective by changing its
 * viewing frustum. The frustum is the volume of space that’s visible to the
 * camera. The frustum’s shape is a pyramid with its top cut off. The camera
 * is placed where the top of the pyramid should be and points towards the
 * base of the pyramid. It views everything within the frustum.The first four parameters, `left`, `right`, `bottom`, and `top`, set the
 * coordinates of the frustum’s sides, bottom, and top. For example, calling
 * `myCamera.frustum(-100, 100, 200, -200)` creates a frustum that’s 200
 * pixels wide and 400 pixels tall. By default, these coordinates are set
 * based on the sketch’s width and height, as in
 * `myCamera.frustum(-width / 20, width / 20, height / 20, -height / 20)`.The last two parameters, `near` and `far`, set the distance of the
 * frustum’s near and far plane from the camera. For example, calling
 * `myCamera.frustum(-100, 100, 200, -200, 50, 1000)` creates a frustum that’s
 * 200 pixels wide, 400 pixels tall, starts 50 pixels from the camera, and ends
 * 1,000 pixels from the camera. By default, near is set to `0.1 * 800`, which
 * is 1/10th the default distance between the camera and the origin. `far` is
 * set to `10 * 800`, which is 10 times the default distance between the
 * camera and the origin.
 *
 * @for p5.Camera
 * @param x-coordinate of the frustum’s left plane. Defaults to `-width / 20`.
 * @param x-coordinate of the frustum’s right plane. Defaults to `width / 20`.
 * @param y-coordinate of the frustum’s bottom plane. Defaults to `height / 20`.
 * @param y-coordinate of the frustum’s top plane. Defaults to `-height / 20`.
 * @param z-coordinate of the frustum’s near plane. Defaults to `0.1 * 800`.
 * @param z-coordinate of the frustum’s far plane. Defaults to `10 * 800`.
 * @example <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Adjust the frustum.
 * // Center it.
 * // Set its width and height to 20 pixels.
 * // Place its near plane 300 pixels from the camera.
 * // Place its far plane 350 pixels from the camera.
 * cam2.frustum(-10, 10, -10, 10, 300, 350);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe(
 * 'A row of white cubes against a gray background. The camera zooms in on one cube when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 600);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -40);
 * box(10);
 * }
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 */
function frustum(left?: number, right?: number, bottom?: number, top?: number, near?: number, far?: number): void;

/**
 * Rotates the camera left and right.Panning rotates the camera without changing its position. The rotation
 * happens in the camera’s "local" space.The parameter, `angle`, is the angle the camera should rotate. Passing a
 * positive angle, as in `myCamera.pan(0.001)`, rotates the camera to the
 * right. Passing a negative angle, as in `myCamera.pan(-0.001)`, rotates the
 * camera to the left.Note: Angles are interpreted based on the current
 * angleMode().
 *
 * @param amount to rotate in the current
 * <a href="#/p5/angleMode">angleMode()</a>.
 * @example <div>
 * <code>
 * let cam;
 * let delta = 0.001;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The cube goes in and out of view as the camera pans left and right.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Pan with the camera.
 * cam.pan(delta);
 * 
 * // Switch directions every 120 frames.
 * if (frameCount % 120 === 0) {
 * delta *= -1;
 * }
 * 
 * // Draw the box.
 * box();
 * }
 * </code>
 * </div>
 */
function pan(amount: any, angle: number): void;

/**
 * Rotates the camera up and down.Tilting rotates the camera without changing its position. The rotation
 * happens in the camera’s "local" space.The parameter, `angle`, is the angle the camera should rotate. Passing a
 * positive angle, as in `myCamera.tilt(0.001)`, rotates the camera down.
 * Passing a negative angle, as in `myCamera.tilt(-0.001)`, rotates the camera
 * up.Note: Angles are interpreted based on the current
 * angleMode().
 *
 * @param amount to rotate in the current
 * <a href="#/p5/angleMode">angleMode()</a>.
 * @example <div>
 * <code>
 * let cam;
 * let delta = 0.001;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * describe(
 * 'A white cube on a gray background. The cube goes in and out of view as the camera tilts up and down.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Pan with the camera.
 * cam.tilt(delta);
 * 
 * // Switch directions every 120 frames.
 * if (frameCount % 120 === 0) {
 * delta *= -1;
 * }
 * 
 * // Draw the box.
 * box();
 * }
 * </code>
 * </div>
 */
function tilt(amount: any, angle: number): void;

/**
 * Points the camera at a location.`myCamera.lookAt()` changes the camera’s orientation without changing its
 * position.The parameters, `x`, `y`, and `z`, are the coordinates in "world" space
 * where the camera should point. For example, calling
 * `myCamera.lookAt(10, 20, 30)` points the camera at the coordinates
 * `(10, 20, 30)`.
 *
 * @for p5.Camera
 * @param x-coordinate of the position where the camera should look in "world" space.
 * @param y-coordinate of the position where the camera should look in "world" space.
 * @param z-coordinate of the position where the camera should look in "world" space.
 * @example <div>
 * <code>
 * // Double-click to look at a different cube.
 * 
 * let cam;
 * let isLookingLeft = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * 
 * // Place the camera at the top-center.
 * cam.setPosition(0, -400, 800);
 * 
 * // Point the camera at the origin.
 * cam.lookAt(-30, 0, 0);
 * 
 * describe(
 * 'A red cube and a blue cube on a gray background. The camera switches focus between the cubes when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw the box on the left.
 * push();
 * // Translate the origin to the left.
 * translate(-30, 0, 0);
 * // Style the box.
 * fill(255, 0, 0);
 * // Draw the box.
 * box(20);
 * pop();
 * 
 * // Draw the box on the right.
 * push();
 * // Translate the origin to the right.
 * translate(30, 0, 0);
 * // Style the box.
 * fill(0, 0, 255);
 * // Draw the box.
 * box(20);
 * pop();
 * }
 * 
 * // Change the camera's focus when the user double-clicks.
 * function doubleClicked() {
 * if (isLookingLeft === true) {
 * cam.lookAt(30, 0, 0);
 * isLookingLeft = false;
 * } else {
 * cam.lookAt(-30, 0, 0);
 * isLookingLeft = true;
 * }
 * }
 * </code>
 * </div>
 */
function lookAt(x: number, y: number, z: number): void;

/**
 * Sets the position and orientation of the camera.`myCamera.camera()` allows objects to be viewed from different angles. It
 * has nine parameters that are all optional.The first three parameters, `x`, `y`, and `z`, are the coordinates of the
 * camera’s position in "world" space. For example, calling
 * `myCamera.camera(0, 0, 0)` places the camera at the origin `(0, 0, 0)`. By
 * default, the camera is placed at `(0, 0, 800)`.The next three parameters, `centerX`, `centerY`, and `centerZ` are the
 * coordinates of the point where the camera faces in "world" space. For
 * example, calling `myCamera.camera(0, 0, 0, 10, 20, 30)` places the camera
 * at the origin `(0, 0, 0)` and points it at `(10, 20, 30)`. By default, the
 * camera points at the origin `(0, 0, 0)`.The last three parameters, `upX`, `upY`, and `upZ` are the components of
 * the "up" vector in "local" space. The "up" vector orients the camera’s
 * y-axis. For example, calling
 * `myCamera.camera(0, 0, 0, 10, 20, 30, 0, -1, 0)` places the camera at the
 * origin `(0, 0, 0)`, points it at `(10, 20, 30)`, and sets the "up" vector
 * to `(0, -1, 0)` which is like holding it upside-down. By default, the "up"
 * vector is `(0, 1, 0)`.
 *
 * @for p5.Camera
 * @param x-coordinate of the camera. Defaults to 0.
 * @param y-coordinate of the camera. Defaults to 0.
 * @param z-coordinate of the camera. Defaults to 800.
 * @param x-coordinate of the point the camera faces. Defaults to 0.
 * @param y-coordinate of the point the camera faces. Defaults to 0.
 * @param z-coordinate of the point the camera faces. Defaults to 0.
 * @param x-component of the camera’s "up" vector. Defaults to 0.
 * @param x-component of the camera’s "up" vector. Defaults to 1.
 * @param z-component of the camera’s "up" vector. Defaults to 0.
 * @example <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Place it at the top-right: (1200, -600, 100)
 * // Point it at the row of boxes: (-10, -10, 400)
 * // Set its "up" vector to the default: (0, 1, 0)
 * cam2.camera(1200, -600, 100, -10, -10, 400, 0, 1, 0);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe(
 * 'A row of white cubes against a gray background. The camera toggles between a frontal and an aerial view when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 500);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -30);
 * box(10);
 * }
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Place it at the right: (1200, 0, 100)
 * // Point it at the row of boxes: (-10, -10, 400)
 * // Set its "up" vector to the default: (0, 1, 0)
 * cam2.camera(1200, 0, 100, -10, -10, 400, 0, 1, 0);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe(
 * 'A row of white cubes against a gray background. The camera toggles between a static frontal view and an orbiting view when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Update cam2's position.
 * let x = 1200 * cos(frameCount * 0.01);
 * let y = -600 * sin(frameCount * 0.01);
 * cam2.camera(x, y, 100, -10, -10, 400, 0, 1, 0);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 500);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -30);
 * box(10);
 * }
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 */
function camera(eyeX: any, eyeY: any, eyeZ: any, centerX?: number, centerY?: number, centerZ?: number, upX?: number, upY?: number, upZ?: number, x?: number, y?: number, z?: number): void;

/**
 * Moves the camera along its "local" axes without changing its orientation.The parameters, `x`, `y`, and `z`, are the distances the camera should
 * move. For example, calling `myCamera.move(10, 20, 30)` moves the camera 10
 * pixels to the right, 20 pixels down, and 30 pixels backward in its "local"
 * space.
 *
 * @param distance to move along the camera’s "local" x-axis.
 * @param distance to move along the camera’s "local" y-axis.
 * @param distance to move along the camera’s "local" z-axis.
 * @example <div>
 * <code>
 * // Click the canvas to begin detecting key presses.
 * 
 * let cam;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam = createCamera();
 * 
 * // Place the camera at the top-right.
 * cam.setPosition(400, -400, 800);
 * 
 * // Point it at the origin.
 * cam.lookAt(0, 0, 0);
 * 
 * // Set the camera.
 * setCamera(cam);
 * 
 * describe(
 * 'A white cube drawn against a gray background. The cube appears to move when the user presses certain keys.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Move the camera along its "local" axes
 * // when the user presses certain keys.
 * 
 * // Move horizontally.
 * if (keyIsDown(LEFT_ARROW)) {
 * cam.move(-1, 0, 0);
 * }
 * if (keyIsDown(RIGHT_ARROW)) {
 * cam.move(1, 0, 0);
 * }
 * 
 * // Move vertically.
 * if (keyIsDown(UP_ARROW)) {
 * cam.move(0, -1, 0);
 * }
 * if (keyIsDown(DOWN_ARROW)) {
 * cam.move(0, 1, 0);
 * }
 * 
 * // Move in/out of the screen.
 * if (keyIsDown('i')) {
 * cam.move(0, 0, -1);
 * }
 * if (keyIsDown('o')) {
 * cam.move(0, 0, 1);
 * }
 * 
 * // Draw the box.
 * box();
 * }
 * </code>
 * </div>
 */
function move(x: number, y: number, z: number): void;

/**
 * Sets the camera’s position in "world" space without changing its
 * orientation.The parameters, `x`, `y`, and `z`, are the coordinates where the camera
 * should be placed. For example, calling `myCamera.setPosition(10, 20, 30)`
 * places the camera at coordinates `(10, 20, 30)` in "world" space.
 *
 * @param x-coordinate in "world" space.
 * @param y-coordinate in "world" space.
 * @param z-coordinate in "world" space.
 * @example <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Place it closer to the origin.
 * cam2.setPosition(0, 0, 600);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe(
 * 'A row of white cubes against a gray background. The camera toggles the amount of zoom when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 500);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -30);
 * box(10);
 * }
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let isDefaultCamera = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Place it closer to the origin.
 * cam2.setPosition(0, 0, 600);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe(
 * 'A row of white cubes against a gray background. The camera toggles between a static view and a view that zooms in and out when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Update cam2's z-coordinate.
 * let z = 100 * sin(frameCount * 0.01) + 700;
 * cam2.setPosition(0, 0, z);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 500);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -30);
 * box(10);
 * }
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (isDefaultCamera === true) {
 * setCamera(cam2);
 * isDefaultCamera = false;
 * } else {
 * setCamera(cam1);
 * isDefaultCamera = true;
 * }
 * }
 * </code>
 * </div>
 */
function setPosition(x: number, y: number, z: number): void;

/**
 * Sets the camera’s position, orientation, and projection by copying another
 * camera.The parameter, `cam`, is the `p5.Camera` object to copy. For example, calling
 * `cam2.set(cam1)` will set `cam2` using `cam1`’s configuration.
 *
 * @param camera to copy.
 * @example <div>
 * <code>
 * // Double-click to "reset" the camera zoom.
 * 
 * let cam1;
 * let cam2;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * cam1 = createCamera();
 * 
 * // Place the camera at the top-right.
 * cam1.setPosition(400, -400, 800);
 * 
 * // Point it at the origin.
 * cam1.lookAt(0, 0, 0);
 * 
 * // Create the second camera.
 * cam2 = createCamera();
 * 
 * // Copy cam1's configuration.
 * cam2.set(cam1);
 * 
 * // Set the camera.
 * setCamera(cam2);
 * 
 * describe(
 * 'A white cube drawn against a gray background. The camera slowly moves forward. The camera resets when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Update cam2's position.
 * cam2.move(0, 0, -1);
 * 
 * // Draw the box.
 * box();
 * }
 * 
 * // "Reset" the camera when the user double-clicks.
 * function doubleClicked() {
 * cam2.set(cam1);
 * }
 */
function set(cam: p5.Camera): void;

/**
 * Sets the camera’s position and orientation to values that are in-between
 * those of two other cameras.`myCamera.slerp()` uses spherical linear interpolation to calculate a
 * position and orientation that’s in-between two other cameras. Doing so is
 * helpful for transitioning smoothly between two perspectives.The first two parameters, `cam0` and `cam1`, are the `p5.Camera` objects
 * that should be used to set the current camera.The third parameter, `amt`, is the amount to interpolate between `cam0` and
 * `cam1`. 0.0 keeps the camera’s position and orientation equal to `cam0`’s,
 * 0.5 sets them halfway between `cam0`’s and `cam1`’s , and 1.0 sets the
 * position and orientation equal to `cam1`’s.For example, calling `myCamera.slerp(cam0, cam1, 0.1)` sets cam’s position
 * and orientation very close to `cam0`’s. Calling
 * `myCamera.slerp(cam0, cam1, 0.9)` sets cam’s position and orientation very
 * close to `cam1`’s.Note: All of the cameras must use the same projection.
 *
 * @param first camera.
 * @param second camera.
 * @param amount of interpolation between 0.0 (`cam0`) and 1.0 (`cam1`).
 * @example <div>
 * <code>
 * let cam;
 * let cam0;
 * let cam1;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the main camera.
 * // Keep its default settings.
 * cam = createCamera();
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam0 = createCamera();
 * 
 * // Create the second camera.
 * cam1 = createCamera();
 * 
 * // Place it at the top-right.
 * cam1.setPosition(400, -400, 800);
 * 
 * // Point it at the origin.
 * cam1.lookAt(0, 0, 0);
 * 
 * // Set the current camera to cam.
 * setCamera(cam);
 * 
 * describe('A white cube drawn against a gray background. The camera slowly oscillates between a frontal view and an aerial view.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the amount to interpolate between cam0 and cam1.
 * let amt = 0.5 * sin(frameCount * 0.01) + 0.5;
 * 
 * // Update the main camera's position and orientation.
 * cam.slerp(cam0, cam1, amt);
 * 
 * box();
 * }
 * </code>
 * </div>
 */
function slerp(cam0: p5.Camera, cam1: p5.Camera, amt: number): void;

/**
 * Rotates the camera in a clockwise/counter-clockwise direction.Rolling rotates the camera without changing its orientation. The rotation
 * happens in the camera’s "local" space.The parameter, `angle`, is the angle the camera should rotate. Passing a
 * positive angle, as in `myCamera.roll(0.001)`, rotates the camera in counter-clockwise direction.
 * Passing a negative angle, as in `myCamera.roll(-0.001)`, rotates the
 * camera in clockwise direction.Note: Angles are interpreted based on the current
 * angleMode().
 *
 * @param amount to rotate camera in current
 * <a href="#/p5/angleMode">angleMode</a> units.
 * @example <div>
 * <code>
 * let cam;
 * let delta = 0.01;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * normalMaterial();
 * // Create a p5.Camera object.
 * cam = createCamera();
 * 
 * // Set the camera
 * setCamera(cam);
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Roll camera according to angle 'delta'
 * cam.roll(delta);
 * 
 * translate(0, 0, 0);
 * box(20);
 * translate(0, 25, 0);
 * box(20);
 * translate(0, 26, 0);
 * box(20);
 * translate(0, 27, 0);
 * box(20);
 * translate(0, 28, 0);
 * box(20);
 * translate(0,29, 0);
 * box(20);
 * translate(0, 30, 0);
 * box(20);
 * }
 * </code>
 * </div>
 * @alt camera view rotates in counter clockwise direction with vertically stacked boxes in front of it.
 */
function roll(angle: number): void;

/**
 * Sets the position and orientation of the current camera in a 3D sketch.`camera()` allows objects to be viewed from different angles. It has nine
 * parameters that are all optional.The first three parameters, `x`, `y`, and `z`, are the coordinates of the
 * camera’s position. For example, calling `camera(0, 0, 0)` places the camera
 * at the origin `(0, 0, 0)`. By default, the camera is placed at
 * `(0, 0, 800)`.The next three parameters, `centerX`, `centerY`, and `centerZ` are the
 * coordinates of the point where the camera faces. For example, calling
 * `camera(0, 0, 0, 10, 20, 30)` places the camera at the origin `(0, 0, 0)`
 * and points it at `(10, 20, 30)`. By default, the camera points at the
 * origin `(0, 0, 0)`.The last three parameters, `upX`, `upY`, and `upZ` are the components of
 * the "up" vector. The "up" vector orients the camera’s y-axis. For example,
 * calling `camera(0, 0, 0, 10, 20, 30, 0, -1, 0)` places the camera at the
 * origin `(0, 0, 0)`, points it at `(10, 20, 30)`, and sets the "up" vector
 * to `(0, -1, 0)` which is like holding it upside-down. By default, the "up"
 * vector is `(0, 1, 0)`.Note: `camera()` can only be used in WebGL mode.
 *
 * @for p5
 * @param x-coordinate of the camera. Defaults to 0.
 * @param y-coordinate of the camera. Defaults to 0.
 * @param z-coordinate of the camera. Defaults to 800.
 * @param x-coordinate of the point the camera faces. Defaults to 0.
 * @param y-coordinate of the point the camera faces. Defaults to 0.
 * @param z-coordinate of the point the camera faces. Defaults to 0.
 * @param x-component of the camera’s "up" vector. Defaults to 0.
 * @param y-component of the camera’s "up" vector. Defaults to 1.
 * @param z-component of the camera’s "up" vector. Defaults to 0.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white cube on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Move the camera to the top-right.
 * camera(200, -400, 800);
 * 
 * // Draw the box.
 * box();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white cube apperas to sway left and right on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Calculate the camera's x-coordinate.
 * let x = 400 * cos(frameCount * 0.01);
 * 
 * // Orbit the camera around the box.
 * camera(x, -400, 800);
 * 
 * // Draw the box.
 * box();
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Adjust the range sliders to change the camera's position.
 * 
 * let xSlider;
 * let ySlider;
 * let zSlider;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create slider objects to set the camera's coordinates.
 * xSlider = createSlider(-400, 400, 400);
 * xSlider.position(0, 100);
 * xSlider.size(100);
 * ySlider = createSlider(-400, 400, -200);
 * ySlider.position(0, 120);
 * ySlider.size(100);
 * zSlider = createSlider(0, 1600, 800);
 * zSlider.position(0, 140);
 * zSlider.size(100);
 * 
 * describe(
 * 'A white cube drawn against a gray background. Three range sliders appear beneath the image. The camera position changes when the user moves the sliders.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Get the camera's coordinates from the sliders.
 * let x = xSlider.value();
 * let y = ySlider.value();
 * let z = zSlider.value();
 * 
 * // Move the camera.
 * camera(x, y, z);
 * 
 * // Draw the box.
 * box();
 * }
 * </code>
 * </div>
 */
function camera(x?: number, y?: number, z?: number, centerX?: number, centerY?: number, centerZ?: number, upX?: number, upY?: number, upZ?: number): void;

/**
 * Sets a perspective projection for the current camera in a 3D sketch.In a perspective projection, shapes that are further from the camera appear
 * smaller than shapes that are near the camera. This technique, called
 * foreshortening, creates realistic 3D scenes. It’s applied by default in
 * WebGL mode.`perspective()` changes the camera’s perspective by changing its viewing
 * frustum. The frustum is the volume of space that’s visible to the camera.
 * Its shape is a pyramid with its top cut off. The camera is placed where
 * the top of the pyramid should be and views everything between the frustum’s
 * top (near) plane and its bottom (far) plane.The first parameter, `fovy`, is the camera’s vertical field of view. It’s
 * an angle that describes how tall or narrow a view the camera has. For
 * example, calling `perspective(0.5)` sets the camera’s vertical field of
 * view to 0.5 radians. By default, `fovy` is calculated based on the sketch’s
 * height and the camera’s default z-coordinate, which is 800. The formula for
 * the default `fovy` is `2 * atan(height / 2 / 800)`.The second parameter, `aspect`, is the camera’s aspect ratio. It’s a number
 * that describes the ratio of the top plane’s width to its height. For
 * example, calling `perspective(0.5, 1.5)` sets the camera’s field of view to
 * 0.5 radians and aspect ratio to 1.5, which would make shapes appear thinner
 * on a square canvas. By default, aspect is set to `width / height`.The third parameter, `near`, is the distance from the camera to the near
 * plane. For example, calling `perspective(0.5, 1.5, 100)` sets the camera’s
 * field of view to 0.5 radians, its aspect ratio to 1.5, and places the near
 * plane 100 pixels from the camera. Any shapes drawn less than 100 pixels
 * from the camera won’t be visible. By default, near is set to `0.1 * 800`,
 * which is 1/10th the default distance between the camera and the origin.The fourth parameter, `far`, is the distance from the camera to the far
 * plane. For example, calling `perspective(0.5, 1.5, 100, 10000)` sets the
 * camera’s field of view to 0.5 radians, its aspect ratio to 1.5, places the
 * near plane 100 pixels from the camera, and places the far plane 10,000
 * pixels from the camera. Any shapes drawn more than 10,000 pixels from the
 * camera won’t be visible. By default, far is set to `10 * 800`, which is 10
 * times the default distance between the camera and the origin.Note: `perspective()` can only be used in WebGL mode.
 *
 * @for p5
 * @param camera frustum vertical field of view. Defaults to
 * `2 * atan(height / 2 / 800)`.
 * @param camera frustum aspect ratio. Defaults to
 * `width / height`.
 * @param distance from the camera to the near clipping plane.
 * Defaults to `0.1 * 800`.
 * @param distance from the camera to the far clipping plane.
 * Defaults to `10 * 800`.
 * @example <div>
 * <code>
 * // Double-click to squeeze the box.
 * 
 * let isSqueezed = false;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white rectangular prism on a gray background. The box appears to become thinner when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Place the camera at the top-right.
 * camera(400, -400, 800);
 * 
 * if (isSqueezed === true) {
 * // Set fovy to 0.2.
 * // Set aspect to 1.5.
 * perspective(0.2, 1.5);
 * }
 * 
 * // Draw the box.
 * box();
 * }
 * 
 * // Change the camera's perspective when the user double-clicks.
 * function doubleClicked() {
 * isSqueezed = true;
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white rectangular prism on a gray background. The prism moves away from the camera until it disappears.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Place the camera at the top-right.
 * camera(400, -400, 800);
 * 
 * // Set fovy to 0.2.
 * // Set aspect to 1.5.
 * // Set near to 600.
 * // Set far to 1200.
 * perspective(0.2, 1.5, 600, 1200);
 * 
 * // Move the origin away from the camera.
 * let x = -frameCount;
 * let y = frameCount;
 * let z = -2 * frameCount;
 * translate(x, y, z);
 * 
 * // Draw the box.
 * box();
 * }
 * </code>
 * </div>
 */
function perspective(fovy?: number, aspect?: number, near?: number, far?: number): void;

/**
 * Enables or disables perspective for lines in 3D sketches.In WebGL mode, lines can be drawn with a thinner stroke when they’re
 * further from the camera. Doing so gives them a more realistic appearance.By default, lines are drawn differently based on the type of perspective
 * being used:`linePerspective()` can override the default line drawing mode.The parameter, `enable`, is optional. It’s a `Boolean` value that sets the
 * way lines are drawn. If `true` is passed, as in `linePerspective(true)`,
 * then lines will appear thinner when they are further from the camera. If
 * `false` is passed, as in `linePerspective(false)`, then lines will have
 * consistent stroke weights regardless of their distance from the camera. By
 * default, `linePerspective()` is enabled.Calling `linePerspective()` without passing an argument returns `true` if
 * it's enabled and `false` if not.Note: `linePerspective()` can only be used in WebGL mode.
 *
 * @for p5
 * @param whether to enable line perspective.
 * @example <div>
 * <code>
 * // Double-click the canvas to toggle the line perspective.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe(
 * 'A white cube with black edges on a gray background. Its edges toggle between thick and thin when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 600);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -40);
 * box(10);
 * }
 * }
 * 
 * // Toggle the line perspective when the user double-clicks.
 * function doubleClicked() {
 * let isEnabled = linePerspective();
 * linePerspective(!isEnabled);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * // Double-click the canvas to toggle the line perspective.
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe(
 * 'A row of cubes with black edges on a gray background. Their edges toggle between thick and thin when the user double-clicks.'
 * );
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Use an orthographic projection.
 * ortho();
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 600);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -40);
 * box(10);
 * }
 * }
 * 
 * // Toggle the line perspective when the user double-clicks.
 * function doubleClicked() {
 * let isEnabled = linePerspective();
 * linePerspective(!isEnabled);
 * }
 * </code>
 * </div>
 */
function linePerspective(enable: boolean): void;

/**
 * @return whether line perspective is enabled.
 */
function linePerspective(): boolean;

/**
 * Sets an orthographic projection for the current camera in a 3D sketch.In an orthographic projection, shapes with the same size always appear the
 * same size, regardless of whether they are near or far from the camera.`ortho()` changes the camera’s perspective by changing its viewing frustum
 * from a truncated pyramid to a rectangular prism. The camera is placed in
 * front of the frustum and views everything between the frustum’s near plane
 * and its far plane. `ortho()` has six optional parameters to define the
 * frustum.The first four parameters, `left`, `right`, `bottom`, and `top`, set the
 * coordinates of the frustum’s sides, bottom, and top. For example, calling
 * `ortho(-100, 100, 200, -200)` creates a frustum that’s 200 pixels wide and
 * 400 pixels tall. By default, these coordinates are set based on the
 * sketch’s width and height, as in
 * `ortho(-width / 2, width / 2, -height / 2, height / 2)`.The last two parameters, `near` and `far`, set the distance of the
 * frustum’s near and far plane from the camera. For example, calling
 * `ortho(-100, 100, 200, 200, 50, 1000)` creates a frustum that’s 200 pixels
 * wide, 400 pixels tall, starts 50 pixels from the camera, and ends 1,000
 * pixels from the camera. By default, `near` and `far` are set to 0 and
 * `max(width, height) + 800`, respectively.Note: `ortho()` can only be used in WebGL mode.
 *
 * @for p5
 * @param x-coordinate of the frustum’s left plane. Defaults to `-width / 2`.
 * @param x-coordinate of the frustum’s right plane. Defaults to `width / 2`.
 * @param y-coordinate of the frustum’s bottom plane. Defaults to `height / 2`.
 * @param y-coordinate of the frustum’s top plane. Defaults to `-height / 2`.
 * @param z-coordinate of the frustum’s near plane. Defaults to 0.
 * @param z-coordinate of the frustum’s far plane. Defaults to `max(width, height) + 800`.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A row of tiny, white cubes on a gray background. All the cubes appear the same size.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Apply an orthographic projection.
 * ortho();
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 600);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -40);
 * box(10);
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A white cube on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Apply an orthographic projection.
 * // Center the frustum.
 * // Set its width and height to 20.
 * // Place its near plane 300 pixels from the camera.
 * // Place its far plane 350 pixels from the camera.
 * ortho(-10, 10, -10, 10, 300, 350);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 600);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -40);
 * box(10);
 * }
 * }
 * </code>
 * </div>
 */
function ortho(left?: number, right?: number, bottom?: number, top?: number, near?: number, far?: number): void;

/**
 * Sets the frustum of the current camera in a 3D sketch.In a frustum projection, shapes that are further from the camera appear
 * smaller than shapes that are near the camera. This technique, called
 * foreshortening, creates realistic 3D scenes.`frustum()` changes the default camera’s perspective by changing its
 * viewing frustum. The frustum is the volume of space that’s visible to the
 * camera. The frustum’s shape is a pyramid with its top cut off. The camera
 * is placed where the top of the pyramid should be and points towards the
 * base of the pyramid. It views everything within the frustum.The first four parameters, `left`, `right`, `bottom`, and `top`, set the
 * coordinates of the frustum’s sides, bottom, and top. For example, calling
 * `frustum(-100, 100, 200, -200)` creates a frustum that’s 200 pixels wide
 * and 400 pixels tall. By default, these coordinates are set based on the
 * sketch’s width and height, as in
 * `ortho(-width / 20, width / 20, height / 20, -height / 20)`.The last two parameters, `near` and `far`, set the distance of the
 * frustum’s near and far plane from the camera. For example, calling
 * `ortho(-100, 100, 200, -200, 50, 1000)` creates a frustum that’s 200 pixels
 * wide, 400 pixels tall, starts 50 pixels from the camera, and ends 1,000
 * pixels from the camera. By default, near is set to `0.1 * 800`, which is
 * 1/10th the default distance between the camera and the origin. `far` is set
 * to `10 * 800`, which is 10 times the default distance between the camera
 * and the origin.Note: `frustum()` can only be used in WebGL mode.
 *
 * @for p5
 * @param x-coordinate of the frustum’s left plane. Defaults to `-width / 20`.
 * @param x-coordinate of the frustum’s right plane. Defaults to `width / 20`.
 * @param y-coordinate of the frustum’s bottom plane. Defaults to `height / 20`.
 * @param y-coordinate of the frustum’s top plane. Defaults to `-height / 20`.
 * @param z-coordinate of the frustum’s near plane. Defaults to `0.1 * 800`.
 * @param z-coordinate of the frustum’s far plane. Defaults to `10 * 800`.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * describe('A row of white cubes on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Apply the default frustum projection.
 * frustum();
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 600);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -40);
 * box(10);
 * }
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * describe('A white cube on a gray background.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Adjust the frustum.
 * // Center it.
 * // Set its width and height to 20 pixels.
 * // Place its near plane 300 pixels from the camera.
 * // Place its far plane 350 pixels from the camera.
 * frustum(-10, 10, -10, 10, 300, 350);
 * 
 * // Translate the origin toward the camera.
 * translate(-10, 10, 600);
 * 
 * // Rotate the coordinate system.
 * rotateY(-0.1);
 * rotateX(-0.1);
 * 
 * // Draw the row of boxes.
 * for (let i = 0; i < 6; i += 1) {
 * translate(0, 0, -40);
 * box(10);
 * }
 * }
 * </code>
 * </div>
 */
function frustum(left?: number, right?: number, bottom?: number, top?: number, near?: number, far?: number): void;

/**
 * Creates a new p5.Camera object and sets it
 * as the current (active) camera.The new camera is initialized with a default position `(0, 0, 800)` and a
 * default perspective projection. Its properties can be controlled with
 * p5.Camera methods such as
 * `myCamera.lookAt(0, 0, 0)`.Note: Every 3D sketch starts with a default camera initialized.
 * This camera can be controlled with the functions
 * camera(),
 * perspective(),
 * ortho(), and
 * frustum() if it's the only camera in the scene.Note: `createCamera()` can only be used in WebGL mode.
 *
 * @return the new camera.
 * @for p5
 * @example <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let usingCam1 = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * // Place it at the top-left.
 * // Point it at the origin.
 * cam2 = createCamera();
 * cam2.setPosition(400, -400, 800);
 * cam2.lookAt(0, 0, 0);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe('A white cube on a gray background. The camera toggles between frontal and aerial views when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw the box.
 * box();
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (usingCam1 === true) {
 * setCamera(cam2);
 * usingCam1 = false;
 * } else {
 * setCamera(cam1);
 * usingCam1 = true;
 * }
 * }
 * </code>
 * </div>
 */
function createCamera(): p5.Camera;

/**
 * Sets the current (active) camera of a 3D sketch.`setCamera()` allows for switching between multiple cameras created with
 * createCamera().Note: `setCamera()` can only be used in WebGL mode.
 *
 * @param camera that should be made active.
 * @for p5
 * @example <div>
 * <code>
 * // Double-click to toggle between cameras.
 * 
 * let cam1;
 * let cam2;
 * let usingCam1 = true;
 * 
 * function setup() {
 * createCanvas(100, 100, WEBGL);
 * 
 * // Create the first camera.
 * // Keep its default settings.
 * cam1 = createCamera();
 * 
 * // Create the second camera.
 * // Place it at the top-left.
 * // Point it at the origin.
 * cam2 = createCamera();
 * cam2.setPosition(400, -400, 800);
 * cam2.lookAt(0, 0, 0);
 * 
 * // Set the current camera to cam1.
 * setCamera(cam1);
 * 
 * describe('A white cube on a gray background. The camera toggles between frontal and aerial views when the user double-clicks.');
 * }
 * 
 * function draw() {
 * background(200);
 * 
 * // Draw the box.
 * box();
 * }
 * 
 * // Toggle the current camera when the user double-clicks.
 * function doubleClicked() {
 * if (usingCam1 === true) {
 * setCamera(cam2);
 * usingCam1 = false;
 * } else {
 * setCamera(cam1);
 * usingCam1 = true;
 * }
 * }
 * </code>
 * </div>
 */
function setCamera(cam: p5.Camera): void;

}

export default function p5_Camera(p5: any, fn: any): void;
