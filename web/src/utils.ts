import * as p5 from 'p5';

// This needs to be available for the functions
declare let p: p5;

export const ident = [1,0,0,0,1,0];

export function pt( x: number, y: number )
{
	return p.createVector( x, y );
}

// Affine matrix inverse
export function inv( T: number[] ) {
	const det = T[0]*T[4] - T[1]*T[3];
	return [T[4]/det, -T[1]/det, (T[1]*T[5]-T[2]*T[4])/det,
		-T[3]/det, T[0]/det, (T[2]*T[3]-T[0]*T[5])/det];
};

// Affine matrix multiply
export function mul( A: number[], B: number[] )
{
	return [A[0]*B[0] + A[1]*B[3], 
		A[0]*B[1] + A[1]*B[4],
		A[0]*B[2] + A[1]*B[5] + A[2],

		A[3]*B[0] + A[4]*B[3], 
		A[3]*B[1] + A[4]*B[4],
		A[3]*B[2] + A[4]*B[5] + A[5]];
}

// Rotation matrix
export function trot( ang: number )
{
	const c = p.cos( ang );
	const s = p.sin( ang );
	return [c, -s, 0, s, c, 0];
}

// Translation matrix
export function ttrans( tx: number, ty: number )
{
	return [1, 0, tx, 0, 1, ty];
}

// Matrix * point
export function transPt( M: number[], P: p5.Vector )
{
	return pt(M[0]*P.x + M[1]*P.y + M[2], M[3]*P.x + M[4]*P.y + M[5]);
}
