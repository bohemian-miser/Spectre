// This file is auto-generated from JSDoc documentation

import p5 from 'p5';

declare module 'p5' {
/**
 * Initializes common texture parameters, creates a gl texture,
 * tries to upload the texture for the first time if data is
 * already available.
 *
 */
function init(data: any): void;

/**
 * Checks if the source data for this texture has changed (if it's
 * easy to do so) and reuploads the texture if necessary. If it's not
 * possible or to expensive to do a calculation to determine wheter or
 * not the data has occurred, this method simply re-uploads the texture.
 *
 */
function update(): void;

/**
 * Binds the texture to the appropriate GL target.
 *
 */
function bindTexture(): void;

/**
 * Unbinds the texture from the appropriate GL target.
 *
 */
function unbindTexture(): void;

/**
 * Sets how a texture is be interpolated when upscaled or downscaled.
 * Nearest filtering uses nearest neighbor scaling when interpolating
 * Linear filtering uses WebGL's linear scaling when interpolating
 *
 * @param Specifies the texture filtering when
 * textures are shrunk. Options are LINEAR or NEAREST
 * @param Specifies the texture filtering when
 * textures are magnified. Options are LINEAR or NEAREST
 * @todo implement mipmapping filters
 */
function setInterpolation(downScale: string, upScale: string): void;

/**
 * Sets the texture wrapping mode. This controls how textures behave
 * when their uv's go outside of the 0 - 1 range. There are three options:
 * CLAMP, REPEAT, and MIRROR. REPEAT & MIRROR are only available if the texture
 * is a power of two size (128, 256, 512, 1024, etc.).
 *
 * @param Controls the horizontal texture wrapping behavior
 * @param Controls the vertical texture wrapping behavior
 */
function setWrapMode(wrapX: string, wrapY: string): void;

}

export default function p5_Texture(p5: any, fn: any): void;
