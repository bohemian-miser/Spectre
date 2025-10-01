// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';

declare module 'p5' {
  class Image {
    constructor(width: number, height: number);

  /**
   * Gets or sets the pixel density for high pixel density displays.By default, the density will be set to 1.Call this method with no arguments to get the default density, or pass
   * in a number to set the density. If a non-positive number is provided,
   * it defaults to 1.
 *
   * @param
   */
  pixelDensity(density: number): number;

  /**
   * Helper function for animating GIF-based images with time
 *
   * @param
   */
  _animateGif(pInst: any): void;

  /**
   * Loads the current value of each pixel in the image into the `img.pixels`
   * array.`img.loadPixels()` must be called before reading or modifying pixel
   * values.
   */
  loadPixels(): void;

  /**
   * Updates the canvas with the RGBA values in the
   * img.pixels array.`img.updatePixels()` only needs to be called after changing values in
   * the img.pixels array. Such changes can be
   * made directly after calling
   * img.loadPixels() or by calling
   * img.set().The optional parameters `x`, `y`, `width`, and `height` define a
   * subsection of the image to update. Doing so can improve performance in
   * some cases.If the image was loaded from a GIF, then calling `img.updatePixels()`
   * will update the pixels in current frame.
 *
   * @param
   * @param
   * @param
   * @param
   */
  updatePixels(x: number, y: number, w: number, h: number): void;

  /**
   * Gets a pixel or a region of pixels from the image.`img.get()` is easy to use but it's not as fast as
   * img.pixels. Use
   * img.pixels to read many pixel values.The version of `img.get()` with no parameters returns the entire image.The version of `img.get()` with two parameters, as in `img.get(10, 20)`,
   * interprets them as coordinates. It returns an array with the
   * `[R, G, B, A]` values of the pixel at the given point.The version of `img.get()` with four parameters, as in
   * `img,get(10, 20, 50, 90)`, interprets them as
   * coordinates and dimensions. The first two parameters are the coordinates
   * of the upper-left corner of the subsection. The last two parameters are
   * the width and height of the subsection. It returns a subsection of the
   * canvas in a new p5.Image object.Use `img.get()` instead of get() to work directly
   * with images.
 *
   * @param
   * @param
   * @param
   * @param
   */
  get(x: number, y: number, w: number, h: number): p5.Image;

  get(x: any, y: any, w: any, h: any): p5.Image;

  get(x: number, y: number, w: any, h: any): number[];

  /**
   * Sets the color of one or more pixels within an image.`img.set()` is easy to use but it's not as fast as
   * img.pixels. Use
   * img.pixels to set many pixel values.`img.set()` interprets the first two parameters as x- and y-coordinates. It
   * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
   * array, a p5.Color object, or another
   * p5.Image object.img.updatePixels() must be called
   * after using `img.set()` for changes to appear.
 *
   * @param
   * @param
   * @param
   * @param
   */
  set(x: number, y: number, imgOrCol: any, a: number | number[] | object): void;

  /**
   * Resizes the image to a given width and height.The image's original aspect ratio can be kept by passing 0 for either
   * `width` or `height`. For example, calling `img.resize(50, 0)` on an image
   * that was 500 × 300 pixels will resize it to 50 × 30 pixels.
 *
   * @param
   * @param
   */
  resize(width: number, height: number): void;

  /**
   * Copies pixels from a source image to this image.The first parameter, `srcImage`, is an optional
   * p5.Image object to copy. If a source image isn't
   * passed, then `img.copy()` can copy a region of this image to another
   * region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to copy from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of this image to copy into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the region's width and height.Calling `img.copy()` will scale pixels from the source region if it isn't
   * the same size as the destination region.
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
   */
  copy(args: any[], srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  copy(args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  /**
   * Masks part of the image with another.`img.mask()` uses another p5.Image object's
   * alpha channel as the alpha channel for this image. Masks are cumulative
   * and can't be removed once applied. If the mask has a different
   * pixel density from this image, the mask will be scaled.
 *
   * @param
   * @param
   */
  mask(p5Image: any, srcImage: p5.Image): void;

  /**
   * Applies an image filter to the image.The preset options are:`INVERT`
   * Inverts the colors in the image. No parameter is used.`GRAY`
   * Converts the image to grayscale. No parameter is used.`THRESHOLD`
   * Converts the image to black and white. Pixels with a grayscale value
   * above a given threshold are converted to white. The rest are converted to
   * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
   * value is specified, 0.5 is used.`OPAQUE`
   * Sets the alpha channel to be entirely opaque. No parameter is used.`POSTERIZE`
   * Limits the number of colors in the image. Each color channel is limited to
   * the number of colors specified. Values between 2 and 255 are valid, but
   * results are most noticeable with lower values. The default value is 4.`BLUR`
   * Blurs the image. The level of blurring is specified by a blur radius. Larger
   * values increase the blur. The default value is 4. A gaussian blur is used
   * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
   * Reduces the light areas. No parameter is used.`DILATE`
   * Increases the light areas. No parameter is used.
 *
   * @param
   * @param
   * @param
   * @param
   */
  filter(operation: any, value: any, filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | ERODE | DILATE | BLUR, filterParam: number): void;

  /**
   * Copies a region of pixels from another image into this one.The first parameter, `srcImage`, is the
   * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to blend from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
   * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
   * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
   * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`.
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
   */
  blend(args: any[], srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  blend(args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  /**
   * Saves the image to a file.By default, `img.save()` saves the image as a PNG image called
   * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
   * file's name. If a file extension is included, as in
   * `img.save('drawing.png')`, then the image will be saved using that
   * format.The second parameter, `extension`, is also optional. It sets the files format.
   * Either `'png'` or `'jpg'` can be used. For example, `img.save('drawing', 'jpg')`
   * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
   * with a dialogue window.The image will only be downloaded as an animated GIF if it was loaded
   * from a GIF file. See saveGif() to create new
   * GIFs.
 *
   * @param
   * @param
   */
  save(filename: string, extension: string): void;

  /**
   * Restarts an animated GIF at its first frame.
   */
  reset(): void;

  /**
   * Gets the index of the current frame in an animated GIF.
   */
  getCurrentFrame(): number;

  /**
   * Sets the current frame in an animated GIF.
 *
   * @param
   */
  setFrame(index: number): void;

  /**
   * Returns the number of frames in an animated GIF.
   */
  numFrames(): number;

  /**
   * Plays an animated GIF that was paused with
   * img.pause().
   */
  play(): void;

  /**
   * Pauses an animated GIF.The GIF can be resumed by calling
   * img.play().
   */
  pause(): void;

  /**
   * Changes the delay between frames in an animated GIF.The first parameter, `delay`, is the length of the delay in milliseconds.The second parameter, `index`, is optional. If provided, only the frame
   * at `index` will have its delay modified. All other frames will keep
   * their default delay.
 *
   * @param
   * @param
   */
  delay(d: number, index: number): void;

  /**
   * Gets or sets the pixel density for high pixel density displays.By default, the density will be set to 1.Call this method with no arguments to get the default density, or pass
   * in a number to set the density. If a non-positive number is provided,
   * it defaults to 1.
 *
   * @param
   */
  pixelDensity(density: number): number;

  /**
   * Helper function for animating GIF-based images with time
 *
   * @param
   */
  _animateGif(pInst: any): void;

  /**
   * Loads the current value of each pixel in the image into the `img.pixels`
   * array.`img.loadPixels()` must be called before reading or modifying pixel
   * values.
   */
  loadPixels(): void;

  /**
   * Updates the canvas with the RGBA values in the
   * img.pixels array.`img.updatePixels()` only needs to be called after changing values in
   * the img.pixels array. Such changes can be
   * made directly after calling
   * img.loadPixels() or by calling
   * img.set().The optional parameters `x`, `y`, `width`, and `height` define a
   * subsection of the image to update. Doing so can improve performance in
   * some cases.If the image was loaded from a GIF, then calling `img.updatePixels()`
   * will update the pixels in current frame.
 *
   * @param
   * @param
   * @param
   * @param
   */
  updatePixels(x: number, y: number, w: number, h: number): void;

  /**
   * Gets a pixel or a region of pixels from the image.`img.get()` is easy to use but it's not as fast as
   * img.pixels. Use
   * img.pixels to read many pixel values.The version of `img.get()` with no parameters returns the entire image.The version of `img.get()` with two parameters, as in `img.get(10, 20)`,
   * interprets them as coordinates. It returns an array with the
   * `[R, G, B, A]` values of the pixel at the given point.The version of `img.get()` with four parameters, as in
   * `img,get(10, 20, 50, 90)`, interprets them as
   * coordinates and dimensions. The first two parameters are the coordinates
   * of the upper-left corner of the subsection. The last two parameters are
   * the width and height of the subsection. It returns a subsection of the
   * canvas in a new p5.Image object.Use `img.get()` instead of get() to work directly
   * with images.
 *
   * @param
   * @param
   * @param
   * @param
   */
  get(x: number, y: number, w: number, h: number): p5.Image;

  get(x: any, y: any, w: any, h: any): p5.Image;

  get(x: number, y: number, w: any, h: any): number[];

  /**
   * Sets the color of one or more pixels within an image.`img.set()` is easy to use but it's not as fast as
   * img.pixels. Use
   * img.pixels to set many pixel values.`img.set()` interprets the first two parameters as x- and y-coordinates. It
   * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
   * array, a p5.Color object, or another
   * p5.Image object.img.updatePixels() must be called
   * after using `img.set()` for changes to appear.
 *
   * @param
   * @param
   * @param
   * @param
   */
  set(x: number, y: number, imgOrCol: any, a: number | number[] | object): void;

  /**
   * Resizes the image to a given width and height.The image's original aspect ratio can be kept by passing 0 for either
   * `width` or `height`. For example, calling `img.resize(50, 0)` on an image
   * that was 500 × 300 pixels will resize it to 50 × 30 pixels.
 *
   * @param
   * @param
   */
  resize(width: number, height: number): void;

  /**
   * Copies pixels from a source image to this image.The first parameter, `srcImage`, is an optional
   * p5.Image object to copy. If a source image isn't
   * passed, then `img.copy()` can copy a region of this image to another
   * region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to copy from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of this image to copy into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the region's width and height.Calling `img.copy()` will scale pixels from the source region if it isn't
   * the same size as the destination region.
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
   */
  copy(args: any[], srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  copy(args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  /**
   * Masks part of the image with another.`img.mask()` uses another p5.Image object's
   * alpha channel as the alpha channel for this image. Masks are cumulative
   * and can't be removed once applied. If the mask has a different
   * pixel density from this image, the mask will be scaled.
 *
   * @param
   * @param
   */
  mask(p5Image: any, srcImage: p5.Image): void;

  /**
   * Applies an image filter to the image.The preset options are:`INVERT`
   * Inverts the colors in the image. No parameter is used.`GRAY`
   * Converts the image to grayscale. No parameter is used.`THRESHOLD`
   * Converts the image to black and white. Pixels with a grayscale value
   * above a given threshold are converted to white. The rest are converted to
   * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
   * value is specified, 0.5 is used.`OPAQUE`
   * Sets the alpha channel to be entirely opaque. No parameter is used.`POSTERIZE`
   * Limits the number of colors in the image. Each color channel is limited to
   * the number of colors specified. Values between 2 and 255 are valid, but
   * results are most noticeable with lower values. The default value is 4.`BLUR`
   * Blurs the image. The level of blurring is specified by a blur radius. Larger
   * values increase the blur. The default value is 4. A gaussian blur is used
   * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
   * Reduces the light areas. No parameter is used.`DILATE`
   * Increases the light areas. No parameter is used.
 *
   * @param
   * @param
   * @param
   * @param
   */
  filter(operation: any, value: any, filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | ERODE | DILATE | BLUR, filterParam: number): void;

  /**
   * Copies a region of pixels from another image into this one.The first parameter, `srcImage`, is the
   * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to blend from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
   * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
   * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
   * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`.
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
   */
  blend(args: any[], srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  blend(args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  /**
   * Saves the image to a file.By default, `img.save()` saves the image as a PNG image called
   * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
   * file's name. If a file extension is included, as in
   * `img.save('drawing.png')`, then the image will be saved using that
   * format.The second parameter, `extension`, is also optional. It sets the files format.
   * Either `'png'` or `'jpg'` can be used. For example, `img.save('drawing', 'jpg')`
   * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
   * with a dialogue window.The image will only be downloaded as an animated GIF if it was loaded
   * from a GIF file. See saveGif() to create new
   * GIFs.
 *
   * @param
   * @param
   */
  save(filename: string, extension: string): void;

  /**
   * Restarts an animated GIF at its first frame.
   */
  reset(): void;

  /**
   * Gets the index of the current frame in an animated GIF.
   */
  getCurrentFrame(): number;

  /**
   * Sets the current frame in an animated GIF.
 *
   * @param
   */
  setFrame(index: number): void;

  /**
   * Returns the number of frames in an animated GIF.
   */
  numFrames(): number;

  /**
   * Plays an animated GIF that was paused with
   * img.pause().
   */
  play(): void;

  /**
   * Pauses an animated GIF.The GIF can be resumed by calling
   * img.play().
   */
  pause(): void;

  /**
   * Changes the delay between frames in an animated GIF.The first parameter, `delay`, is the length of the delay in milliseconds.The second parameter, `index`, is optional. If provided, only the frame
   * at `index` will have its delay modified. All other frames will keep
   * their default delay.
 *
   * @param
   * @param
   */
  delay(d: number, index: number): void;

  /**
   * Gets or sets the pixel density for high pixel density displays.By default, the density will be set to 1.Call this method with no arguments to get the default density, or pass
   * in a number to set the density. If a non-positive number is provided,
   * it defaults to 1.
 *
   * @param
   */
  pixelDensity(density: number): number;

  /**
   * Helper function for animating GIF-based images with time
 *
   * @param
   */
  _animateGif(pInst: any): void;

  /**
   * Loads the current value of each pixel in the image into the `img.pixels`
   * array.`img.loadPixels()` must be called before reading or modifying pixel
   * values.
   */
  loadPixels(): void;

  /**
   * Updates the canvas with the RGBA values in the
   * img.pixels array.`img.updatePixels()` only needs to be called after changing values in
   * the img.pixels array. Such changes can be
   * made directly after calling
   * img.loadPixels() or by calling
   * img.set().The optional parameters `x`, `y`, `width`, and `height` define a
   * subsection of the image to update. Doing so can improve performance in
   * some cases.If the image was loaded from a GIF, then calling `img.updatePixels()`
   * will update the pixels in current frame.
 *
   * @param
   * @param
   * @param
   * @param
   */
  updatePixels(x: number, y: number, w: number, h: number): void;

  /**
   * Gets a pixel or a region of pixels from the image.`img.get()` is easy to use but it's not as fast as
   * img.pixels. Use
   * img.pixels to read many pixel values.The version of `img.get()` with no parameters returns the entire image.The version of `img.get()` with two parameters, as in `img.get(10, 20)`,
   * interprets them as coordinates. It returns an array with the
   * `[R, G, B, A]` values of the pixel at the given point.The version of `img.get()` with four parameters, as in
   * `img,get(10, 20, 50, 90)`, interprets them as
   * coordinates and dimensions. The first two parameters are the coordinates
   * of the upper-left corner of the subsection. The last two parameters are
   * the width and height of the subsection. It returns a subsection of the
   * canvas in a new p5.Image object.Use `img.get()` instead of get() to work directly
   * with images.
 *
   * @param
   * @param
   * @param
   * @param
   */
  get(x: number, y: number, w: number, h: number): p5.Image;

  get(x: any, y: any, w: any, h: any): p5.Image;

  get(x: number, y: number, w: any, h: any): number[];

  /**
   * Sets the color of one or more pixels within an image.`img.set()` is easy to use but it's not as fast as
   * img.pixels. Use
   * img.pixels to set many pixel values.`img.set()` interprets the first two parameters as x- and y-coordinates. It
   * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
   * array, a p5.Color object, or another
   * p5.Image object.img.updatePixels() must be called
   * after using `img.set()` for changes to appear.
 *
   * @param
   * @param
   * @param
   * @param
   */
  set(x: number, y: number, imgOrCol: any, a: number | number[] | object): void;

  /**
   * Resizes the image to a given width and height.The image's original aspect ratio can be kept by passing 0 for either
   * `width` or `height`. For example, calling `img.resize(50, 0)` on an image
   * that was 500 × 300 pixels will resize it to 50 × 30 pixels.
 *
   * @param
   * @param
   */
  resize(width: number, height: number): void;

  /**
   * Copies pixels from a source image to this image.The first parameter, `srcImage`, is an optional
   * p5.Image object to copy. If a source image isn't
   * passed, then `img.copy()` can copy a region of this image to another
   * region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to copy from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of this image to copy into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the region's width and height.Calling `img.copy()` will scale pixels from the source region if it isn't
   * the same size as the destination region.
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
   */
  copy(args: any[], srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  copy(args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  /**
   * Masks part of the image with another.`img.mask()` uses another p5.Image object's
   * alpha channel as the alpha channel for this image. Masks are cumulative
   * and can't be removed once applied. If the mask has a different
   * pixel density from this image, the mask will be scaled.
 *
   * @param
   * @param
   */
  mask(p5Image: any, srcImage: p5.Image): void;

  /**
   * Applies an image filter to the image.The preset options are:`INVERT`
   * Inverts the colors in the image. No parameter is used.`GRAY`
   * Converts the image to grayscale. No parameter is used.`THRESHOLD`
   * Converts the image to black and white. Pixels with a grayscale value
   * above a given threshold are converted to white. The rest are converted to
   * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
   * value is specified, 0.5 is used.`OPAQUE`
   * Sets the alpha channel to be entirely opaque. No parameter is used.`POSTERIZE`
   * Limits the number of colors in the image. Each color channel is limited to
   * the number of colors specified. Values between 2 and 255 are valid, but
   * results are most noticeable with lower values. The default value is 4.`BLUR`
   * Blurs the image. The level of blurring is specified by a blur radius. Larger
   * values increase the blur. The default value is 4. A gaussian blur is used
   * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
   * Reduces the light areas. No parameter is used.`DILATE`
   * Increases the light areas. No parameter is used.
 *
   * @param
   * @param
   * @param
   * @param
   */
  filter(operation: any, value: any, filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | ERODE | DILATE | BLUR, filterParam: number): void;

  /**
   * Copies a region of pixels from another image into this one.The first parameter, `srcImage`, is the
   * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to blend from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
   * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
   * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
   * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`.
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
   */
  blend(args: any[], srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  blend(args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  /**
   * Saves the image to a file.By default, `img.save()` saves the image as a PNG image called
   * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
   * file's name. If a file extension is included, as in
   * `img.save('drawing.png')`, then the image will be saved using that
   * format.The second parameter, `extension`, is also optional. It sets the files format.
   * Either `'png'` or `'jpg'` can be used. For example, `img.save('drawing', 'jpg')`
   * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
   * with a dialogue window.The image will only be downloaded as an animated GIF if it was loaded
   * from a GIF file. See saveGif() to create new
   * GIFs.
 *
   * @param
   * @param
   */
  save(filename: string, extension: string): void;

  /**
   * Restarts an animated GIF at its first frame.
   */
  reset(): void;

  /**
   * Gets the index of the current frame in an animated GIF.
   */
  getCurrentFrame(): number;

  /**
   * Sets the current frame in an animated GIF.
 *
   * @param
   */
  setFrame(index: number): void;

  /**
   * Returns the number of frames in an animated GIF.
   */
  numFrames(): number;

  /**
   * Plays an animated GIF that was paused with
   * img.pause().
   */
  play(): void;

  /**
   * Pauses an animated GIF.The GIF can be resumed by calling
   * img.play().
   */
  pause(): void;

  /**
   * Changes the delay between frames in an animated GIF.The first parameter, `delay`, is the length of the delay in milliseconds.The second parameter, `index`, is optional. If provided, only the frame
   * at `index` will have its delay modified. All other frames will keep
   * their default delay.
 *
   * @param
   * @param
   */
  delay(d: number, index: number): void;

  /**
   * Gets or sets the pixel density for high pixel density displays.By default, the density will be set to 1.Call this method with no arguments to get the default density, or pass
   * in a number to set the density. If a non-positive number is provided,
   * it defaults to 1.
 *
   * @param
   */
  pixelDensity(density: number): number;

  /**
   * Helper function for animating GIF-based images with time
 *
   * @param
   */
  _animateGif(pInst: any): void;

  /**
   * Loads the current value of each pixel in the image into the `img.pixels`
   * array.`img.loadPixels()` must be called before reading or modifying pixel
   * values.
   */
  loadPixels(): void;

  /**
   * Updates the canvas with the RGBA values in the
   * img.pixels array.`img.updatePixels()` only needs to be called after changing values in
   * the img.pixels array. Such changes can be
   * made directly after calling
   * img.loadPixels() or by calling
   * img.set().The optional parameters `x`, `y`, `width`, and `height` define a
   * subsection of the image to update. Doing so can improve performance in
   * some cases.If the image was loaded from a GIF, then calling `img.updatePixels()`
   * will update the pixels in current frame.
 *
   * @param
   * @param
   * @param
   * @param
   */
  updatePixels(x: number, y: number, w: number, h: number): void;

  /**
   * Gets a pixel or a region of pixels from the image.`img.get()` is easy to use but it's not as fast as
   * img.pixels. Use
   * img.pixels to read many pixel values.The version of `img.get()` with no parameters returns the entire image.The version of `img.get()` with two parameters, as in `img.get(10, 20)`,
   * interprets them as coordinates. It returns an array with the
   * `[R, G, B, A]` values of the pixel at the given point.The version of `img.get()` with four parameters, as in
   * `img,get(10, 20, 50, 90)`, interprets them as
   * coordinates and dimensions. The first two parameters are the coordinates
   * of the upper-left corner of the subsection. The last two parameters are
   * the width and height of the subsection. It returns a subsection of the
   * canvas in a new p5.Image object.Use `img.get()` instead of get() to work directly
   * with images.
 *
   * @param
   * @param
   * @param
   * @param
   */
  get(x: number, y: number, w: number, h: number): p5.Image;

  get(x: any, y: any, w: any, h: any): p5.Image;

  get(x: number, y: number, w: any, h: any): number[];

  /**
   * Sets the color of one or more pixels within an image.`img.set()` is easy to use but it's not as fast as
   * img.pixels. Use
   * img.pixels to set many pixel values.`img.set()` interprets the first two parameters as x- and y-coordinates. It
   * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
   * array, a p5.Color object, or another
   * p5.Image object.img.updatePixels() must be called
   * after using `img.set()` for changes to appear.
 *
   * @param
   * @param
   * @param
   * @param
   */
  set(x: number, y: number, imgOrCol: any, a: number | number[] | object): void;

  /**
   * Resizes the image to a given width and height.The image's original aspect ratio can be kept by passing 0 for either
   * `width` or `height`. For example, calling `img.resize(50, 0)` on an image
   * that was 500 × 300 pixels will resize it to 50 × 30 pixels.
 *
   * @param
   * @param
   */
  resize(width: number, height: number): void;

  /**
   * Copies pixels from a source image to this image.The first parameter, `srcImage`, is an optional
   * p5.Image object to copy. If a source image isn't
   * passed, then `img.copy()` can copy a region of this image to another
   * region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to copy from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of this image to copy into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the region's width and height.Calling `img.copy()` will scale pixels from the source region if it isn't
   * the same size as the destination region.
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
   */
  copy(args: any[], srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  copy(args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  /**
   * Masks part of the image with another.`img.mask()` uses another p5.Image object's
   * alpha channel as the alpha channel for this image. Masks are cumulative
   * and can't be removed once applied. If the mask has a different
   * pixel density from this image, the mask will be scaled.
 *
   * @param
   * @param
   */
  mask(p5Image: any, srcImage: p5.Image): void;

  /**
   * Applies an image filter to the image.The preset options are:`INVERT`
   * Inverts the colors in the image. No parameter is used.`GRAY`
   * Converts the image to grayscale. No parameter is used.`THRESHOLD`
   * Converts the image to black and white. Pixels with a grayscale value
   * above a given threshold are converted to white. The rest are converted to
   * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
   * value is specified, 0.5 is used.`OPAQUE`
   * Sets the alpha channel to be entirely opaque. No parameter is used.`POSTERIZE`
   * Limits the number of colors in the image. Each color channel is limited to
   * the number of colors specified. Values between 2 and 255 are valid, but
   * results are most noticeable with lower values. The default value is 4.`BLUR`
   * Blurs the image. The level of blurring is specified by a blur radius. Larger
   * values increase the blur. The default value is 4. A gaussian blur is used
   * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
   * Reduces the light areas. No parameter is used.`DILATE`
   * Increases the light areas. No parameter is used.
 *
   * @param
   * @param
   * @param
   * @param
   */
  filter(operation: any, value: any, filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | ERODE | DILATE | BLUR, filterParam: number): void;

  /**
   * Copies a region of pixels from another image into this one.The first parameter, `srcImage`, is the
   * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
   * to blend from the source image. `(sx, sy)` is the top-left corner of the
   * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
   * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
   * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
   * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
   * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
   * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`.
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
   */
  blend(args: any[], srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  blend(args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

  /**
   * Saves the image to a file.By default, `img.save()` saves the image as a PNG image called
   * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
   * file's name. If a file extension is included, as in
   * `img.save('drawing.png')`, then the image will be saved using that
   * format.The second parameter, `extension`, is also optional. It sets the files format.
   * Either `'png'` or `'jpg'` can be used. For example, `img.save('drawing', 'jpg')`
   * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
   * with a dialogue window.The image will only be downloaded as an animated GIF if it was loaded
   * from a GIF file. See saveGif() to create new
   * GIFs.
 *
   * @param
   * @param
   */
  save(filename: string, extension: string): void;

  /**
   * Restarts an animated GIF at its first frame.
   */
  reset(): void;

  /**
   * Gets the index of the current frame in an animated GIF.
   */
  getCurrentFrame(): number;

  /**
   * Sets the current frame in an animated GIF.
 *
   * @param
   */
  setFrame(index: number): void;

  /**
   * Returns the number of frames in an animated GIF.
   */
  numFrames(): number;

  /**
   * Plays an animated GIF that was paused with
   * img.pause().
   */
  play(): void;

  /**
   * Pauses an animated GIF.The GIF can be resumed by calling
   * img.play().
   */
  pause(): void;

  /**
   * Changes the delay between frames in an animated GIF.The first parameter, `delay`, is the length of the delay in milliseconds.The second parameter, `index`, is optional. If provided, only the frame
   * at `index` will have its delay modified. All other frames will keep
   * their default delay.
 *
   * @param
   * @param
   */
  delay(d: number, index: number): void;

  }

/**
 * Gets or sets the pixel density for high pixel density displays.By default, the density will be set to 1.Call this method with no arguments to get the default density, or pass
 * in a number to set the density. If a non-positive number is provided,
 * it defaults to 1.
 *
 * @param A scaling factor for the number of pixels per
 * side
 * @returns The current density if called without arguments, or the instance for chaining if setting density.
 */
function pixelDensity(density?: number): number;

/**
 * Helper function for animating GIF-based images with time
 *
 */
function _animateGif(pInst: any): void;

/**
 * Loads the current value of each pixel in the image into the `img.pixels`
 * array.`img.loadPixels()` must be called before reading or modifying pixel
 * values.
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * for (let i = 0; i < img.pixels.length; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function loadPixels(): void;

/**
 * Updates the canvas with the RGBA values in the
 * img.pixels array.`img.updatePixels()` only needs to be called after changing values in
 * the img.pixels array. Such changes can be
 * made directly after calling
 * img.loadPixels() or by calling
 * img.set().The optional parameters `x`, `y`, `width`, and `height` define a
 * subsection of the image to update. Doing so can improve performance in
 * some cases.If the image was loaded from a GIF, then calling `img.updatePixels()`
 * will update the pixels in current frame.
 *
 * @param x-coordinate of the upper-left corner
 * of the subsection to update.
 * @param y-coordinate of the upper-left corner
 * of the subsection to update.
 * @param width of the subsection to update.
 * @param height of the subsection to update.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let i = 0; i < img.pixels.length; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function updatePixels(x: number, y: number, w: number, h: number): void;

/**
 * Gets a pixel or a region of pixels from the image.`img.get()` is easy to use but it's not as fast as
 * img.pixels. Use
 * img.pixels to read many pixel values.The version of `img.get()` with no parameters returns the entire image.The version of `img.get()` with two parameters, as in `img.get(10, 20)`,
 * interprets them as coordinates. It returns an array with the
 * `[R, G, B, A]` values of the pixel at the given point.The version of `img.get()` with four parameters, as in
 * `img,get(10, 20, 50, 90)`, interprets them as
 * coordinates and dimensions. The first two parameters are the coordinates
 * of the upper-left corner of the subsection. The last two parameters are
 * the width and height of the subsection. It returns a subsection of the
 * canvas in a new p5.Image object.Use `img.get()` instead of get() to work directly
 * with images.
 *
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param width of the subsection to be returned.
 * @param height of the subsection to be returned.
 * @return subsection as a <a href="#/p5.Image">p5.Image</a> object.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Copy the image.
 * let img2 = get();
 * 
 * // Display the copied image on the right.
 * image(img2, 50, 0);
 * 
 * describe('Two identical mountain landscapes shown side-by-side.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Get a pixel's color.
 * let c = img.get(50, 90);
 * 
 * // Style the square using the pixel's color.
 * fill(c);
 * noStroke();
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * 
 * describe('A mountain landscape with an olive green square in its center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Copy half of the image.
 * let img2 = img.get(0, 0, img.width / 2, img.height / 2);
 * 
 * // Display half of the image.
 * image(img2, 50, 50);
 * 
 * describe('A mountain landscape drawn on top of another mountain landscape.');
 * }
 * </code>
 * </div>
 */
function get(x: number, y: number, w: number, h: number): p5.Image;

/**
 * @return whole <a href="#/p5.Image">p5.Image</a>
 */
function get(x: any, y: any, w: any, h: any): p5.Image;

/**
 * @return color of the pixel at (x, y) in array format `[R, G, B, A]`.
 */
function get(x: number, y: number, w: any, h: any): number[];

/**
 * Sets the color of one or more pixels within an image.`img.set()` is easy to use but it's not as fast as
 * img.pixels. Use
 * img.pixels to set many pixel values.`img.set()` interprets the first two parameters as x- and y-coordinates. It
 * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
 * array, a p5.Color object, or another
 * p5.Image object.img.updatePixels() must be called
 * after using `img.set()` for changes to appear.
 *
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param grayscale value | pixel array |
 * <a href="#/p5.Color">p5.Color</a> object |
 * <a href="#/p5.Image">p5.Image</a> to copy.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(100, 100);
 * 
 * // Set four pixels to black.
 * img.set(30, 20, 0);
 * img.set(85, 20, 0);
 * img.set(85, 75, 0);
 * img.set(30, 75, 0);
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Image object.
 * let img = createImage(100, 100);
 * 
 * // Create a p5.Color object.
 * let black = color(0);
 * 
 * // Set four pixels to black.
 * img.set(30, 20, black);
 * img.set(85, 20, black);
 * img.set(85, 75, black);
 * img.set(30, 75, black);
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Draw a color gradient.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * let c = map(x, 0, img.width, 0, 255);
 * img.set(x, y, c);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A square with a horiztonal color gradient from black to white drawn on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Create a p5.Image object.
 * let img2 = createImage(100, 100);
 * 
 * // Set the blank image's pixels using the landscape.
 * img2.set(0, 0, img);
 * 
 * // Display the second image.
 * image(img2, 0, 0);
 * 
 * describe('An image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function set(x: number, y: number, imgOrCol: any, a: number | number[] | object): void;

/**
 * Resizes the image to a given width and height.The image's original aspect ratio can be kept by passing 0 for either
 * `width` or `height`. For example, calling `img.resize(50, 0)` on an image
 * that was 500 × 300 pixels will resize it to 50 × 30 pixels.
 *
 * @param resized image width.
 * @param resized image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image.
 * img.resize(50, 100);
 * 
 * // Display the resized image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. One copy of the image is squeezed horizontally.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image, keeping the aspect ratio.
 * img.resize(0, 30);
 * 
 * // Display the resized image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. The small copy of the image covers the top-left corner of the larger image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image, keeping the aspect ratio.
 * img.resize(60, 0);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. The small copy of the image covers the top-left corner of the larger image.');
 * }
 * </code>
 * </div>
 */
function resize(width: number, height: number): void;

/**
 * Copies pixels from a source image to this image.The first parameter, `srcImage`, is an optional
 * p5.Image object to copy. If a source image isn't
 * passed, then `img.copy()` can copy a region of this image to another
 * region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
 * to copy from the source image. `(sx, sy)` is the top-left corner of the
 * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
 * of this image to copy into. `(dx, dy)` is the top-left corner of the
 * region. `dw` and `dh` are the region's width and height.Calling `img.copy()` will scale pixels from the source region if it isn't
 * the same size as the destination region.
 *
 * @param source image.
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Copy one region of the image to another.
 * img.copy(7, 22, 10, 10, 35, 25, 50, 50);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Outline the copied region.
 * stroke(255);
 * noFill();
 * square(7, 22, 10);
 * 
 * describe('An image of a mountain landscape. A square region is outlined in white. A larger square contains a pixelated view of the outlined region.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks.jpg');
 * createCanvas(100, 100);
 * 
 * // Calculate the center of the bricks image.
 * let x = bricks.width / 2;
 * let y = bricks.height / 2;
 * 
 * // Copy the bricks to the mountains image.
 * mountains.copy(bricks, 0, 0, x, y, 0, 0, x, y);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * describe('An image of a brick wall drawn at the top-left of an image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function copy(...args: any[], srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 */
function copy(...args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 * Masks part of the image with another.`img.mask()` uses another p5.Image object's
 * alpha channel as the alpha channel for this image. Masks are cumulative
 * and can't be removed once applied. If the mask has a different
 * pixel density from this image, the mask will be scaled.
 *
 * @param source image.
 * @example <div>
 * <code>
 * let photo;
 * let maskImage;
 * 
 * async function setup() {
 * // Load the images.
 * photo = await loadImage('assets/rockies.jpg');
 * maskImage = await loadImage('assets/mask2.png');
 * createCanvas(100, 100);
 * 
 * // Apply the mask.
 * photo.mask(maskImage);
 * 
 * // Display the image.
 * image(photo, 0, 0);
 * 
 * describe('An image of a mountain landscape. The right side of the image has a faded patch of white.');
 * }
 * </code>
 * </div>
 */
function mask(p5Image: any, srcImage: p5.Image): void;

/**
 * Applies an image filter to the image.The preset options are:`INVERT`
 * Inverts the colors in the image. No parameter is used.`GRAY`
 * Converts the image to grayscale. No parameter is used.`THRESHOLD`
 * Converts the image to black and white. Pixels with a grayscale value
 * above a given threshold are converted to white. The rest are converted to
 * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
 * value is specified, 0.5 is used.`OPAQUE`
 * Sets the alpha channel to be entirely opaque. No parameter is used.`POSTERIZE`
 * Limits the number of colors in the image. Each color channel is limited to
 * the number of colors specified. Values between 2 and 255 are valid, but
 * results are most noticeable with lower values. The default value is 4.`BLUR`
 * Blurs the image. The level of blurring is specified by a blur radius. Larger
 * values increase the blur. The default value is 4. A gaussian blur is used
 * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
 * Reduces the light areas. No parameter is used.`DILATE`
 * Increases the light areas. No parameter is used.
 *
 * @param either THRESHOLD, GRAY, OPAQUE, INVERT,
 * POSTERIZE, ERODE, DILATE or BLUR.
 * @param parameter unique to each filter.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the INVERT filter.
 * img.filter(INVERT);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A blue brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the GRAY filter.
 * img.filter(GRAY);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A brick wall drawn in grayscale.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the THRESHOLD filter.
 * img.filter(THRESHOLD);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A brick wall drawn in black and white.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the OPAQUE filter.
 * img.filter(OPAQUE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the POSTERIZE filter.
 * img.filter(POSTERIZE, 3);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('An image of a red brick wall drawn with a limited color palette.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the BLUR filter.
 * img.filter(BLUR, 3);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A blurry image of a red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the DILATE filter.
 * img.filter(DILATE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall with bright lines between each brick.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the ERODE filter.
 * img.filter(ERODE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall with faint lines between each brick.');
 * }
 * </code>
 * </div>
 */
function filter(operation: any, value: any, filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | ERODE | DILATE | BLUR, filterParam?: number): void;

/**
 * Copies a region of pixels from another image into this one.The first parameter, `srcImage`, is the
 * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
 * to blend from the source image. `(sx, sy)` is the top-left corner of the
 * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
 * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
 * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
 * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
 * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
 * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`.
 *
 * @param source image
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @param the blend mode. either
 * BLEND, DARKEST, LIGHTEST, DIFFERENCE,
 * MULTIPLY, EXCLUSION, SCREEN, REPLACE, OVERLAY, HARD_LIGHT,
 * SOFT_LIGHT, DODGE, BURN, ADD or NORMAL.
 * 
 * Available blend modes are: normal | multiply | screen | overlay |
 * darken | lighten | color-dodge | color-burn | hard-light |
 * soft-light | difference | exclusion | hue | saturation |
 * color | luminosity
 * 
 * http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
 * @example <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, ADD);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears faded on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, DARKEST);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears transparent on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, LIGHTEST);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears washed out on the right of the image.');
 * }
 * </code>
 * </div>
 */
function blend(...args: any[], srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 */
function blend(...args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 * Saves the image to a file.By default, `img.save()` saves the image as a PNG image called
 * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
 * file's name. If a file extension is included, as in
 * `img.save('drawing.png')`, then the image will be saved using that
 * format.The second parameter, `extension`, is also optional. It sets the files format.
 * Either `'png'` or `'jpg'` can be used. For example, `img.save('drawing', 'jpg')`
 * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
 * with a dialogue window.The image will only be downloaded as an animated GIF if it was loaded
 * from a GIF file. See saveGif() to create new
 * GIFs.
 *
 * @param filename. Defaults to 'untitled'.
 * @param file extension, either 'png' or 'jpg'.
 * Defaults to 'png'.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('An image of a mountain landscape. The image is downloaded when the user presses the "s", "j", or "p" key.');
 * }
 * 
 * // Save the image with different options when the user presses a key.
 * function keyPressed() {
 * if (key === 's') {
 * img.save();
 * } else if (key === 'j') {
 * img.save('rockies.jpg');
 * } else if (key === 'p') {
 * img.save('rockies', 'png');
 * }
 * }
 * </code>
 * </div>
 */
function save(filename: string, extension?: string): void;

/**
 * Restarts an animated GIF at its first frame.
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-wink-loop-once.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon face winks once and then freezes. Clicking resets the face and makes it wink again.');
 * }
 * 
 * function draw() {
 * background(255);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * 
 * // Reset the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.reset();
 * }
 * </code>
 * </div>
 */
function reset(): void;

/**
 * Gets the index of the current frame in an animated GIF.
 *
 * @return index of the GIF's current frame.
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon eye repeatedly looks around, then outwards. A number displayed in the bottom-left corner increases from 0 to 124, then repeats.');
 * }
 * 
 * function draw() {
 * // Get the index of the current GIF frame.
 * let index = gif.getCurrentFrame();
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * 
 * // Display the current frame.
 * text(index, 10, 90);
 * }
 * </code>
 * </div>
 */
function getCurrentFrame(): number;

/**
 * Sets the current frame in an animated GIF.
 *
 * @param index of the frame to display.
 * @example <div>
 * <code>
 * let gif;
 * let frameSlider;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * // Get the index of the last frame.
 * let maxFrame = gif.numFrames() - 1;
 * 
 * // Create a slider to control which frame is drawn.
 * frameSlider = createSlider(0, maxFrame);
 * frameSlider.position(10, 80);
 * frameSlider.size(80);
 * 
 * describe('A cartoon eye looks around when a slider is moved.');
 * }
 * 
 * function draw() {
 * // Get the slider's value.
 * let index = frameSlider.value();
 * 
 * // Set the GIF's frame.
 * gif.setFrame(index);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * </code>
 * </div>
 */
function setFrame(index: number): void;

/**
 * Returns the number of frames in an animated GIF.
 *
 * @return number of frames in the GIF.
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon eye looks around. The text "n / 125" is shown at the bottom of the canvas.');
 * }
 * 
 * function draw() {
 * // Display the image.
 * image(gif, 0, 0);
 * 
 * // Display the current state of playback.
 * let total = gif.numFrames();
 * let index = gif.getCurrentFrame();
 * text(`${index} / ${total}`, 30, 90);
 * }
 * </code>
 * </div>
 */
function numFrames(): number;

/**
 * Plays an animated GIF that was paused with
 * img.pause().
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/nancy-liang-wind-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A drawing of a child with hair blowing in the wind. The animation freezes when clicked and resumes when released.');
 * }
 * 
 * function draw() {
 * background(255);
 * image(gif, 0, 0);
 * }
 * 
 * // Pause the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.pause();
 * }
 * 
 * // Play the GIF when the user releases the mouse.
 * function mouseReleased() {
 * gif.play();
 * }
 * </code>
 * </div>
 */
function play(): void;

/**
 * Pauses an animated GIF.The GIF can be resumed by calling
 * img.play().
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/nancy-liang-wind-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A drawing of a child with hair blowing in the wind. The animation freezes when clicked and resumes when released.');
 * }
 * 
 * function draw() {
 * background(255);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * 
 * // Pause the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.pause();
 * }
 * 
 * // Play the GIF when the user presses the mouse.
 * function mouseReleased() {
 * gif.play();
 * }
 * </code>
 * </div>
 */
function pause(): void;

/**
 * Changes the delay between frames in an animated GIF.The first parameter, `delay`, is the length of the delay in milliseconds.The second parameter, `index`, is optional. If provided, only the frame
 * at `index` will have its delay modified. All other frames will keep
 * their default delay.
 *
 * @param delay in milliseconds between switching frames.
 * @param index of the frame that will have its delay modified.
 * @example <div>
 * <code>
 * let gifFast;
 * let gifSlow;
 * 
 * async function setup() {
 * // Load the images.
 * gifFast = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * gifSlow = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Resize the images.
 * gifFast.resize(50, 50);
 * gifSlow.resize(50, 50);
 * 
 * // Set the delay lengths.
 * gifFast.delay(10);
 * gifSlow.delay(100);
 * 
 * describe('Two animated eyes looking around. The eye on the left moves faster than the eye on the right.');
 * }
 * 
 * function draw() {
 * // Display the images.
 * image(gifFast, 0, 0);
 * image(gifSlow, 50, 0);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * // Set the delay of frame 67.
 * gif.delay(3000, 67);
 * 
 * describe('An animated eye looking around. It pauses for three seconds while it looks down.');
 * }
 * 
 * function draw() {
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * </code>
 * </div>
 */
function delay(d: number, index?: number): void;

/**
 * Gets or sets the pixel density for high pixel density displays.By default, the density will be set to 1.Call this method with no arguments to get the default density, or pass
 * in a number to set the density. If a non-positive number is provided,
 * it defaults to 1.
 *
 * @param A scaling factor for the number of pixels per
 * side
 * @returns The current density if called without arguments, or the instance for chaining if setting density.
 */
function pixelDensity(density?: number): number;

/**
 * Helper function for animating GIF-based images with time
 *
 */
function _animateGif(pInst: any): void;

/**
 * Loads the current value of each pixel in the image into the `img.pixels`
 * array.`img.loadPixels()` must be called before reading or modifying pixel
 * values.
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * for (let i = 0; i < img.pixels.length; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function loadPixels(): void;

/**
 * Updates the canvas with the RGBA values in the
 * img.pixels array.`img.updatePixels()` only needs to be called after changing values in
 * the img.pixels array. Such changes can be
 * made directly after calling
 * img.loadPixels() or by calling
 * img.set().The optional parameters `x`, `y`, `width`, and `height` define a
 * subsection of the image to update. Doing so can improve performance in
 * some cases.If the image was loaded from a GIF, then calling `img.updatePixels()`
 * will update the pixels in current frame.
 *
 * @param x-coordinate of the upper-left corner
 * of the subsection to update.
 * @param y-coordinate of the upper-left corner
 * of the subsection to update.
 * @param width of the subsection to update.
 * @param height of the subsection to update.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let i = 0; i < img.pixels.length; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function updatePixels(x: number, y: number, w: number, h: number): void;

/**
 * Gets a pixel or a region of pixels from the image.`img.get()` is easy to use but it's not as fast as
 * img.pixels. Use
 * img.pixels to read many pixel values.The version of `img.get()` with no parameters returns the entire image.The version of `img.get()` with two parameters, as in `img.get(10, 20)`,
 * interprets them as coordinates. It returns an array with the
 * `[R, G, B, A]` values of the pixel at the given point.The version of `img.get()` with four parameters, as in
 * `img,get(10, 20, 50, 90)`, interprets them as
 * coordinates and dimensions. The first two parameters are the coordinates
 * of the upper-left corner of the subsection. The last two parameters are
 * the width and height of the subsection. It returns a subsection of the
 * canvas in a new p5.Image object.Use `img.get()` instead of get() to work directly
 * with images.
 *
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param width of the subsection to be returned.
 * @param height of the subsection to be returned.
 * @return subsection as a <a href="#/p5.Image">p5.Image</a> object.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Copy the image.
 * let img2 = get();
 * 
 * // Display the copied image on the right.
 * image(img2, 50, 0);
 * 
 * describe('Two identical mountain landscapes shown side-by-side.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Get a pixel's color.
 * let c = img.get(50, 90);
 * 
 * // Style the square using the pixel's color.
 * fill(c);
 * noStroke();
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * 
 * describe('A mountain landscape with an olive green square in its center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Copy half of the image.
 * let img2 = img.get(0, 0, img.width / 2, img.height / 2);
 * 
 * // Display half of the image.
 * image(img2, 50, 50);
 * 
 * describe('A mountain landscape drawn on top of another mountain landscape.');
 * }
 * </code>
 * </div>
 */
function get(x: number, y: number, w: number, h: number): p5.Image;

/**
 * @return whole <a href="#/p5.Image">p5.Image</a>
 */
function get(x: any, y: any, w: any, h: any): p5.Image;

/**
 * @return color of the pixel at (x, y) in array format `[R, G, B, A]`.
 */
function get(x: number, y: number, w: any, h: any): number[];

/**
 * Sets the color of one or more pixels within an image.`img.set()` is easy to use but it's not as fast as
 * img.pixels. Use
 * img.pixels to set many pixel values.`img.set()` interprets the first two parameters as x- and y-coordinates. It
 * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
 * array, a p5.Color object, or another
 * p5.Image object.img.updatePixels() must be called
 * after using `img.set()` for changes to appear.
 *
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param grayscale value | pixel array |
 * <a href="#/p5.Color">p5.Color</a> object |
 * <a href="#/p5.Image">p5.Image</a> to copy.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(100, 100);
 * 
 * // Set four pixels to black.
 * img.set(30, 20, 0);
 * img.set(85, 20, 0);
 * img.set(85, 75, 0);
 * img.set(30, 75, 0);
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Image object.
 * let img = createImage(100, 100);
 * 
 * // Create a p5.Color object.
 * let black = color(0);
 * 
 * // Set four pixels to black.
 * img.set(30, 20, black);
 * img.set(85, 20, black);
 * img.set(85, 75, black);
 * img.set(30, 75, black);
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Draw a color gradient.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * let c = map(x, 0, img.width, 0, 255);
 * img.set(x, y, c);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A square with a horiztonal color gradient from black to white drawn on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Create a p5.Image object.
 * let img2 = createImage(100, 100);
 * 
 * // Set the blank image's pixels using the landscape.
 * img2.set(0, 0, img);
 * 
 * // Display the second image.
 * image(img2, 0, 0);
 * 
 * describe('An image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function set(x: number, y: number, imgOrCol: any, a: number | number[] | object): void;

/**
 * Resizes the image to a given width and height.The image's original aspect ratio can be kept by passing 0 for either
 * `width` or `height`. For example, calling `img.resize(50, 0)` on an image
 * that was 500 × 300 pixels will resize it to 50 × 30 pixels.
 *
 * @param resized image width.
 * @param resized image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image.
 * img.resize(50, 100);
 * 
 * // Display the resized image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. One copy of the image is squeezed horizontally.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image, keeping the aspect ratio.
 * img.resize(0, 30);
 * 
 * // Display the resized image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. The small copy of the image covers the top-left corner of the larger image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image, keeping the aspect ratio.
 * img.resize(60, 0);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. The small copy of the image covers the top-left corner of the larger image.');
 * }
 * </code>
 * </div>
 */
function resize(width: number, height: number): void;

/**
 * Copies pixels from a source image to this image.The first parameter, `srcImage`, is an optional
 * p5.Image object to copy. If a source image isn't
 * passed, then `img.copy()` can copy a region of this image to another
 * region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
 * to copy from the source image. `(sx, sy)` is the top-left corner of the
 * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
 * of this image to copy into. `(dx, dy)` is the top-left corner of the
 * region. `dw` and `dh` are the region's width and height.Calling `img.copy()` will scale pixels from the source region if it isn't
 * the same size as the destination region.
 *
 * @param source image.
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Copy one region of the image to another.
 * img.copy(7, 22, 10, 10, 35, 25, 50, 50);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Outline the copied region.
 * stroke(255);
 * noFill();
 * square(7, 22, 10);
 * 
 * describe('An image of a mountain landscape. A square region is outlined in white. A larger square contains a pixelated view of the outlined region.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks.jpg');
 * createCanvas(100, 100);
 * 
 * // Calculate the center of the bricks image.
 * let x = bricks.width / 2;
 * let y = bricks.height / 2;
 * 
 * // Copy the bricks to the mountains image.
 * mountains.copy(bricks, 0, 0, x, y, 0, 0, x, y);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * describe('An image of a brick wall drawn at the top-left of an image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function copy(...args: any[], srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 */
function copy(...args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 * Masks part of the image with another.`img.mask()` uses another p5.Image object's
 * alpha channel as the alpha channel for this image. Masks are cumulative
 * and can't be removed once applied. If the mask has a different
 * pixel density from this image, the mask will be scaled.
 *
 * @param source image.
 * @example <div>
 * <code>
 * let photo;
 * let maskImage;
 * 
 * async function setup() {
 * // Load the images.
 * photo = await loadImage('assets/rockies.jpg');
 * maskImage = await loadImage('assets/mask2.png');
 * createCanvas(100, 100);
 * 
 * // Apply the mask.
 * photo.mask(maskImage);
 * 
 * // Display the image.
 * image(photo, 0, 0);
 * 
 * describe('An image of a mountain landscape. The right side of the image has a faded patch of white.');
 * }
 * </code>
 * </div>
 */
function mask(p5Image: any, srcImage: p5.Image): void;

/**
 * Applies an image filter to the image.The preset options are:`INVERT`
 * Inverts the colors in the image. No parameter is used.`GRAY`
 * Converts the image to grayscale. No parameter is used.`THRESHOLD`
 * Converts the image to black and white. Pixels with a grayscale value
 * above a given threshold are converted to white. The rest are converted to
 * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
 * value is specified, 0.5 is used.`OPAQUE`
 * Sets the alpha channel to be entirely opaque. No parameter is used.`POSTERIZE`
 * Limits the number of colors in the image. Each color channel is limited to
 * the number of colors specified. Values between 2 and 255 are valid, but
 * results are most noticeable with lower values. The default value is 4.`BLUR`
 * Blurs the image. The level of blurring is specified by a blur radius. Larger
 * values increase the blur. The default value is 4. A gaussian blur is used
 * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
 * Reduces the light areas. No parameter is used.`DILATE`
 * Increases the light areas. No parameter is used.
 *
 * @param either THRESHOLD, GRAY, OPAQUE, INVERT,
 * POSTERIZE, ERODE, DILATE or BLUR.
 * @param parameter unique to each filter.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the INVERT filter.
 * img.filter(INVERT);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A blue brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the GRAY filter.
 * img.filter(GRAY);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A brick wall drawn in grayscale.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the THRESHOLD filter.
 * img.filter(THRESHOLD);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A brick wall drawn in black and white.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the OPAQUE filter.
 * img.filter(OPAQUE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the POSTERIZE filter.
 * img.filter(POSTERIZE, 3);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('An image of a red brick wall drawn with a limited color palette.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the BLUR filter.
 * img.filter(BLUR, 3);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A blurry image of a red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the DILATE filter.
 * img.filter(DILATE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall with bright lines between each brick.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the ERODE filter.
 * img.filter(ERODE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall with faint lines between each brick.');
 * }
 * </code>
 * </div>
 */
function filter(operation: any, value: any, filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | ERODE | DILATE | BLUR, filterParam?: number): void;

/**
 * Copies a region of pixels from another image into this one.The first parameter, `srcImage`, is the
 * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
 * to blend from the source image. `(sx, sy)` is the top-left corner of the
 * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
 * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
 * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
 * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
 * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
 * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`.
 *
 * @param source image
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @param the blend mode. either
 * BLEND, DARKEST, LIGHTEST, DIFFERENCE,
 * MULTIPLY, EXCLUSION, SCREEN, REPLACE, OVERLAY, HARD_LIGHT,
 * SOFT_LIGHT, DODGE, BURN, ADD or NORMAL.
 * 
 * Available blend modes are: normal | multiply | screen | overlay |
 * darken | lighten | color-dodge | color-burn | hard-light |
 * soft-light | difference | exclusion | hue | saturation |
 * color | luminosity
 * 
 * http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
 * @example <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, ADD);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears faded on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, DARKEST);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears transparent on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, LIGHTEST);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears washed out on the right of the image.');
 * }
 * </code>
 * </div>
 */
function blend(...args: any[], srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 */
function blend(...args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 * Saves the image to a file.By default, `img.save()` saves the image as a PNG image called
 * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
 * file's name. If a file extension is included, as in
 * `img.save('drawing.png')`, then the image will be saved using that
 * format.The second parameter, `extension`, is also optional. It sets the files format.
 * Either `'png'` or `'jpg'` can be used. For example, `img.save('drawing', 'jpg')`
 * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
 * with a dialogue window.The image will only be downloaded as an animated GIF if it was loaded
 * from a GIF file. See saveGif() to create new
 * GIFs.
 *
 * @param filename. Defaults to 'untitled'.
 * @param file extension, either 'png' or 'jpg'.
 * Defaults to 'png'.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('An image of a mountain landscape. The image is downloaded when the user presses the "s", "j", or "p" key.');
 * }
 * 
 * // Save the image with different options when the user presses a key.
 * function keyPressed() {
 * if (key === 's') {
 * img.save();
 * } else if (key === 'j') {
 * img.save('rockies.jpg');
 * } else if (key === 'p') {
 * img.save('rockies', 'png');
 * }
 * }
 * </code>
 * </div>
 */
function save(filename: string, extension?: string): void;

/**
 * Restarts an animated GIF at its first frame.
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-wink-loop-once.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon face winks once and then freezes. Clicking resets the face and makes it wink again.');
 * }
 * 
 * function draw() {
 * background(255);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * 
 * // Reset the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.reset();
 * }
 * </code>
 * </div>
 */
function reset(): void;

/**
 * Gets the index of the current frame in an animated GIF.
 *
 * @return index of the GIF's current frame.
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon eye repeatedly looks around, then outwards. A number displayed in the bottom-left corner increases from 0 to 124, then repeats.');
 * }
 * 
 * function draw() {
 * // Get the index of the current GIF frame.
 * let index = gif.getCurrentFrame();
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * 
 * // Display the current frame.
 * text(index, 10, 90);
 * }
 * </code>
 * </div>
 */
function getCurrentFrame(): number;

/**
 * Sets the current frame in an animated GIF.
 *
 * @param index of the frame to display.
 * @example <div>
 * <code>
 * let gif;
 * let frameSlider;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * // Get the index of the last frame.
 * let maxFrame = gif.numFrames() - 1;
 * 
 * // Create a slider to control which frame is drawn.
 * frameSlider = createSlider(0, maxFrame);
 * frameSlider.position(10, 80);
 * frameSlider.size(80);
 * 
 * describe('A cartoon eye looks around when a slider is moved.');
 * }
 * 
 * function draw() {
 * // Get the slider's value.
 * let index = frameSlider.value();
 * 
 * // Set the GIF's frame.
 * gif.setFrame(index);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * </code>
 * </div>
 */
function setFrame(index: number): void;

/**
 * Returns the number of frames in an animated GIF.
 *
 * @return number of frames in the GIF.
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon eye looks around. The text "n / 125" is shown at the bottom of the canvas.');
 * }
 * 
 * function draw() {
 * // Display the image.
 * image(gif, 0, 0);
 * 
 * // Display the current state of playback.
 * let total = gif.numFrames();
 * let index = gif.getCurrentFrame();
 * text(`${index} / ${total}`, 30, 90);
 * }
 * </code>
 * </div>
 */
function numFrames(): number;

/**
 * Plays an animated GIF that was paused with
 * img.pause().
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/nancy-liang-wind-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A drawing of a child with hair blowing in the wind. The animation freezes when clicked and resumes when released.');
 * }
 * 
 * function draw() {
 * background(255);
 * image(gif, 0, 0);
 * }
 * 
 * // Pause the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.pause();
 * }
 * 
 * // Play the GIF when the user releases the mouse.
 * function mouseReleased() {
 * gif.play();
 * }
 * </code>
 * </div>
 */
function play(): void;

/**
 * Pauses an animated GIF.The GIF can be resumed by calling
 * img.play().
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/nancy-liang-wind-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A drawing of a child with hair blowing in the wind. The animation freezes when clicked and resumes when released.');
 * }
 * 
 * function draw() {
 * background(255);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * 
 * // Pause the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.pause();
 * }
 * 
 * // Play the GIF when the user presses the mouse.
 * function mouseReleased() {
 * gif.play();
 * }
 * </code>
 * </div>
 */
function pause(): void;

/**
 * Changes the delay between frames in an animated GIF.The first parameter, `delay`, is the length of the delay in milliseconds.The second parameter, `index`, is optional. If provided, only the frame
 * at `index` will have its delay modified. All other frames will keep
 * their default delay.
 *
 * @param delay in milliseconds between switching frames.
 * @param index of the frame that will have its delay modified.
 * @example <div>
 * <code>
 * let gifFast;
 * let gifSlow;
 * 
 * async function setup() {
 * // Load the images.
 * gifFast = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * gifSlow = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Resize the images.
 * gifFast.resize(50, 50);
 * gifSlow.resize(50, 50);
 * 
 * // Set the delay lengths.
 * gifFast.delay(10);
 * gifSlow.delay(100);
 * 
 * describe('Two animated eyes looking around. The eye on the left moves faster than the eye on the right.');
 * }
 * 
 * function draw() {
 * // Display the images.
 * image(gifFast, 0, 0);
 * image(gifSlow, 50, 0);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * // Set the delay of frame 67.
 * gif.delay(3000, 67);
 * 
 * describe('An animated eye looking around. It pauses for three seconds while it looks down.');
 * }
 * 
 * function draw() {
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * </code>
 * </div>
 */
function delay(d: number, index?: number): void;

/**
 * Gets or sets the pixel density for high pixel density displays.By default, the density will be set to 1.Call this method with no arguments to get the default density, or pass
 * in a number to set the density. If a non-positive number is provided,
 * it defaults to 1.
 *
 * @param A scaling factor for the number of pixels per
 * side
 * @returns The current density if called without arguments, or the instance for chaining if setting density.
 */
function pixelDensity(density?: number): number;

/**
 * Helper function for animating GIF-based images with time
 *
 */
function _animateGif(pInst: any): void;

/**
 * Loads the current value of each pixel in the image into the `img.pixels`
 * array.`img.loadPixels()` must be called before reading or modifying pixel
 * values.
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * for (let i = 0; i < img.pixels.length; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function loadPixels(): void;

/**
 * Updates the canvas with the RGBA values in the
 * img.pixels array.`img.updatePixels()` only needs to be called after changing values in
 * the img.pixels array. Such changes can be
 * made directly after calling
 * img.loadPixels() or by calling
 * img.set().The optional parameters `x`, `y`, `width`, and `height` define a
 * subsection of the image to update. Doing so can improve performance in
 * some cases.If the image was loaded from a GIF, then calling `img.updatePixels()`
 * will update the pixels in current frame.
 *
 * @param x-coordinate of the upper-left corner
 * of the subsection to update.
 * @param y-coordinate of the upper-left corner
 * of the subsection to update.
 * @param width of the subsection to update.
 * @param height of the subsection to update.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let i = 0; i < img.pixels.length; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function updatePixels(x: number, y: number, w: number, h: number): void;

/**
 * Gets a pixel or a region of pixels from the image.`img.get()` is easy to use but it's not as fast as
 * img.pixels. Use
 * img.pixels to read many pixel values.The version of `img.get()` with no parameters returns the entire image.The version of `img.get()` with two parameters, as in `img.get(10, 20)`,
 * interprets them as coordinates. It returns an array with the
 * `[R, G, B, A]` values of the pixel at the given point.The version of `img.get()` with four parameters, as in
 * `img,get(10, 20, 50, 90)`, interprets them as
 * coordinates and dimensions. The first two parameters are the coordinates
 * of the upper-left corner of the subsection. The last two parameters are
 * the width and height of the subsection. It returns a subsection of the
 * canvas in a new p5.Image object.Use `img.get()` instead of get() to work directly
 * with images.
 *
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param width of the subsection to be returned.
 * @param height of the subsection to be returned.
 * @return subsection as a <a href="#/p5.Image">p5.Image</a> object.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Copy the image.
 * let img2 = get();
 * 
 * // Display the copied image on the right.
 * image(img2, 50, 0);
 * 
 * describe('Two identical mountain landscapes shown side-by-side.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Get a pixel's color.
 * let c = img.get(50, 90);
 * 
 * // Style the square using the pixel's color.
 * fill(c);
 * noStroke();
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * 
 * describe('A mountain landscape with an olive green square in its center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Copy half of the image.
 * let img2 = img.get(0, 0, img.width / 2, img.height / 2);
 * 
 * // Display half of the image.
 * image(img2, 50, 50);
 * 
 * describe('A mountain landscape drawn on top of another mountain landscape.');
 * }
 * </code>
 * </div>
 */
function get(x: number, y: number, w: number, h: number): p5.Image;

/**
 * @return whole <a href="#/p5.Image">p5.Image</a>
 */
function get(x: any, y: any, w: any, h: any): p5.Image;

/**
 * @return color of the pixel at (x, y) in array format `[R, G, B, A]`.
 */
function get(x: number, y: number, w: any, h: any): number[];

/**
 * Sets the color of one or more pixels within an image.`img.set()` is easy to use but it's not as fast as
 * img.pixels. Use
 * img.pixels to set many pixel values.`img.set()` interprets the first two parameters as x- and y-coordinates. It
 * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
 * array, a p5.Color object, or another
 * p5.Image object.img.updatePixels() must be called
 * after using `img.set()` for changes to appear.
 *
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param grayscale value | pixel array |
 * <a href="#/p5.Color">p5.Color</a> object |
 * <a href="#/p5.Image">p5.Image</a> to copy.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(100, 100);
 * 
 * // Set four pixels to black.
 * img.set(30, 20, 0);
 * img.set(85, 20, 0);
 * img.set(85, 75, 0);
 * img.set(30, 75, 0);
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Image object.
 * let img = createImage(100, 100);
 * 
 * // Create a p5.Color object.
 * let black = color(0);
 * 
 * // Set four pixels to black.
 * img.set(30, 20, black);
 * img.set(85, 20, black);
 * img.set(85, 75, black);
 * img.set(30, 75, black);
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Draw a color gradient.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * let c = map(x, 0, img.width, 0, 255);
 * img.set(x, y, c);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A square with a horiztonal color gradient from black to white drawn on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Create a p5.Image object.
 * let img2 = createImage(100, 100);
 * 
 * // Set the blank image's pixels using the landscape.
 * img2.set(0, 0, img);
 * 
 * // Display the second image.
 * image(img2, 0, 0);
 * 
 * describe('An image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function set(x: number, y: number, imgOrCol: any, a: number | number[] | object): void;

/**
 * Resizes the image to a given width and height.The image's original aspect ratio can be kept by passing 0 for either
 * `width` or `height`. For example, calling `img.resize(50, 0)` on an image
 * that was 500 × 300 pixels will resize it to 50 × 30 pixels.
 *
 * @param resized image width.
 * @param resized image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image.
 * img.resize(50, 100);
 * 
 * // Display the resized image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. One copy of the image is squeezed horizontally.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image, keeping the aspect ratio.
 * img.resize(0, 30);
 * 
 * // Display the resized image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. The small copy of the image covers the top-left corner of the larger image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image, keeping the aspect ratio.
 * img.resize(60, 0);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. The small copy of the image covers the top-left corner of the larger image.');
 * }
 * </code>
 * </div>
 */
function resize(width: number, height: number): void;

/**
 * Copies pixels from a source image to this image.The first parameter, `srcImage`, is an optional
 * p5.Image object to copy. If a source image isn't
 * passed, then `img.copy()` can copy a region of this image to another
 * region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
 * to copy from the source image. `(sx, sy)` is the top-left corner of the
 * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
 * of this image to copy into. `(dx, dy)` is the top-left corner of the
 * region. `dw` and `dh` are the region's width and height.Calling `img.copy()` will scale pixels from the source region if it isn't
 * the same size as the destination region.
 *
 * @param source image.
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Copy one region of the image to another.
 * img.copy(7, 22, 10, 10, 35, 25, 50, 50);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Outline the copied region.
 * stroke(255);
 * noFill();
 * square(7, 22, 10);
 * 
 * describe('An image of a mountain landscape. A square region is outlined in white. A larger square contains a pixelated view of the outlined region.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks.jpg');
 * createCanvas(100, 100);
 * 
 * // Calculate the center of the bricks image.
 * let x = bricks.width / 2;
 * let y = bricks.height / 2;
 * 
 * // Copy the bricks to the mountains image.
 * mountains.copy(bricks, 0, 0, x, y, 0, 0, x, y);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * describe('An image of a brick wall drawn at the top-left of an image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function copy(...args: any[], srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 */
function copy(...args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 * Masks part of the image with another.`img.mask()` uses another p5.Image object's
 * alpha channel as the alpha channel for this image. Masks are cumulative
 * and can't be removed once applied. If the mask has a different
 * pixel density from this image, the mask will be scaled.
 *
 * @param source image.
 * @example <div>
 * <code>
 * let photo;
 * let maskImage;
 * 
 * async function setup() {
 * // Load the images.
 * photo = await loadImage('assets/rockies.jpg');
 * maskImage = await loadImage('assets/mask2.png');
 * createCanvas(100, 100);
 * 
 * // Apply the mask.
 * photo.mask(maskImage);
 * 
 * // Display the image.
 * image(photo, 0, 0);
 * 
 * describe('An image of a mountain landscape. The right side of the image has a faded patch of white.');
 * }
 * </code>
 * </div>
 */
function mask(p5Image: any, srcImage: p5.Image): void;

/**
 * Applies an image filter to the image.The preset options are:`INVERT`
 * Inverts the colors in the image. No parameter is used.`GRAY`
 * Converts the image to grayscale. No parameter is used.`THRESHOLD`
 * Converts the image to black and white. Pixels with a grayscale value
 * above a given threshold are converted to white. The rest are converted to
 * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
 * value is specified, 0.5 is used.`OPAQUE`
 * Sets the alpha channel to be entirely opaque. No parameter is used.`POSTERIZE`
 * Limits the number of colors in the image. Each color channel is limited to
 * the number of colors specified. Values between 2 and 255 are valid, but
 * results are most noticeable with lower values. The default value is 4.`BLUR`
 * Blurs the image. The level of blurring is specified by a blur radius. Larger
 * values increase the blur. The default value is 4. A gaussian blur is used
 * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
 * Reduces the light areas. No parameter is used.`DILATE`
 * Increases the light areas. No parameter is used.
 *
 * @param either THRESHOLD, GRAY, OPAQUE, INVERT,
 * POSTERIZE, ERODE, DILATE or BLUR.
 * @param parameter unique to each filter.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the INVERT filter.
 * img.filter(INVERT);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A blue brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the GRAY filter.
 * img.filter(GRAY);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A brick wall drawn in grayscale.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the THRESHOLD filter.
 * img.filter(THRESHOLD);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A brick wall drawn in black and white.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the OPAQUE filter.
 * img.filter(OPAQUE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the POSTERIZE filter.
 * img.filter(POSTERIZE, 3);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('An image of a red brick wall drawn with a limited color palette.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the BLUR filter.
 * img.filter(BLUR, 3);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A blurry image of a red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the DILATE filter.
 * img.filter(DILATE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall with bright lines between each brick.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the ERODE filter.
 * img.filter(ERODE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall with faint lines between each brick.');
 * }
 * </code>
 * </div>
 */
function filter(operation: any, value: any, filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | ERODE | DILATE | BLUR, filterParam?: number): void;

/**
 * Copies a region of pixels from another image into this one.The first parameter, `srcImage`, is the
 * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
 * to blend from the source image. `(sx, sy)` is the top-left corner of the
 * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
 * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
 * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
 * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
 * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
 * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`.
 *
 * @param source image
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @param the blend mode. either
 * BLEND, DARKEST, LIGHTEST, DIFFERENCE,
 * MULTIPLY, EXCLUSION, SCREEN, REPLACE, OVERLAY, HARD_LIGHT,
 * SOFT_LIGHT, DODGE, BURN, ADD or NORMAL.
 * 
 * Available blend modes are: normal | multiply | screen | overlay |
 * darken | lighten | color-dodge | color-burn | hard-light |
 * soft-light | difference | exclusion | hue | saturation |
 * color | luminosity
 * 
 * http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
 * @example <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, ADD);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears faded on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, DARKEST);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears transparent on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, LIGHTEST);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears washed out on the right of the image.');
 * }
 * </code>
 * </div>
 */
function blend(...args: any[], srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 */
function blend(...args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 * Saves the image to a file.By default, `img.save()` saves the image as a PNG image called
 * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
 * file's name. If a file extension is included, as in
 * `img.save('drawing.png')`, then the image will be saved using that
 * format.The second parameter, `extension`, is also optional. It sets the files format.
 * Either `'png'` or `'jpg'` can be used. For example, `img.save('drawing', 'jpg')`
 * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
 * with a dialogue window.The image will only be downloaded as an animated GIF if it was loaded
 * from a GIF file. See saveGif() to create new
 * GIFs.
 *
 * @param filename. Defaults to 'untitled'.
 * @param file extension, either 'png' or 'jpg'.
 * Defaults to 'png'.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('An image of a mountain landscape. The image is downloaded when the user presses the "s", "j", or "p" key.');
 * }
 * 
 * // Save the image with different options when the user presses a key.
 * function keyPressed() {
 * if (key === 's') {
 * img.save();
 * } else if (key === 'j') {
 * img.save('rockies.jpg');
 * } else if (key === 'p') {
 * img.save('rockies', 'png');
 * }
 * }
 * </code>
 * </div>
 */
function save(filename: string, extension?: string): void;

/**
 * Restarts an animated GIF at its first frame.
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-wink-loop-once.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon face winks once and then freezes. Clicking resets the face and makes it wink again.');
 * }
 * 
 * function draw() {
 * background(255);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * 
 * // Reset the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.reset();
 * }
 * </code>
 * </div>
 */
function reset(): void;

/**
 * Gets the index of the current frame in an animated GIF.
 *
 * @return index of the GIF's current frame.
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon eye repeatedly looks around, then outwards. A number displayed in the bottom-left corner increases from 0 to 124, then repeats.');
 * }
 * 
 * function draw() {
 * // Get the index of the current GIF frame.
 * let index = gif.getCurrentFrame();
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * 
 * // Display the current frame.
 * text(index, 10, 90);
 * }
 * </code>
 * </div>
 */
function getCurrentFrame(): number;

/**
 * Sets the current frame in an animated GIF.
 *
 * @param index of the frame to display.
 * @example <div>
 * <code>
 * let gif;
 * let frameSlider;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * // Get the index of the last frame.
 * let maxFrame = gif.numFrames() - 1;
 * 
 * // Create a slider to control which frame is drawn.
 * frameSlider = createSlider(0, maxFrame);
 * frameSlider.position(10, 80);
 * frameSlider.size(80);
 * 
 * describe('A cartoon eye looks around when a slider is moved.');
 * }
 * 
 * function draw() {
 * // Get the slider's value.
 * let index = frameSlider.value();
 * 
 * // Set the GIF's frame.
 * gif.setFrame(index);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * </code>
 * </div>
 */
function setFrame(index: number): void;

/**
 * Returns the number of frames in an animated GIF.
 *
 * @return number of frames in the GIF.
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon eye looks around. The text "n / 125" is shown at the bottom of the canvas.');
 * }
 * 
 * function draw() {
 * // Display the image.
 * image(gif, 0, 0);
 * 
 * // Display the current state of playback.
 * let total = gif.numFrames();
 * let index = gif.getCurrentFrame();
 * text(`${index} / ${total}`, 30, 90);
 * }
 * </code>
 * </div>
 */
function numFrames(): number;

/**
 * Plays an animated GIF that was paused with
 * img.pause().
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/nancy-liang-wind-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A drawing of a child with hair blowing in the wind. The animation freezes when clicked and resumes when released.');
 * }
 * 
 * function draw() {
 * background(255);
 * image(gif, 0, 0);
 * }
 * 
 * // Pause the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.pause();
 * }
 * 
 * // Play the GIF when the user releases the mouse.
 * function mouseReleased() {
 * gif.play();
 * }
 * </code>
 * </div>
 */
function play(): void;

/**
 * Pauses an animated GIF.The GIF can be resumed by calling
 * img.play().
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/nancy-liang-wind-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A drawing of a child with hair blowing in the wind. The animation freezes when clicked and resumes when released.');
 * }
 * 
 * function draw() {
 * background(255);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * 
 * // Pause the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.pause();
 * }
 * 
 * // Play the GIF when the user presses the mouse.
 * function mouseReleased() {
 * gif.play();
 * }
 * </code>
 * </div>
 */
function pause(): void;

/**
 * Changes the delay between frames in an animated GIF.The first parameter, `delay`, is the length of the delay in milliseconds.The second parameter, `index`, is optional. If provided, only the frame
 * at `index` will have its delay modified. All other frames will keep
 * their default delay.
 *
 * @param delay in milliseconds between switching frames.
 * @param index of the frame that will have its delay modified.
 * @example <div>
 * <code>
 * let gifFast;
 * let gifSlow;
 * 
 * async function setup() {
 * // Load the images.
 * gifFast = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * gifSlow = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Resize the images.
 * gifFast.resize(50, 50);
 * gifSlow.resize(50, 50);
 * 
 * // Set the delay lengths.
 * gifFast.delay(10);
 * gifSlow.delay(100);
 * 
 * describe('Two animated eyes looking around. The eye on the left moves faster than the eye on the right.');
 * }
 * 
 * function draw() {
 * // Display the images.
 * image(gifFast, 0, 0);
 * image(gifSlow, 50, 0);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * // Set the delay of frame 67.
 * gif.delay(3000, 67);
 * 
 * describe('An animated eye looking around. It pauses for three seconds while it looks down.');
 * }
 * 
 * function draw() {
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * </code>
 * </div>
 */
function delay(d: number, index?: number): void;

/**
 * Gets or sets the pixel density for high pixel density displays.By default, the density will be set to 1.Call this method with no arguments to get the default density, or pass
 * in a number to set the density. If a non-positive number is provided,
 * it defaults to 1.
 *
 * @param A scaling factor for the number of pixels per
 * side
 * @returns The current density if called without arguments, or the instance for chaining if setting density.
 */
function pixelDensity(density?: number): number;

/**
 * Helper function for animating GIF-based images with time
 *
 */
function _animateGif(pInst: any): void;

/**
 * Loads the current value of each pixel in the image into the `img.pixels`
 * array.`img.loadPixels()` must be called before reading or modifying pixel
 * values.
 *
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * for (let i = 0; i < img.pixels.length; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function loadPixels(): void;

/**
 * Updates the canvas with the RGBA values in the
 * img.pixels array.`img.updatePixels()` only needs to be called after changing values in
 * the img.pixels array. Such changes can be
 * made directly after calling
 * img.loadPixels() or by calling
 * img.set().The optional parameters `x`, `y`, `width`, and `height` define a
 * subsection of the image to update. Doing so can improve performance in
 * some cases.If the image was loaded from a GIF, then calling `img.updatePixels()`
 * will update the pixels in current frame.
 *
 * @param x-coordinate of the upper-left corner
 * of the subsection to update.
 * @param y-coordinate of the upper-left corner
 * of the subsection to update.
 * @param width of the subsection to update.
 * @param height of the subsection to update.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * img.set(x, y, 0);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Load the image's pixels.
 * img.loadPixels();
 * 
 * // Set the pixels to black.
 * for (let i = 0; i < img.pixels.length; i += 4) {
 * // Red.
 * img.pixels[i] = 0;
 * // Green.
 * img.pixels[i + 1] = 0;
 * // Blue.
 * img.pixels[i + 2] = 0;
 * // Alpha.
 * img.pixels[i + 3] = 255;
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A black square drawn in the middle of a gray square.');
 * }
 * </code>
 * </div>
 */
function updatePixels(x: number, y: number, w: number, h: number): void;

/**
 * Gets a pixel or a region of pixels from the image.`img.get()` is easy to use but it's not as fast as
 * img.pixels. Use
 * img.pixels to read many pixel values.The version of `img.get()` with no parameters returns the entire image.The version of `img.get()` with two parameters, as in `img.get(10, 20)`,
 * interprets them as coordinates. It returns an array with the
 * `[R, G, B, A]` values of the pixel at the given point.The version of `img.get()` with four parameters, as in
 * `img,get(10, 20, 50, 90)`, interprets them as
 * coordinates and dimensions. The first two parameters are the coordinates
 * of the upper-left corner of the subsection. The last two parameters are
 * the width and height of the subsection. It returns a subsection of the
 * canvas in a new p5.Image object.Use `img.get()` instead of get() to work directly
 * with images.
 *
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param width of the subsection to be returned.
 * @param height of the subsection to be returned.
 * @return subsection as a <a href="#/p5.Image">p5.Image</a> object.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Copy the image.
 * let img2 = get();
 * 
 * // Display the copied image on the right.
 * image(img2, 50, 0);
 * 
 * describe('Two identical mountain landscapes shown side-by-side.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Get a pixel's color.
 * let c = img.get(50, 90);
 * 
 * // Style the square using the pixel's color.
 * fill(c);
 * noStroke();
 * 
 * // Draw the square.
 * square(25, 25, 50);
 * 
 * describe('A mountain landscape with an olive green square in its center.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Copy half of the image.
 * let img2 = img.get(0, 0, img.width / 2, img.height / 2);
 * 
 * // Display half of the image.
 * image(img2, 50, 50);
 * 
 * describe('A mountain landscape drawn on top of another mountain landscape.');
 * }
 * </code>
 * </div>
 */
function get(x: number, y: number, w: number, h: number): p5.Image;

/**
 * @return whole <a href="#/p5.Image">p5.Image</a>
 */
function get(x: any, y: any, w: any, h: any): p5.Image;

/**
 * @return color of the pixel at (x, y) in array format `[R, G, B, A]`.
 */
function get(x: number, y: number, w: any, h: any): number[];

/**
 * Sets the color of one or more pixels within an image.`img.set()` is easy to use but it's not as fast as
 * img.pixels. Use
 * img.pixels to set many pixel values.`img.set()` interprets the first two parameters as x- and y-coordinates. It
 * interprets the last parameter as a grayscale value, a `[R, G, B, A]` pixel
 * array, a p5.Color object, or another
 * p5.Image object.img.updatePixels() must be called
 * after using `img.set()` for changes to appear.
 *
 * @param x-coordinate of the pixel.
 * @param y-coordinate of the pixel.
 * @param grayscale value | pixel array |
 * <a href="#/p5.Color">p5.Color</a> object |
 * <a href="#/p5.Image">p5.Image</a> to copy.
 * @example <div>
 * <code>
 * function setup() {
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Create a p5.Image object.
 * let img = createImage(100, 100);
 * 
 * // Set four pixels to black.
 * img.set(30, 20, 0);
 * img.set(85, 20, 0);
 * img.set(85, 75, 0);
 * img.set(30, 75, 0);
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Image object.
 * let img = createImage(100, 100);
 * 
 * // Create a p5.Color object.
 * let black = color(0);
 * 
 * // Set four pixels to black.
 * img.set(30, 20, black);
 * img.set(85, 20, black);
 * img.set(85, 75, black);
 * img.set(30, 75, black);
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Four black dots arranged in a square drawn on a gray background.');
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
 * // Create a p5.Image object.
 * let img = createImage(66, 66);
 * 
 * // Draw a color gradient.
 * for (let x = 0; x < img.width; x += 1) {
 * for (let y = 0; y < img.height; y += 1) {
 * let c = map(x, 0, img.width, 0, 255);
 * img.set(x, y, c);
 * }
 * }
 * 
 * // Update the image.
 * img.updatePixels();
 * 
 * // Display the image.
 * image(img, 17, 17);
 * 
 * describe('A square with a horiztonal color gradient from black to white drawn on a gray background.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Create a p5.Image object.
 * let img2 = createImage(100, 100);
 * 
 * // Set the blank image's pixels using the landscape.
 * img2.set(0, 0, img);
 * 
 * // Display the second image.
 * image(img2, 0, 0);
 * 
 * describe('An image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function set(x: number, y: number, imgOrCol: any, a: number | number[] | object): void;

/**
 * Resizes the image to a given width and height.The image's original aspect ratio can be kept by passing 0 for either
 * `width` or `height`. For example, calling `img.resize(50, 0)` on an image
 * that was 500 × 300 pixels will resize it to 50 × 30 pixels.
 *
 * @param resized image width.
 * @param resized image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image.
 * img.resize(50, 100);
 * 
 * // Display the resized image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. One copy of the image is squeezed horizontally.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image, keeping the aspect ratio.
 * img.resize(0, 30);
 * 
 * // Display the resized image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. The small copy of the image covers the top-left corner of the larger image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Resize the image, keeping the aspect ratio.
 * img.resize(60, 0);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('Two images of a mountain landscape. The small copy of the image covers the top-left corner of the larger image.');
 * }
 * </code>
 * </div>
 */
function resize(width: number, height: number): void;

/**
 * Copies pixels from a source image to this image.The first parameter, `srcImage`, is an optional
 * p5.Image object to copy. If a source image isn't
 * passed, then `img.copy()` can copy a region of this image to another
 * region.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
 * to copy from the source image. `(sx, sy)` is the top-left corner of the
 * region. `sw` and `sh` are the region's width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
 * of this image to copy into. `(dx, dy)` is the top-left corner of the
 * region. `dw` and `dh` are the region's width and height.Calling `img.copy()` will scale pixels from the source region if it isn't
 * the same size as the destination region.
 *
 * @param source image.
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Copy one region of the image to another.
 * img.copy(7, 22, 10, 10, 35, 25, 50, 50);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * // Outline the copied region.
 * stroke(255);
 * noFill();
 * square(7, 22, 10);
 * 
 * describe('An image of a mountain landscape. A square region is outlined in white. A larger square contains a pixelated view of the outlined region.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks.jpg');
 * createCanvas(100, 100);
 * 
 * // Calculate the center of the bricks image.
 * let x = bricks.width / 2;
 * let y = bricks.height / 2;
 * 
 * // Copy the bricks to the mountains image.
 * mountains.copy(bricks, 0, 0, x, y, 0, 0, x, y);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * describe('An image of a brick wall drawn at the top-left of an image of a mountain landscape.');
 * }
 * </code>
 * </div>
 */
function copy(...args: any[], srcImage: p5.Image | p5.Element, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 */
function copy(...args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

/**
 * Masks part of the image with another.`img.mask()` uses another p5.Image object's
 * alpha channel as the alpha channel for this image. Masks are cumulative
 * and can't be removed once applied. If the mask has a different
 * pixel density from this image, the mask will be scaled.
 *
 * @param source image.
 * @example <div>
 * <code>
 * let photo;
 * let maskImage;
 * 
 * async function setup() {
 * // Load the images.
 * photo = await loadImage('assets/rockies.jpg');
 * maskImage = await loadImage('assets/mask2.png');
 * createCanvas(100, 100);
 * 
 * // Apply the mask.
 * photo.mask(maskImage);
 * 
 * // Display the image.
 * image(photo, 0, 0);
 * 
 * describe('An image of a mountain landscape. The right side of the image has a faded patch of white.');
 * }
 * </code>
 * </div>
 */
function mask(p5Image: any, srcImage: p5.Image): void;

/**
 * Applies an image filter to the image.The preset options are:`INVERT`
 * Inverts the colors in the image. No parameter is used.`GRAY`
 * Converts the image to grayscale. No parameter is used.`THRESHOLD`
 * Converts the image to black and white. Pixels with a grayscale value
 * above a given threshold are converted to white. The rest are converted to
 * black. The threshold must be between 0.0 (black) and 1.0 (white). If no
 * value is specified, 0.5 is used.`OPAQUE`
 * Sets the alpha channel to be entirely opaque. No parameter is used.`POSTERIZE`
 * Limits the number of colors in the image. Each color channel is limited to
 * the number of colors specified. Values between 2 and 255 are valid, but
 * results are most noticeable with lower values. The default value is 4.`BLUR`
 * Blurs the image. The level of blurring is specified by a blur radius. Larger
 * values increase the blur. The default value is 4. A gaussian blur is used
 * in `P2D` mode. A box blur is used in `WEBGL` mode.`ERODE`
 * Reduces the light areas. No parameter is used.`DILATE`
 * Increases the light areas. No parameter is used.
 *
 * @param either THRESHOLD, GRAY, OPAQUE, INVERT,
 * POSTERIZE, ERODE, DILATE or BLUR.
 * @param parameter unique to each filter.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the INVERT filter.
 * img.filter(INVERT);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A blue brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the GRAY filter.
 * img.filter(GRAY);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A brick wall drawn in grayscale.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the THRESHOLD filter.
 * img.filter(THRESHOLD);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A brick wall drawn in black and white.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the OPAQUE filter.
 * img.filter(OPAQUE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the POSTERIZE filter.
 * img.filter(POSTERIZE, 3);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('An image of a red brick wall drawn with a limited color palette.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the BLUR filter.
 * img.filter(BLUR, 3);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A blurry image of a red brick wall.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the DILATE filter.
 * img.filter(DILATE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall with bright lines between each brick.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/bricks.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Apply the ERODE filter.
 * img.filter(ERODE);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('A red brick wall with faint lines between each brick.');
 * }
 * </code>
 * </div>
 */
function filter(operation: any, value: any, filterType: THRESHOLD | GRAY | OPAQUE | INVERT | POSTERIZE | ERODE | DILATE | BLUR, filterParam?: number): void;

/**
 * Copies a region of pixels from another image into this one.The first parameter, `srcImage`, is the
 * p5.Image object to blend.The next four parameters, `sx`, `sy`, `sw`, and `sh` determine the region
 * to blend from the source image. `(sx, sy)` is the top-left corner of the
 * region. `sw` and `sh` are the regions width and height.The next four parameters, `dx`, `dy`, `dw`, and `dh` determine the region
 * of the canvas to blend into. `(dx, dy)` is the top-left corner of the
 * region. `dw` and `dh` are the regions width and height.The tenth parameter, `blendMode`, sets the effect used to blend the images'
 * colors. The options are `BLEND`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`,
 * `MULTIPLY`, `EXCLUSION`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`,
 * `SOFT_LIGHT`, `DODGE`, `BURN`, `ADD`, or `NORMAL`.
 *
 * @param source image
 * @param x-coordinate of the source's upper-left corner.
 * @param y-coordinate of the source's upper-left corner.
 * @param source image width.
 * @param source image height.
 * @param x-coordinate of the destination's upper-left corner.
 * @param y-coordinate of the destination's upper-left corner.
 * @param destination image width.
 * @param destination image height.
 * @param the blend mode. either
 * BLEND, DARKEST, LIGHTEST, DIFFERENCE,
 * MULTIPLY, EXCLUSION, SCREEN, REPLACE, OVERLAY, HARD_LIGHT,
 * SOFT_LIGHT, DODGE, BURN, ADD or NORMAL.
 * 
 * Available blend modes are: normal | multiply | screen | overlay |
 * darken | lighten | color-dodge | color-burn | hard-light |
 * soft-light | difference | exclusion | hue | saturation |
 * color | luminosity
 * 
 * http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
 * @example <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, ADD);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears faded on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, DARKEST);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears transparent on the right of the image.');
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let mountains;
 * let bricks;
 * 
 * async function setup() {
 * // Load the images.
 * mountains = await loadImage('assets/rockies.jpg');
 * bricks = await loadImage('assets/bricks_third.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Blend the bricks image into the mountains.
 * mountains.blend(bricks, 0, 0, 33, 100, 67, 0, 33, 100, LIGHTEST);
 * 
 * // Display the mountains image.
 * image(mountains, 0, 0);
 * 
 * // Display the bricks image.
 * image(bricks, 0, 0);
 * 
 * describe('A wall of bricks in front of a mountain landscape. The same wall of bricks appears washed out on the right of the image.');
 * }
 * </code>
 * </div>
 */
function blend(...args: any[], srcImage: p5.Image, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 */
function blend(...args: any[], sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, blendMode: BLEND | DARKEST | LIGHTEST | DIFFERENCE | MULTIPLY | EXCLUSION | SCREEN | REPLACE | OVERLAY | HARD_LIGHT | SOFT_LIGHT | DODGE | BURN | ADD | NORMAL): void;

/**
 * Saves the image to a file.By default, `img.save()` saves the image as a PNG image called
 * `untitled.png`.The first parameter, `filename`, is optional. It's a string that sets the
 * file's name. If a file extension is included, as in
 * `img.save('drawing.png')`, then the image will be saved using that
 * format.The second parameter, `extension`, is also optional. It sets the files format.
 * Either `'png'` or `'jpg'` can be used. For example, `img.save('drawing', 'jpg')`
 * saves the canvas to a file called `drawing.jpg`.Note: The browser will either save the file immediately or prompt the user
 * with a dialogue window.The image will only be downloaded as an animated GIF if it was loaded
 * from a GIF file. See saveGif() to create new
 * GIFs.
 *
 * @param filename. Defaults to 'untitled'.
 * @param file extension, either 'png' or 'jpg'.
 * Defaults to 'png'.
 * @example <div>
 * <code>
 * let img;
 * 
 * async function setup() {
 * // Load the image.
 * img = await loadImage('assets/rockies.jpg');
 * 
 * createCanvas(100, 100);
 * 
 * // Display the image.
 * image(img, 0, 0);
 * 
 * describe('An image of a mountain landscape. The image is downloaded when the user presses the "s", "j", or "p" key.');
 * }
 * 
 * // Save the image with different options when the user presses a key.
 * function keyPressed() {
 * if (key === 's') {
 * img.save();
 * } else if (key === 'j') {
 * img.save('rockies.jpg');
 * } else if (key === 'p') {
 * img.save('rockies', 'png');
 * }
 * }
 * </code>
 * </div>
 */
function save(filename: string, extension?: string): void;

/**
 * Restarts an animated GIF at its first frame.
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-wink-loop-once.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon face winks once and then freezes. Clicking resets the face and makes it wink again.');
 * }
 * 
 * function draw() {
 * background(255);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * 
 * // Reset the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.reset();
 * }
 * </code>
 * </div>
 */
function reset(): void;

/**
 * Gets the index of the current frame in an animated GIF.
 *
 * @return index of the GIF's current frame.
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon eye repeatedly looks around, then outwards. A number displayed in the bottom-left corner increases from 0 to 124, then repeats.');
 * }
 * 
 * function draw() {
 * // Get the index of the current GIF frame.
 * let index = gif.getCurrentFrame();
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * 
 * // Display the current frame.
 * text(index, 10, 90);
 * }
 * </code>
 * </div>
 */
function getCurrentFrame(): number;

/**
 * Sets the current frame in an animated GIF.
 *
 * @param index of the frame to display.
 * @example <div>
 * <code>
 * let gif;
 * let frameSlider;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * // Get the index of the last frame.
 * let maxFrame = gif.numFrames() - 1;
 * 
 * // Create a slider to control which frame is drawn.
 * frameSlider = createSlider(0, maxFrame);
 * frameSlider.position(10, 80);
 * frameSlider.size(80);
 * 
 * describe('A cartoon eye looks around when a slider is moved.');
 * }
 * 
 * function draw() {
 * // Get the slider's value.
 * let index = frameSlider.value();
 * 
 * // Set the GIF's frame.
 * gif.setFrame(index);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * </code>
 * </div>
 */
function setFrame(index: number): void;

/**
 * Returns the number of frames in an animated GIF.
 *
 * @return number of frames in the GIF.
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A cartoon eye looks around. The text "n / 125" is shown at the bottom of the canvas.');
 * }
 * 
 * function draw() {
 * // Display the image.
 * image(gif, 0, 0);
 * 
 * // Display the current state of playback.
 * let total = gif.numFrames();
 * let index = gif.getCurrentFrame();
 * text(`${index} / ${total}`, 30, 90);
 * }
 * </code>
 * </div>
 */
function numFrames(): number;

/**
 * Plays an animated GIF that was paused with
 * img.pause().
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/nancy-liang-wind-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A drawing of a child with hair blowing in the wind. The animation freezes when clicked and resumes when released.');
 * }
 * 
 * function draw() {
 * background(255);
 * image(gif, 0, 0);
 * }
 * 
 * // Pause the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.pause();
 * }
 * 
 * // Play the GIF when the user releases the mouse.
 * function mouseReleased() {
 * gif.play();
 * }
 * </code>
 * </div>
 */
function play(): void;

/**
 * Pauses an animated GIF.The GIF can be resumed by calling
 * img.play().
 *
 * @example <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/nancy-liang-wind-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * describe('A drawing of a child with hair blowing in the wind. The animation freezes when clicked and resumes when released.');
 * }
 * 
 * function draw() {
 * background(255);
 * 
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * 
 * // Pause the GIF when the user presses the mouse.
 * function mousePressed() {
 * gif.pause();
 * }
 * 
 * // Play the GIF when the user presses the mouse.
 * function mouseReleased() {
 * gif.play();
 * }
 * </code>
 * </div>
 */
function pause(): void;

/**
 * Changes the delay between frames in an animated GIF.The first parameter, `delay`, is the length of the delay in milliseconds.The second parameter, `index`, is optional. If provided, only the frame
 * at `index` will have its delay modified. All other frames will keep
 * their default delay.
 *
 * @param delay in milliseconds between switching frames.
 * @param index of the frame that will have its delay modified.
 * @example <div>
 * <code>
 * let gifFast;
 * let gifSlow;
 * 
 * async function setup() {
 * // Load the images.
 * gifFast = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * gifSlow = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * background(200);
 * 
 * // Resize the images.
 * gifFast.resize(50, 50);
 * gifSlow.resize(50, 50);
 * 
 * // Set the delay lengths.
 * gifFast.delay(10);
 * gifSlow.delay(100);
 * 
 * describe('Two animated eyes looking around. The eye on the left moves faster than the eye on the right.');
 * }
 * 
 * function draw() {
 * // Display the images.
 * image(gifFast, 0, 0);
 * image(gifSlow, 50, 0);
 * }
 * </code>
 * </div>
 * 
 * <div>
 * <code>
 * let gif;
 * 
 * async function setup() {
 * // Load the image.
 * gif = await loadImage('assets/arnott-wallace-eye-loop-forever.gif');
 * 
 * createCanvas(100, 100);
 * 
 * // Set the delay of frame 67.
 * gif.delay(3000, 67);
 * 
 * describe('An animated eye looking around. It pauses for three seconds while it looks down.');
 * }
 * 
 * function draw() {
 * // Display the image.
 * image(gif, 0, 0);
 * }
 * </code>
 * </div>
 */
function delay(d: number, index?: number): void;

}

export default function p5_Image(p5: any, fn: any): void;
