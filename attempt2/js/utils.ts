// TypeScript version of utils.js
export const ident: [number, number, number, number, number, number] = [1,0,0,0,1,0];

export interface Point { x: number; y: number; }

export function pt(x: number, y: number): Point {
    return { x, y };
}

export function inv(T: number[]): number[] {
    const det = T[0]*T[4] - T[1]*T[3];
    return [T[4]/det, -T[1]/det, (T[1]*T[5]-T[2]*T[4])/det,
        -T[3]/det, T[0]/det, (T[2]*T[3]-T[0]*T[5])/det];
}

export function mul(A: number[], B: number[]): number[] {
    return [A[0]*B[0] + A[1]*B[3], 
        A[0]*B[1] + A[1]*B[4],
        A[0]*B[2] + A[1]*B[5] + A[2],
        A[3]*B[0] + A[4]*B[3], 
        A[3]*B[1] + A[4]*B[4],
        A[3]*B[2] + A[4]*B[5] + A[5]];
}

export function padd(p: Point, q: Point): Point {
    return { x: p.x + q.x, y: p.y + q.y };
}

export function psub(p: Point, q: Point): Point {
    return { x: p.x - q.x, y: p.y - q.y };
}

export function pframe(o: Point, p: Point, q: Point, a: number, b: number): Point {
    return { x: o.x + a*p.x + b*q.x, y: o.y + a*p.y + b*q.y };
}

export function trot(ang: number): number[] {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    return [c, -s, 0, s, c, 0];
}

export function ttrans(tx: number, ty: number): number[] {
    return [1, 0, tx, 0, 1, ty];
}

export function transTo(p: Point, q: Point): number[] {
    return ttrans(q.x - p.x, q.y - p.y);
}

export function rotAbout(p: Point, ang: number): number[] {
    return mul(ttrans(p.x, p.y), mul(trot(ang), ttrans(-p.x, -p.y)));
}

export function transPt(M: number[], P: Point): Point {
    return pt(M[0]*P.x + M[1]*P.y + M[2], M[3]*P.x + M[4]*P.y + M[5]);
}

export function matchSeg(p: Point, q: Point): number[] {
    return [q.x-p.x, p.y-q.y, p.x,  q.y-p.y, q.x-p.x, p.y];
}

export function matchTwo(p1: Point, q1: Point, p2: Point, q2: Point): number[] {
    return mul(matchSeg(p2, q2), inv(matchSeg(p1, q1)));
}
