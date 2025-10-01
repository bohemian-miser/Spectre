// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
  /**
   * Version of this p5.js.
   */
  const VERSION: P5.VERSION;

  /**
   * The default, two-dimensional renderer in p5.js.Use this when calling  (for example,
`createCanvas(400, 400, P2D)`) to specify a 2D context.
   */
  type P2D = 'p2d';

  /**
   * A high-dynamic-range (HDR) variant of the default, two-dimensional renderer.When available, this mode can allow for extended color ranges and more
dynamic color representation. Use it similarly to `P2D`:
`createCanvas(400, 400, P2DHDR)`.
   */
  type P2DHDR = 'p2d-hdr';

  /**
   * One of the two render modes in p5.js, used for computationally intensive tasks like 3D rendering and shaders.`WEBGL` differs from the default `P2D` renderer in the following ways:To learn more about WEBGL mode, check out all the interactive WEBGL tutorials in the "Tutorials" section of this website, or read the wiki article "Getting started with WebGL in p5".
   */
  const WEBGL: P5.WEBGL;

  /**
   * One of the two possible values of a WebGL canvas (either WEBGL or WEBGL2),
which can be used to determine what capabilities the rendering environment
has.
   */
  const WEBGL2: P5.WEBGL2;

  type ARROW = 'default';

  const SIMPLE: P5.SIMPLE;

  const FULL: P5.FULL;

  type CROSS = 'crosshair';

  type HAND = 'pointer';

  type MOVE = 'move';

  type TEXT = 'text';

  type WAIT = 'wait';

  /**
   * A `Number` constant that's approximately 1.5708.`HALF_PI` is half the value of the mathematical constant π. It's useful for
many tasks that involve rotation and oscillation. For example, calling
`rotate(HALF_PI)` rotates the coordinate system `HALF_PI` radians, which is
a quarter turn (90˚).Note: `TWO_PI` radians equals 360˚, `PI` radians equals 180˚, `HALF_PI`
radians equals 90˚, and `QUARTER_PI` radians equals 45˚.
   */
  const HALF_PI: P5.HALF_PI;

  /**
   * A `Number` constant that's approximately 3.1416.`PI` is the mathematical constant π. It's useful for many tasks that
involve rotation and oscillation. For example, calling `rotate(PI)` rotates
the coordinate system `PI` radians, which is a half turn (180˚).Note: `TWO_PI` radians equals 360˚, `PI` radians equals 180˚, `HALF_PI`
radians equals 90˚, and `QUARTER_PI` radians equals 45˚.
   */
  const PI: P5.PI;

  /**
   * A `Number` constant that's approximately 0.7854.`QUARTER_PI` is one-fourth the value of the mathematical constant π. It's
useful for many tasks that involve rotation and oscillation. For example,
calling `rotate(QUARTER_PI)` rotates the coordinate system `QUARTER_PI`
radians, which is an eighth of a turn (45˚).Note: `TWO_PI` radians equals 360˚, `PI` radians equals 180˚, `HALF_PI`
radians equals 90˚, and `QUARTER_PI` radians equals 45˚.
   */
  const QUARTER_PI: P5.QUARTER_PI;

  /**
   * A `Number` constant that's approximately 6.2382.`TAU` is twice the value of the mathematical constant π. It's useful for
many tasks that involve rotation and oscillation. For example, calling
`rotate(TAU)` rotates the coordinate system `TAU` radians, which is one
full turn (360˚). `TAU` and `TWO_PI` are equal.Note: `TAU` radians equals 360˚, `PI` radians equals 180˚, `HALF_PI`
radians equals 90˚, and `QUARTER_PI` radians equals 45˚.
   */
  const TAU: P5.TAU;

  /**
   * A `Number` constant that's approximately 6.2382.`TWO_PI` is twice the value of the mathematical constant π. It's useful for
many tasks that involve rotation and oscillation. For example, calling
`rotate(TWO_PI)` rotates the coordinate system `TWO_PI` radians, which is
one full turn (360˚). `TWO_PI` and `TAU` are equal.Note: `TWO_PI` radians equals 360˚, `PI` radians equals 180˚, `HALF_PI`
radians equals 90˚, and `QUARTER_PI` radians equals 45˚.
   */
  const TWO_PI: P5.TWO_PI;

  /**
   * A `String` constant that's used to set the
angleMode().By default, functions such as rotate() and
sin() expect angles measured in units of radians.
Calling `angleMode(RADIANS)` ensures that angles are measured in units of
radians. Doing so can be useful if the
angleMode() has been set to
DEGREES.Note: `TWO_PI` radians equals 360˚.
   */
  const DEG_TO_RAD: P5.DEG_TO_RAD;

  /**
   * A `String` constant that's used to set the
angleMode().By default, functions such as rotate() and
sin() expect angles measured in units of radians.
Calling `angleMode(RADIANS)` ensures that angles are measured in units of
radians. Doing so can be useful if the
angleMode() has been set to
DEGREES.Note: `TWO_PI` radians equals 360˚.
   */
  const DEG_TO_RAD: P5.DEG_TO_RAD;

  type CORNER = 'corner';

  type CORNERS = 'corners';

  type RADIUS = 'radius';

  type RIGHT = 'right';

  type LEFT = 'left';

  type CENTER = 'center';

  type TOP = 'top';

  type BOTTOM = 'bottom';

  type BASELINE = 'alphabetic';

  type POINTS = any;

  type LINES = any;

  const LINE_STRIP: P5.LINE_STRIP;

  type LINE_LOOP = any;

  type TRIANGLES = any;

  type TRIANGLE_FAN = any;

  type TRIANGLE_STRIP = any;

  type QUADS = 'quads';

  type QUAD_STRIP = 'quad_strip';

  type TESS = 'tess';

  type EMPTY_PATH = any;

  type PATH = any;

  type CLOSE = 'close';

  type OPEN = 'open';

  type CHORD = 'chord';

  type PIE = 'pie';

  type PROJECT = 'square';

  type SQUARE = 'butt';

  type ROUND = 'round';

  type BEVEL = 'bevel';

  type MITER = 'miter';

  /**
   * AUTO allows us to automatically set the width or height of an element (but not both),
based on the current height and width of the element. Only one parameter can
be passed to the size function as AUTO, at a time.
   */
  type AUTO = 'auto';

  type ALT = 'Alt';

  type BACKSPACE = 'Backspace';

  type CONTROL = 'Control' | 'Control';

  type DELETE = 'Delete';

  type DOWN_ARROW = 'ArrowDown';

  type ENTER = 'Enter';

  type ESCAPE = 'Escape';

  type LEFT_ARROW = 'ArrowLeft';

  type OPTION = 'Alt';

  type RETURN = 'Enter';

  type RIGHT_ARROW = 'ArrowRight';

  type SHIFT = 'Shift';

  type TAB = 'Tab';

  type UP_ARROW = 'ArrowUp';

  type BLEND = 'source-over';

  type REMOVE = 'destination-out';

  type ADD = 'lighter';

  type DARKEST = 'darken';

  type LIGHTEST = 'lighten';

  type DIFFERENCE = 'difference';

  type SUBTRACT = 'subtract';

  type EXCLUSION = 'exclusion';

  type MULTIPLY = 'multiply';

  type SCREEN = 'screen';

  type REPLACE = 'copy';

  type OVERLAY = 'overlay';

  type HARD_LIGHT = 'hard-light';

  type SOFT_LIGHT = 'soft-light';

  type DODGE = 'color-dodge';

  type BURN = 'color-burn';

  type THRESHOLD = 'threshold';

  type GRAY = 'gray';

  type OPAQUE = 'opaque';

  type INVERT = 'invert';

  type POSTERIZE = 'posterize';

  type DILATE = 'dilate';

  type ERODE = 'erode';

  type BLUR = 'blur';

  type NORMAL = 'normal';

  type ITALIC = 'italic';

  type BOLD = 'bold';

  type BOLDITALIC = 'bold italic';

  type CHAR = 'CHAR';

  type WORD = 'WORD';

  type LINEAR = 'linear';

  type QUADRATIC = 'quadratic';

  type BEZIER = 'bezier';

  type CURVE = 'curve';

  type STROKE = 'stroke';

  type FILL = 'fill';

  type TEXTURE = 'texture';

  type IMMEDIATE = 'immediate';

  type IMAGE = 'image';

  type NEAREST = 'nearest';

  type REPEAT = 'repeat';

  type CLAMP = 'clamp';

  type MIRROR = 'mirror';

  type FLAT = 'flat';

  type SMOOTH = 'smooth';

  type LANDSCAPE = 'landscape';

  type PORTRAIT = 'portrait';

  type GRID = 'grid';

  type AXES = 'axes';

  type LABEL = 'label';

  type FALLBACK = 'fallback';

  type CONTAIN = 'contain';

  type COVER = 'cover';

  type UNSIGNED_BYTE = 'unsigned-byte';

  type UNSIGNED_INT = 'unsigned-int';

  type FLOAT = 'float';

  type HALF_FLOAT = 'half-float';

  /**
   * The `splineProperty('ends')` mode where splines curve through
their first and last points.
   */
  const INCLUDE: P5.INCLUDE;

  /**
   * The `splineProperty('ends')` mode where the first and last points in a spline
affect the direction of the curve, but are not rendered.
   */
  const EXCLUDE: P5.EXCLUDE;

}

export default function constants(p5: any, fn: any): void;
