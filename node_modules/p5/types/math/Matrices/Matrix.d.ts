// This file is auto-generated from JSDoc documentation

import p5 from 'p5';
import { Vector } from '../math/p5.Vector';

declare module 'p5' {
/**
 * Adds the corresponding elements of the given matrix to this matrix, if the dimentions are the same.
 *
 * @param The matrix to add to this matrix. It must have the same dimensions as this matrix.
 * @returns The resulting matrix after addition.
 * @throws If the matrices do not have the same dimensions.
 * @example const matrix1 = new p5.Matrix([1, 2, 3]);
 * const matrix2 = new p5.Matrix([4, 5, 6]);
 * matrix1.add(matrix2); // matrix1 is now [5, 7, 9]
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix1 = new p5.Matrix([1, 2, 3, 4]);
 * const matrix2 = new p5.Matrix([5, 6, 7, 8]);
 * matrix1.add(matrix2);
 * console.log(matrix1.matrix); // Output: [6, 8, 10, 12]
 * }
 * </code></div>
 */
function add(matrix: Matrix): Matrix;

/**
 * Sets the value of a specific element in the matrix in column-major order.A matrix is stored in column-major order, meaning elements are arranged column by column.
 * This function allows you to update or change the value of a specific element
 * in the matrix by specifying its index in the column-major order and the new value.Parameters:Example:
 * If you have the following 3x3 matrix stored in column-major order:`[
 * 1, 4, 7,  // Column 1
 * 2, 5, 8,  // Column 2
 * 3, 6, 9   // Column 3
 * ]`Calling `setElement(4, 10)` will update the element at index 4
 * (which corresponds to row 2, column 2 in row-major order) to `10`.
 * The updated matrix will look like this:`[
 * 1, 4, 7,
 * 2, 10, 8,
 * 3, 6, 9
 * ]`This function is useful for modifying specific parts of the matrix without
 * having to recreate the entire structure.
 *
 * @param The position in the matrix where the value should be set.
 * Must be a non-negative integer less than the length of the matrix.
 * @param The new value to be assigned to the specified position in the matrix.
 * @returns The current instance of the Matrix, allowing for method chaining.
 * @example // Assuming matrix is an instance of Matrix with initial values [1, 2, 3, 4] matrix.setElement(2, 99);
 * // Now the matrix values are [1, 2, 99, 4]
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix([1, 2, 3, 4]);
 * matrix.setElement(2, 99);
 * console.log(matrix.matrix); // Output: [1, 2, 99, 4]
 * }
 * </code></div>
 */
function setElement(index: number, value: number): Matrix;

/**
 * Resets the current matrix to an identity matrix.This method replaces the current matrix with an identity matrix of the same dimensions.
 * An identity matrix is a square matrix with ones on the main diagonal and zeros elsewhere.
 * This is useful for resetting transformations or starting fresh with a clean matrix.
 *
 * @returns The current instance of the Matrix class, allowing for method chaining.
 * @example // Resetting a 4x4 matrix to an identity matrix
 * const matrix = new p5.Matrix(4);
 * matrix.scale(2, 2, 2); // Apply some transformations
 * console.log(matrix.matrix); // Output: Transformed matrix
 * matrix.reset(); // Reset to identity matrix
 * console.log(matrix.matrix); // Output: Identity matrix
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4);
 * matrix.scale(2, 2, 2); // Apply scaling transformation
 * console.log("Before reset:", matrix.matrix);
 * matrix.reset(); // Reset to identity matrix
 * console.log("After reset:", matrix.matrix);
 * }
 * </code></div>
 */
function reset(): Matrix;

/**
 * Replace the entire contents of a NxN matrix.This method allows you to replace the values of the current matrix with
 * those from another matrix, an array, or individual arguments. The input
 * can be a `Matrix` instance, an array of numbers, or individual numbers
 * that match the dimensions of the current matrix. The values are copied
 * without referencing the source object, ensuring that the original input
 * remains unchanged.If the input dimensions do not match the current matrix, an error will
 * be thrown to ensure consistency.
 *
 * @param The input matrix, array,
 * or individual numbers to replace the current matrix values.
 * @returns The current instance of the Matrix class, allowing for
 * method chaining.
 * @example // Replacing the contents of a matrix with another matrix
 * const matrix1 = new p5.Matrix([1, 2, 3, 4]);
 * const matrix2 = new p5.Matrix([5, 6, 7, 8]);
 * matrix1.set(matrix2);
 * console.log(matrix1.matrix); // Output: [5, 6, 7, 8]
 * 
 * // Replacing the contents of a matrix with an array
 * const matrix = new p5.Matrix([1, 2, 3, 4]);
 * matrix.set([9, 10, 11, 12]);
 * console.log(matrix.matrix); // Output: [9, 10, 11, 12]
 * 
 * // Replacing the contents of a matrix with individual numbers
 * const matrix = new p5.Matrix(4); // Creates a 4x4 identity matrix
 * matrix.set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
 * console.log(matrix.matrix); // Output: [1, 2, 3, ..., 16]
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix([1, 2, 3, 4]);
 * console.log("Before set:", matrix.matrix);
 * matrix.set([5, 6, 7, 8]);
 * console.log("After set:", matrix.matrix); // Output: [5, 6, 7, 8]
 * }
 * </code></div>
 */
function set(inMatrix?: Matrix | Float32Array | number[]): Matrix;

/**
 * Gets a copy of the matrix, returns a p5.Matrix object.This method creates a new instance of the `Matrix` class and copies the
 * current matrix values into it. The returned matrix is independent of the
 * original, meaning changes to the copy will not affect the original matrix.This is useful when you need to preserve the current state of a matrix
 * while performing operations on a duplicate.
 *
 * @return A new instance of the `Matrix` class containing the
 * same values as the original matrix.
 * @example // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const originalMatrix = new p5.Matrix([1, 2, 3, 4]);
 * const copiedMatrix = originalMatrix.get();
 * console.log("Original Matrix:", originalMatrix.matrix); // Output: [1, 2, 3, 4]
 * console.log("Copied Matrix:", copiedMatrix.matrix); // Output: [1, 2, 3, 4]
 * 
 * // Modify the copied matrix
 * copiedMatrix.setElement(2, 99);
 * console.log("Modified Copied Matrix:", copiedMatrix.matrix); // Output: [1, 2, 99, 4]
 * console.log("Original Matrix remains unchanged:", originalMatrix.matrix); // Output: [1, 2, 3, 4]
 * }
 * </code></div>
 */
function get(): p5.Matrix;

/**
 * Return a copy of this matrix.
 * If this matrix is 4x4, a 4x4 matrix with exactly the same entries will be
 * generated. The same is true if this matrix is 3x3 or any NxN matrix.This method is useful when you need to preserve the current state of a matrix
 * while performing operations on a duplicate. The returned matrix is independent
 * of the original, meaning changes to the copy will not affect the original matrix.
 *
 * @return The result matrix.
 * @example // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const originalMatrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const copiedMatrix = originalMatrix.copy();
 * console.log("Original Matrix:", originalMatrix.matrix);
 * console.log("Copied Matrix:", copiedMatrix.matrix);
 * 
 * // Modify the copied matrix
 * copiedMatrix.setElement(4, 99);
 * console.log("Modified Copied Matrix:", copiedMatrix.matrix);
 * console.log("Original Matrix remains unchanged:", originalMatrix.matrix);
 * }
 * </code></div>
 */
function copy(): p5.Matrix;

/**
 * Creates a copy of the current matrix instance.
 * This method is useful when you need a duplicate of the matrix
 * without modifying the original one.
 *
 * @returns A new matrix instance that is a copy of the current matrix.
 * @example // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const originalMatrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const clonedMatrix = originalMatrix.clone();
 * console.log("Original Matrix:", originalMatrix.matrix);
 * console.log("Cloned Matrix:", clonedMatrix.matrix);
 * 
 * // Modify the cloned matrix
 * clonedMatrix.setElement(4, 99);
 * console.log("Modified Cloned Matrix:", clonedMatrix.matrix);
 * console.log("Original Matrix remains unchanged:", originalMatrix.matrix);
 * }
 * </code></div>
 */
function clone(): Matrix;

/**
 * Returns the diagonal elements of the matrix in the form of an array.
 * A NxN matrix will return an array of length N.This method extracts the diagonal elements of the matrix, which are the
 * elements where the row index equals the column index. For example, in a
 * 3x3 matrix:`[
 * 1, 2, 3,
 * 4, 5, 6,
 * 7, 8, 9
 * ]`The diagonal elements are [1, 5, 9].This is useful for operations that require the main diagonal of a matrix,
 * such as calculating the trace of a matrix or verifying if a matrix is diagonal.
 *
 * @return An array obtained by arranging the diagonal elements
 * of the matrix in ascending order of index.
 * @example // Extracting the diagonal elements of a matrix
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const diagonal = matrix.diagonal(); // [1, 5, 9]
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const diagonal = matrix.diagonal();
 * console.log("Diagonal elements:", diagonal); // Output: [1, 5, 9]
 * }
 * </code></div>
 */
function diagonal(): number[];

/**
 * This function is only for 3x3 matrices A function that returns a row vector of a NxN matrix.This method extracts a specific row from the matrix and returns it as a `p5.Vector`.
 * The row is determined by the `columnIndex` parameter, which specifies the column
 * index of the matrix. This is useful for operations that require working with
 * individual rows of a matrix, such as row transformations or dot products.
 *
 * @param The index of the column to extract as a row vector.
 * Must be a non-negative integer less than the matrix dimension.
 * @return A `p5.Vector` representing the extracted row of the matrix.
 * @example // Extracting a row vector from a 3x3 matrix
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const rowVector = matrix.row(1); // Returns a vector [2, 5, 8]
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const rowVector = matrix.row(1); // Extract the second row (index 1)
 * console.log("Row Vector:", rowVector.toString()); // Output: Row Vector: [2, 5, 8]
 * }
 * </code></div>
 */
function row(columnIndex: number): p5.Vector;

/**
 * A function that returns a column vector of a NxN matrix.This method extracts a specific column from the matrix and returns it as a `p5.Vector`.
 * The column is determined by the `rowIndex` parameter, which specifies the row index
 * of the matrix. This is useful for operations that require working with individual
 * columns of a matrix, such as column transformations or dot products.
 *
 * @param The index of the row to extract as a column vector.
 * Must be a non-negative integer less than the matrix dimension.
 * @return A `p5.Vector` representing the extracted column of the matrix.
 * @example // Extracting a column vector from a 3x3 matrix
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const columnVector = matrix.column(1); // Returns a vector [4, 5, 6]
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const columnVector = matrix.column(1); // Extract the second column (index 1)
 * console.log("Column Vector:", columnVector.toString()); // Output: Column Vector: [4, 5, 6]
 * }
 * </code></div>
 */
function column(rowIndex: number): p5.Vector;

/**
 * Transposes the given matrix `a` based on the square dimension of the matrix.This method rearranges the elements of the matrix such that the rows become columns
 * and the columns become rows. It handles matrices of different dimensions (4x4, 3x3, NxN)
 * by delegating to specific transpose methods for each case.If no argument is provided, the method transposes the current matrix instance.
 * If an argument is provided, it transposes the given matrix `a` and updates the current matrix.
 *
 * @param The matrix to be transposed. It should be a 2D array where each sub-array represents a row.
 * If omitted, the current matrix instance is transposed.
 * @returns The current instance of the Matrix class, allowing for method chaining.
 * @example // Transposing a 3x3 matrix
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * matrix.transpose();
 * console.log(matrix.matrix); // Output: [1, 4, 7, 2, 5, 8, 3, 6, 9]
 * 
 * // Transposing a 4x4 matrix
 * const matrix4x4 = new p5.Matrix(4);
 * matrix4x4.transpose();
 * console.log(matrix4x4.matrix); // Output: Transposed 4x4 identity matrix
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * console.log("Before transpose:", matrix.matrix);
 * matrix.transpose();
 * console.log("After transpose:", matrix.matrix); // Output: [1, 4, 7, 2, 5, 8, 3, 6, 9]
 * }
 * </code></div>
 */
function transpose(a?: Array): Matrix;

/**
 * Multiplies the current matrix with another matrix or matrix-like array.This method supports several types of input:If the input is the same as the current matrix, a copy is made to avoid modifying the original matrix.The method determines the appropriate multiplication strategy based on the dimensions of the current matrix
 * and the input matrix. It supports 3x3, 4x4, and NxN matrices.
 *
 * @param The matrix or matrix-like array to multiply with.
 * @returns The resulting matrix after multiplication, or undefined if the input is invalid.
 * @example // Multiplying two 3x3 matrices
 * const matrix1 = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const matrix2 = new p5.Matrix([9, 8, 7, 6, 5, 4, 3, 2, 1]);
 * matrix1.mult(matrix2);
 * console.log(matrix1.matrix); // Output: [30, 24, 18, 84, 69, 54, 138, 114, 90]
 * 
 * // Multiplying a 4x4 matrix with another 4x4 matrix
 * const matrix4x4_1 = new p5.Matrix(4); // Identity matrix
 * const matrix4x4_2 = new p5.Matrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
 * matrix4x4_1.mult(matrix4x4_2);
 * console.log(matrix4x4_1.matrix); // Output: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix1 = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const matrix2 = new p5.Matrix([9, 8, 7, 6, 5, 4, 3, 2, 1]);
 * console.log("Before multiplication:", matrix1.matrix);
 * matrix1.mult(matrix2);
 * console.log("After multiplication:", matrix1.matrix); // Output: [30, 24, 18, 84, 69, 54, 138, 114, 90]
 * }
 * </code></div>
 */
function mult(multMatrix: any): Matrix | any;

/**
 * Takes a vector and returns the vector resulting from multiplying to that vector by this matrix from left. This function is only for 3x3 matrices.This method applies the current 3x3 matrix to a given vector, effectively
 * transforming the vector using the matrix. The resulting vector is returned
 * as a new vector or stored in the provided target vector.
 *
 * @param The vector to which this matrix applies.
 * @param The vector to receive the result. If not provided,
 * a copy of the input vector will be created and returned.
 * @return The transformed vector after applying the matrix.
 * @example // Multiplying a 3x3 matrix with a vector
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const vector = new p5.Vector(1, 2, 3);
 * const result = matrix.multiplyVec(vector);
 * console.log(result.toString()); // Output: Transformed vector
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const vector = new p5.Vector(1, 2, 3);
 * const result = matrix.multiplyVec(vector);
 * console.log("Original Vector:", vector.toString()); // Output : Original Vector: [1, 2, 3]
 * console.log("Transformed Vector:", result.toString()); // Output : Transformed Vector: [30, 36, 42]
 * }
 * </code></div>
 */
function multiplyVec(multVector: p5.Vector, target?: p5.Vector): p5.Vector;

/**
 * Inverts a given matrix.This method inverts a matrix based on its dimensions. Currently, it supports
 * 3x3 and 4x4 matrices. If the matrix dimension is greater than 4, an error is thrown.For 4x4 matrices, it uses a specialized algorithm to compute the inverse.
 * For 3x3 matrices, it uses a different algorithm optimized for smaller matrices.If the matrix is singular (non-invertible), the method will return `null`.
 *
 * @param The matrix to be inverted. It should be a 2D array representing the matrix.
 * @returns The inverted matrix, or `null` if the matrix is singular.
 * @throws Throws an error if the matrix dimension is greater than 4.
 * @example // Inverting a 3x3 matrix
 * const matrix = new p5.Matrix([1, 2, 3, 0, 1, 4, 5, 6, 0]);
 * const invertedMatrix = matrix.invert();
 * console.log(invertedMatrix.matrix); // Output: Inverted 3x3 matrix
 * 
 * // Inverting a 4x4 matrix
 * const matrix4x4 = new p5.Matrix(4); // Identity matrix
 * matrix4x4.scale(2, 2, 2);
 * const invertedMatrix4x4 = matrix4x4.invert();
 * console.log(invertedMatrix4x4.matrix); // Output: Inverted 4x4 matrix
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix([1, 2, 3, 0, 1, 4, 5, 6, 0]);
 * console.log("Original Matrix:", matrix.matrix);
 * const invertedMatrix = matrix.invert();
 * if (invertedMatrix) {
 * console.log("Inverted Matrix:", invertedMatrix.matrix);
 * } else {
 * console.log("Matrix is singular and cannot be inverted.");
 * }
 * }
 * </code></div>
 */
function invert(a: Array): Array | any;

/**
 * Creates a 3x3 matrix whose entries are the top left 3x3 part and returns it. This function is only for 4x4 matrices.This method extracts the top-left 3x3 portion of a 4x4 matrix and creates a new
 * 3x3 matrix from it. This is particularly useful in 3D graphics for operations
 * that require only the rotational or scaling components of a transformation matrix.If the current matrix is not 4x4, an error is thrown to ensure the method is used
 * correctly. The resulting 3x3 matrix is independent of the original matrix, meaning
 * changes to the new matrix will not affect the original.
 *
 * @return A new 3x3 matrix containing the top-left portion of the original 4x4 matrix.
 * @throws If the current matrix is not 4x4.
 * @example // Extracting a 3x3 submatrix from a 4x4 matrix
 * const matrix4x4 = new p5.Matrix(4); // Creates a 4x4 identity matrix
 * matrix4x4.scale(2, 2, 2); // Apply scaling transformation
 * const subMatrix3x3 = matrix4x4.createSubMatrix3x3();
 * console.log("Original 4x4 Matrix:", matrix4x4.matrix);
 * console.log("Extracted 3x3 Submatrix:", subMatrix3x3.matrix);
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix4x4 = new p5.Matrix(4); // Creates a 4x4 identity matrix
 * matrix4x4.scale(2, 2, 2); // Apply scaling transformation
 * console.log("Original 4x4 Matrix:", matrix4x4.matrix);
 * 
 * const subMatrix3x3 = matrix4x4.createSubMatrix3x3();
 * console.log("Extracted 3x3 Submatrix:", subMatrix3x3.matrix);
 * }
 * </code></div>
 */
function createSubMatrix3x3(): p5.Matrix;

/**
 * Converts a 4×4 matrix to its 3×3 inverse transpose transform.
 * This is commonly used in MVMatrix to NMatrix conversions, particularly
 * in 3D graphics for transforming normal vectors.This method extracts the top-left 3×3 portion of a 4×4 matrix, inverts it,
 * and then transposes the result. If the matrix is singular (non-invertible),
 * the resulting matrix will be zeroed out.
 *
 * @param The 4×4 matrix to be converted.
 * @returns The current instance of the Matrix class, allowing for method chaining.
 * @throws If the current matrix is not 3×3.
 * @example // Converting a 4×4 matrix to its 3×3 inverse transpose
 * const mat4 = new p5.Matrix(4); // Create a 4×4 identity matrix
 * mat4.scale(2, 2, 2); // Apply scaling transformation
 * const mat3 = new p5.Matrix(3); // Create a 3×3 matrix
 * mat3.inverseTranspose4x4(mat4);
 * console.log("Converted 3×3 Matrix:", mat3.matrix);
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const mat4 = new p5.Matrix(4); // Create a 4×4 identity matrix
 * mat4.scale(2, 2, 2); // Apply scaling transformation
 * console.log("Original 4×4 Matrix:", mat4.matrix);
 * 
 * const mat3 = new p5.Matrix(3); // Create a 3×3 matrix
 * mat3.inverseTranspose4x4(mat4);
 * console.log("Converted 3×3 Matrix:", mat3.matrix);
 * }
 * </code></div>
 */
function inverseTranspose4x4(mat4: p5.Matrix): Matrix;

/**
 * Applies a transformation matrix to the current matrix.This method multiplies the current matrix by another matrix, which can be provided
 * in several forms: another Matrix instance, an array representing a matrix, or as
 * individual arguments representing the elements of a 4x4 matrix.This operation is useful for combining transformations such as translation, rotation,
 * scaling, and perspective projection into a single matrix. By applying a transformation
 * matrix, you can modify the current matrix to represent a new transformation.
 *
 * @param The matrix to multiply with. This can be:
 * - An instance of the Matrix class.
 * - An array of 16 numbers representing a 4x4 matrix.
 * - 16 individual numbers representing the elements of a 4x4 matrix.
 * @returns The current matrix after applying the transformation.
 * @example <div class="norender"><code>
 * function setup() {
 * 
 * // Assuming `matrix` is an instance of Matrix
 * const anotherMatrix = new p5.Matrix(4);
 * const anotherMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
 * matrix.apply(anotherMatrix);
 * 
 * // Applying a transformation using an array
 * const matrixArray = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
 * matrix.apply(matrixArray);
 * 
 * // Applying a transformation using individual arguments
 * matrix.apply(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
 * 
 * // Create a 4x4 identity matrix
 * const matrix = new p5.Matrix(4);
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Create a scaling transformation matrix
 * const scalingMatrix = new p5.Matrix([2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1]);
 * 
 * // Apply the scaling transformation
 * matrix.apply(scalingMatrix);
 * console.log("After Scaling Transformation:", matrix.matrix);
 * 
 * // Apply a translation transformation using an array
 * const translationMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 5, 5, 1];
 * matrix.apply(translationMatrix);
 * console.log("After Translation Transformation:", matrix.matrix);
 * }
 * </code></div>
 */
function apply(multMatrix: Matrix | Array | number): Matrix;

/**
 * Scales a p5.Matrix by scalars or a vector.This method applies a scaling transformation to the current matrix.
 * Scaling is a transformation that enlarges or shrinks objects by a scale factor
 * along the x, y, and z axes. The scale factors can be provided as individual
 * numbers, an array, or a `p5.Vector`.If a `p5.Vector` or an array is provided, the x, y, and z components are extracted
 * from it. If the z component is not provided, it defaults to 1 (no scaling along the z-axis).
 *
 * @param The vector or scalars to scale by.
 * Can be a `p5.Vector`, an array, or individual numbers.
 * @returns The current instance of the Matrix class, allowing for method chaining.
 * @example // Scaling a matrix by individual scalars
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * matrix.scale(2, 3, 4); // Scale by 2 along x, 3 along y, and 4 along z
 * console.log(matrix.matrix);
 * 
 * // Scaling a matrix by a p5.Vector
 * const scaleVector = new p5.Vector(2, 3, 4);
 * matrix.scale(scaleVector);
 * console.log(matrix.matrix);
 * 
 * // Scaling a matrix by an array
 * const scaleArray = [2, 3, 4];
 * matrix.scale(scaleArray);
 * console.log(matrix.matrix);
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Scale the matrix by individual scalars
 * matrix.scale(2, 3, 4);
 * console.log("Scaled Matrix (2, 3, 4):", matrix.matrix);
 * 
 * // Scale the matrix by a p5.Vector
 * const scaleVector = new p5.Vector(1.5, 2.5, 3.5);
 * matrix.scale(scaleVector);
 * console.log("Scaled Matrix (Vector):", matrix.matrix);
 * 
 * // Scale the matrix by an array
 * const scaleArray = [0.5, 0.5, 0.5];
 * matrix.scale(scaleArray);
 * console.log("Scaled Matrix (Array):", matrix.matrix);
 * }
 * </code></div>
 */
function scale(x: any, y: any, z: any, s: p5.Vector | Float32Array | number[]): Matrix;

/**
 * Rotate the Matrix around a specified axis by a given angle.This method applies a rotation transformation to the matrix, modifying its orientation
 * in 3D space. The rotation is performed around the provided axis, which can be defined
 * as a `p5.Vector` or an array of numbers representing the x, y, and z components of the axis.
 * Rotate our Matrix around an axis by the given angle.
 *
 * @param The angle of rotation in radians.
 * Angles in radians are a measure of rotation, where 2π radians
 * represent a full circle (360 degrees). For example:
 * - π/2 radians = 90 degrees (quarter turn)
 * - π radians = 180 degrees (half turn)
 * - 2π radians = 360 degrees (full turn)
 * Use `Math.PI` for π or `p5`'s `PI` constant if using p5.js.
 * @param The axis or axes to rotate around.
 * This defines the direction of the rotation.
 * - If using a `p5.Vector`, it should represent
 * the x, y, and z components of the axis.
 * - If using an array, it should be in the form
 * [x, y, z], where x, y, and z are numbers.
 * For example:
 * - [1, 0, 0] rotates around the x-axis.
 * - [0, 1, 0] rotates around the y-axis.
 * - [0, 0, 1] rotates around the z-axis.   *
 * @chainable inspired by Toji's gl-matrix lib, mat4 rotation
 * @example // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix.slice().toString()); // [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
 * 
 * // Translate the matrix by a 3D vector
 * matrix.rotate4x4(Math.PI, [1,0,0]);
 * console.log("After rotation of PI degrees on vector [1,0,0]:", matrix.matrix.slice().toString()); // [1,0,0,0,0,-1,1.2246468525851679e-16,0,0,-1.2246468525851679e-16,-1,0,0,0,0,1]
 * }
 * </code></div>
 */
function rotate4x4(a: number, x: any, y: any, z: any, axis: p5.Vector | number[]): void;

/**
 * Translates the current matrix by a given vector.This method applies a translation transformation to the current matrix.
 * Translation moves the matrix by a specified amount along the x, y, and z axes.
 * The input vector can be a 2D or 3D vector. If the z-component is not provided,
 * it defaults to 0, meaning no translation along the z-axis.
 *
 * @param A vector representing the translation. It should be an array
 * with two or three elements: [x, y, z]. The z-component is optional.
 * @returns The current instance of the Matrix class, allowing for method chaining.
 * @example // Translating a matrix by a 3D vector
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * matrix.translate([10, 20, 30]); // Translate by 10 units along x, 20 along y, and 30 along z
 * console.log(matrix.matrix);
 * 
 * // Translating a matrix by a 2D vector
 * matrix.translate([5, 15]); // Translate by 5 units along x and 15 along y
 * console.log(matrix.matrix);
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix.slice().toString()); // [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
 * 
 * // Translate the matrix by a 3D vector
 * matrix.translate([10, 20, 30]);
 * console.log("After 3D Translation (10, 20, 30):", matrix.matrix.slice().toString()); // [1,0,0,0,0,1,0,0,0,0,1,0,10,20,30,1]
 * 
 * // Translate the matrix by a 2D vector
 * matrix.translate([5, 15]);
 * console.log("After 2D Translation (5, 15):", matrix.matrix.slice().toString()); // [1,0,0,0,0,1,0,0,0,0,1,0,15,35,30,1]
 * }
 * </code></div>
 */
function translate(v: number[]): Matrix;

/**
 * Rotates the matrix around the X-axis by a given angle.This method modifies the current matrix to apply a rotation transformation
 * around the X-axis. The rotation angle is specified in radians.Rotating around the X-axis means that the Y and Z coordinates of the matrix
 * are transformed while the X coordinates remain unchanged. This is commonly
 * used in 3D graphics to create animations or transformations along the X-axis.
 *
 * @param The angle in radians to rotate the matrix by.
 * @example // Rotating a matrix around the X-axis
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * matrix.rotateX(Math.PI / 4); // Rotate 45 degrees around the X-axis
 * console.log(matrix.matrix);
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Rotate the matrix 45 degrees (PI/4 radians) around the X-axis
 * matrix.rotateX(Math.PI / 4);
 * console.log("After Rotation (X-axis, 45 degrees):", matrix.matrix);
 * }
 * </code></div>
 */
function rotateX(a: number): void;

/**
 * Rotates the matrix around the Y-axis by a given angle.This method modifies the current matrix to apply a rotation transformation
 * around the Y-axis. The rotation is performed in 3D space, and the angle
 * is specified in radians. Rotating around the Y-axis means that the X and Z
 * coordinates of the matrix are transformed while the Y coordinates remain
 * unchanged. This is commonly used in 3D graphics to create animations or
 * transformations along the Y-axis.
 *
 * @param The angle in radians to rotate the matrix by. Positive
 * values rotate the matrix counterclockwise, and negative values rotate it
 * clockwise.
 * @example // Rotating a matrix around the Y-axis
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * matrix.rotateY(Math.PI / 4); // Rotate 45 degrees around the Y-axis
 * console.log(matrix.matrix);
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Rotate the matrix 45 degrees (PI/4 radians) around the Y-axis
 * matrix.rotateY(Math.PI / 4);
 * console.log("After Rotation (Y-axis, 45 degrees):", matrix.matrix);
 * }
 * </code></div>
 */
function rotateY(a: number): void;

/**
 * Rotates the matrix around the Z-axis by a given angle.This method modifies the current matrix to apply a rotation transformation
 * around the Z-axis. The rotation is performed in a 4x4 matrix context, which
 * is commonly used in 3D graphics to handle transformations. Rotating around
 * the Z-axis means that the X and Y coordinates of the matrix are transformed
 * while the Z coordinates remain unchanged.
 *
 * @param The angle in radians to rotate the matrix by. Positive
 * values rotate the matrix counterclockwise, and negative values rotate it
 * clockwise.
 * @returns The current instance of the Matrix class, allowing for
 * method chaining.
 * @example // Rotating a matrix around the Z-axis
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * matrix.rotateZ(Math.PI / 4); // Rotate 45 degrees around the Z-axis
 * console.log(matrix.matrix);
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Rotate the matrix 45 degrees (PI/4 radians) around the Z-axis
 * matrix.rotateZ(Math.PI / 4);
 * console.log("After Rotation (Z-axis, 45 degrees):", matrix.matrix);
 * }
 * </code></div>
 */
function rotateZ(a: number): Matrix;

/**
 * Sets the perspective projection matrix.This method modifies the current matrix to represent a perspective projection.
 * Perspective projection is commonly used in 3D graphics to simulate the effect
 * of objects appearing smaller as they move further away from the camera.The perspective matrix is defined by the field of view (fovy), aspect ratio,
 * and the near and far clipping planes. The near and far clipping planes define
 * the range of depth that will be rendered, with anything outside this range
 * being clipped.
 *
 * @param The field of view in the y direction, in radians.
 * @param The aspect ratio of the viewport (width / height).
 * @param The distance to the near clipping plane. Must be greater than 0.
 * @param The distance to the far clipping plane. Must be greater than the near value.
 * @returns The current instance of the Matrix class, allowing for method chaining.
 * @example // Setting a perspective projection matrix
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * matrix.perspective(Math.PI / 4, 1.5, 0.1, 100); // Set perspective projection
 * console.log(matrix.matrix);
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Set a perspective projection with a 45-degree field of view,
 * // an aspect ratio of 1.5, and near/far clipping planes at 0.1 and 100.
 * matrix.perspective(Math.PI / 4, 1.5, 0.1, 100);
 * console.log("Perspective Matrix:", matrix.matrix);
 * }
 * </code></div>
 */
function perspective(fovy: number, aspect: number, near: number, far: number): Matrix;

/**
 * Sets this matrix to an orthographic projection matrix.An orthographic projection matrix is used to create a 2D rendering
 * of a 3D scene by projecting points onto a plane without perspective
 * distortion. This method modifies the current matrix to represent
 * the orthographic projection defined by the given parameters.
 *
 * @param The coordinate for the left vertical clipping plane.
 * @param The coordinate for the right vertical clipping plane.
 * @param The coordinate for the bottom horizontal clipping plane.
 * @param The coordinate for the top horizontal clipping plane.
 * @param The distance to the near depth clipping plane. Must be positive.
 * @param The distance to the far depth clipping plane. Must be positive.
 * @returns The current matrix instance, updated with the orthographic projection.
 * @example <div class="norender"><code>
 * // Example using p5.js to demonstrate orthographic projection
 * function setup() {
 * let orthoMatrix = new p5.Matrix(4);
 * console.log(orthoMatrix.matrix.toString()) // Output: 1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1
 * orthoMatrix.ortho(-200, 200, -200, 200, 0.1, 1000);
 * console.log(orthoMatrix.matrix.toString()) // Output: [24 0.004999999888241291,0,0,0,0,0.004999999888241291,0,0,0,0,-0.0020002000965178013,0,0,0,-1.0002000331878662,1]
 * applyMatrix(
 * orthoMatrix.mat4[0], orthoMatrix.mat4[1], orthoMatrix.mat4[2], orthoMatrix.mat4[3],
 * orthoMatrix.mat4[4], orthoMatrix.mat4[5], orthoMatrix.mat4[6], orthoMatrix.mat4[7],
 * orthoMatrix.mat4[8], orthoMatrix.mat4[9], orthoMatrix.mat4[10], orthoMatrix.mat4[11],
 * orthoMatrix.mat4[12], orthoMatrix.mat4[13], orthoMatrix.mat4[14], orthoMatrix.mat4[15]
 * );
 * console.log(orthoMatrix.matrix.toString()) // Output: [31 0.004999999888241291,0,0,0,0,0.004999999888241291,0,0,0,0,-0.0020002000965178013,0,0,0,-1.0002000331878662,1]
 * }
 * </code></div>
 */
function ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix;

/**
 * Applies a matrix to a vector with x, y, z, w components and returns the result as an array.This method multiplies the current matrix by a 4D vector (x, y, z, w) and computes the resulting vector.
 * It is commonly used in 3D graphics for transformations such as translation, rotation, scaling, and perspective projection.The resulting vector is returned as an array of four numbers, representing the transformed x, y, z, and w components.
 *
 * @param The x component of the vector.
 * @param The y component of the vector.
 * @param The z component of the vector.
 * @param The w component of the vector.
 * @returns An array containing the transformed [x, y, z, w] components.
 * @example // Applying a matrix to a 4D vector
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * const result = matrix.multiplyVec4(1, 2, 3, 1); // Transform the vector [1, 2, 3, 1]
 * console.log(result); // Output: [1, 2, 3, 1] (unchanged for identity matrix)
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Apply the matrix to a 4D vector
 * const result = matrix.multiplyVec4(1, 2, 3, 1);
 * console.log("Transformed Vector:", result); // Output: [1, 2, 3, 1]
 * 
 * // Modify the matrix (e.g., apply a translation)
 * matrix.translate([5, 5, 5]);
 * console.log("Modified Matrix:", matrix.matrix);
 * 
 * // Apply the modified matrix to the same vector
 * const transformedResult = matrix.multiplyVec4(1, 2, 3, 1);
 * console.log("Transformed Vector after Translation:", transformedResult); // Output: [6, 7, 8, 1]
 * }
 * </code></div>
 */
function multiplyVec4(x: number, y: number, z: number, w: number): number[];

/**
 * Applies a matrix to a vector. The fourth component is set to 1.
 * Returns a vector consisting of the first
 * through third components of the result.This method multiplies the current matrix by a 4D vector (x, y, z, 1),
 * effectively transforming the vector using the matrix. The resulting
 * vector is returned as a new `p5.Vector` instance.This is useful for applying transformations such as translation,
 * rotation, scaling, or perspective projection to a point in 3D space.
 *
 * @param The input vector to transform. It should
 * have x, y, and z components.
 * @return A new `p5.Vector` instance representing the transformed point.
 * @example // Applying a matrix to a 3D point
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * const point = new p5.Vector(1, 2, 3); // Define a 3D point
 * const transformedPoint = matrix.multiplyPoint(point);
 * console.log(transformedPoint.toString()); // Output: [1, 2, 3] (unchanged for identity matrix)
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Define a 3D point
 * const point = new p5.Vector(1, 2, 3);
 * console.log("Original Point:", point.toString());
 * 
 * // Apply the matrix to the point
 * const transformedPoint = matrix.multiplyPoint(point);
 * console.log("Transformed Point:", transformedPoint.toString());
 * 
 * // Modify the matrix (e.g., apply a translation)
 * matrix.translate([5, 5, 5]);
 * console.log("Modified Matrix:", matrix.matrix);
 * 
 * // Apply the modified matrix to the same point
 * const translatedPoint = matrix.multiplyPoint(point);
 * console.log("Translated Point:", translatedPoint.toString()); // Output: [6, 7, 8]
 * }
 * </code></div>
 */
function multiplyPoint(vector: p5.Vector): p5.Vector;

/**
 * Applies a matrix to a vector.
 * The fourth component is set to 1.
 * Returns the result of dividing the 1st to 3rd components
 * of the result by the 4th component as a vector.This method multiplies the current matrix by a 4D vector (x, y, z, 1),
 * effectively transforming the vector using the matrix. The resulting
 * vector is normalized by dividing its x, y, and z components by the w component.
 * This is useful for applying transformations such as perspective projection
 * to a point in 3D space.
 *
 * @param The input vector to transform. It should
 * have x, y, and z components.
 * @return A new `p5.Vector` instance representing the transformed and normalized point.
 * @example // Applying a matrix to a 3D point and normalizing it
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * const point = new p5.Vector(1, 2, 3); // Define a 3D point
 * const transformedPoint = matrix.multiplyAndNormalizePoint(point);
 * console.log(transformedPoint.toString()); // Output: [1, 2, 3] (unchanged for identity matrix)
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Define a 3D point
 * const point = new p5.Vector(1, 2, 3);
 * console.log("Original Point:", point.toString());
 * 
 * // Apply the matrix to the point and normalize it
 * const transformedPoint = matrix.multiplyAndNormalizePoint(point);
 * console.log("Transformed and Normalized Point:", transformedPoint.toString());
 * 
 * // Modify the matrix (e.g., apply a perspective transformation)
 * matrix.perspective(Math.PI / 4, 1.5, 0.1, 100);
 * console.log("Modified Matrix (Perspective):", matrix.matrix);
 * 
 * // Apply the modified matrix to the same point
 * const perspectivePoint = matrix.multiplyAndNormalizePoint(point);
 * console.log("Point after Perspective Transformation:", perspectivePoint.toString());
 * }
 * </code></div>
 */
function multiplyAndNormalizePoint(vector: p5.Vector): p5.Vector;

/**
 * Applies a matrix to a vector.
 * The fourth component is set to 0.
 * Returns a vector consisting of the first
 * through third components of the result.This method multiplies the current matrix by a 4D vector (x, y, z, 0),
 * effectively transforming the direction vector using the matrix. The resulting
 * vector is returned as a new `p5.Vector` instance. This is particularly useful
 * for transforming direction vectors (e.g., normals) without applying translation.
 *
 * @param The input vector to transform. It should
 * have x, y, and z components.
 * @return A new `p5.Vector` instance representing the transformed direction.
 * @example // Applying a matrix to a direction vector
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * const direction = new p5.Vector(1, 0, 0); // Define a direction vector
 * const transformedDirection = matrix.multiplyDirection(direction);
 * console.log(transformedDirection.toString()); // Output: [1, 0, 0] (unchanged for identity matrix)
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * const matrix = new p5.Matrix(4); // Create a 4x4 identity matrix
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Define a direction vector
 * const direction = new p5.Vector(1, 0, 0);
 * console.log("Original Direction:", direction.toString());
 * 
 * // Apply the matrix to the direction vector
 * const transformedDirection = matrix.multiplyDirection(direction);
 * console.log("Transformed Direction:", transformedDirection.toString());
 * 
 * // Modify the matrix (e.g., apply a rotation)
 * matrix.rotateY(Math.PI / 4); // Rotate 45 degrees around the Y-axis
 * console.log("Modified Matrix (Rotation):", matrix.matrix);
 * 
 * // Apply the modified matrix to the same direction vector
 * const rotatedDirection = matrix.multiplyDirection(direction);
 * console.log("Rotated Direction:", rotatedDirection.toString()); // Output: Rotated vector
 * }
 * </code></div>
 */
function multiplyDirection(vector: p5.Vector): p5.Vector;

/**
 * Takes a vector and returns the vector resulting from multiplying. This function is only for 3x3 matrices.
 * that vector by this matrix from the left.This method applies the current 3x3 matrix to a given vector, effectively
 * transforming the vector using the matrix. The resulting vector is returned
 * as a new vector or stored in the provided target vector.This is useful for operations such as transforming points or directions
 * in 2D or 3D space using a 3x3 transformation matrix.
 *
 * @param The vector to which this matrix applies.
 * @param The vector to receive the result. If not provided,
 * a copy of the input vector will be created and returned.
 * @return The transformed vector after applying the matrix.
 * @example // Multiplying a 3x3 matrix with a vector
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const vector = new p5.Vector(1, 2, 3);
 * const result = matrix.multiplyVec3(vector);
 * console.log(result.toString()); // Output: Transformed vector
 * 
 * // p5.js script example
 * <div class="norender"><code>
 * function setup() {
 * 
 * // Create a 3x3 matrix
 * const matrix = new p5.Matrix([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * console.log("Original Matrix:", matrix.matrix);
 * 
 * // Define a vector
 * const vector = new p5.Vector(1, 2, 3);
 * console.log("Original Vector:", vector.toString()); // Output: [1, 2, 3]
 * 
 * // Apply the matrix to the vector
 * const transformedVector = matrix.multiplyVec3(vector);
 * console.log("Transformed Vector:", transformedVector.toString()); // Output: [30, 36, 42]
 * 
 * // Modify the matrix (e.g., apply a scaling transformation)
 * matrix.scale(2, 2, 2);
 * console.log("Modified Matrix (Scaling):", matrix.matrix); // Output: [2, 4, 6, 8, 10, 12, 14, 16, 18]
 * 
 * // Apply the modified matrix to the same vector
 * const scaledVector = matrix.multiplyVec3(vector);
 * console.log("Scaled Vector:", scaledVector.toString()); // Output: [60, 72, 84]
 * }
 * </code></div>
 */
function multiplyVec3(multVector: p5.Vector, target?: p5.Vector): p5.Vector;

}

export default function Matrix(p5: any, fn: any): void;
