// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Color } from '../color/p5.Color';

declare module 'p5' {
/**
 * This is a helper function that generates Zod schemas for a function based on
 * the parameter data from `docs/parameterData.json`.Example parameter data for function `background`:
 * "background": {
 * "overloads": [
 * ["p5.Color"],
 * ["String", "Number?"],
 * ["Number", "Number?"],
 * ["Number", "Number", "Number", "Number?"],
 * ["Number[]"],
 * ["p5.Image", "Number?"]
 * ]
 * }
 * Where each array in `overloads` represents a set of valid overloaded
 * parameters, and `?` is a shorthand for `Optional`.
 *
 * @param Name of the function. Expect global functions like `sin` and class methods like `p5.Vector.add`
 * @returns Zod schema
 */
function generateZodSchemasForFunc(func: string): z.ZodSchema;

}

export default function param_validator(p5: any, fn: any): void;
