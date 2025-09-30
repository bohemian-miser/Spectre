// Export buildSpectreBase for app.ts
export function buildSpectreBase(curved: boolean = false): {[label: string]: Shape|Meta} {
    // For now, use buildHatTurtleBase as a placeholder for migration completeness
    return buildHatTurtleBase(curved);
}
// TypeScript version of tiles.js
import { pt, psub, pframe, transPt, mul, ident, ttrans, trot, transTo } from './utils';

export interface ShapeLike {
    pts: Array<{x:number, y:number}>;
    quad: Array<{x:number, y:number}>;
    label: string;
    origPts?: Array<{x:number, y:number}>;
}


export function drawEdgeLabels(
    ctx: any,
    pts: Array<{x:number, y:number}>,
    labels: string[],
    S: number[],
    opts: { fontPx?: number, insetPx?: number, useP5?: boolean, p5?: any } = {}
) {
    if (!labels || labels.length === 0) return;
    const {
        fontPx = 32, // larger font for visibility
        insetPx = 0,
        useP5 = true,
        p5 = null
    } = opts;
    let sx=0, sy=0;
    for(const p of pts){ sx+=p.x; sy+=p.y; }
    const centroid = { x: sx/pts.length, y: sy/pts.length };
    for( let i = 0; i < pts.length; ++i ) {
        const a = pts[i];
        const b = pts[(i+1) % pts.length];
        const ma = transPt( S, pt( (a.x + b.x)/2, (a.y + b.y)/2 ) );
        const c_world = transPt( S, centroid );
        const a_world = transPt( S, a );
        const b_world = transPt( S, b );
        const ex = b_world.x - a_world.x;
        const ey = b_world.y - a_world.y;
        let nx_e = -ey;
        let ny_e = ex;
        const dot = nx_e * (c_world.x - ma.x) + ny_e * (c_world.y - ma.y);
        if (dot < 0) { nx_e = -nx_e; ny_e = -ny_e; }
        const nmag = Math.sqrt(nx_e*nx_e + ny_e*ny_e) || 1;
        const ox = (nx_e / nmag) * insetPx;
        const oy = (ny_e / nmag) * insetPx;
        const px = ma.x + ox;
        const py = ma.y + oy;
        const lab = labels[i] || '';
        const lead = lab && lab.length ? lab.charAt(0) : '';
        const leadColors: {[k:string]:[number,number,number]} = {
            '-': [180, 30, 30],
            '0': [31,119,180],
            '1': [255,127,14],
            '2': [44,160,44],
            '3': [214,39,40],
            '4': [148,103,189],
            '5': [140,86,75],
            '7': [127,127,127],
            '8': [188,189,34],
            '9': [23,190,207]
        };
        const ec = leadColors.hasOwnProperty(lead) ? leadColors[lead] : [0,0,0];
        if (useP5 && p5) {
            p5.push();
            p5.fill(ec[0], ec[1], ec[2]);
            p5.stroke(0);
            p5.strokeWeight(1);
            p5.translate(px, py);
            p5.textAlign(p5.CENTER, p5.CENTER);
            p5.textSize(fontPx);
            p5.text(lab, 0, 0);
            p5.pop();
        } else if (ctx) {
            ctx.save();
            ctx.translate(px, py);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `${fontPx}px sans-serif`;
            ctx.strokeStyle = 'black';
            ctx.fillStyle = `rgb(${ec[0]},${ec[1]},${ec[2]})`;
            ctx.strokeText(lab, 0, 0);
            ctx.fillText(lab, 0, 0);
            ctx.restore();
        }
    }
}

// Migrate Shape, CurvyShape, Meta, and build* functions with types
export class Shape {
    pts: Array<{x:number, y:number}>;
    quad: Array<{x:number, y:number}>;
    label: string;
    origPts?: Array<{x:number, y:number}>;
    constructor(pts: Array<{x:number, y:number}>, quad: Array<{x:number, y:number}>, label: string) {
        this.pts = pts;
        this.quad = quad;
        this.label = label;
    }
    _drawEdgeLabels(S: number[], opts: { showEdgeLabels: boolean, unique_edge_labels: any, p5?: any }) {
        if (!opts.showEdgeLabels) return;
        const labels = opts.unique_edge_labels[this.label];
        if (!labels || labels.length === 0) return;
        const basePts = (this.origPts && this.origPts.length) ? this.origPts : this.pts;
        drawEdgeLabels(opts.p5, basePts, labels, S, { fontPx: 20, insetPx: 0, useP5: true, p5: opts.p5 });
    }
    draw(S: number[], context: {
        drawPolygon: Function,
        colmap: any,
        overlays: any,
        p5: any,
        showEdgeLabels: boolean,
        unique_edge_labels: any
    }) {
        context.drawPolygon(this.pts, S, context.colmap[this.label], [0,0,0], 0.1);
        if (context.overlays && context.overlays[this.label]) {
            context.p5.stroke(0);
            context.p5.strokeWeight(0.1);
            context.p5.noFill();
            for (let st of context.overlays[this.label]) {
                context.p5.beginShape();
                for (let i = 0; i < st.length; ++i) {
                    const p = transPt(S, st[i]);
                    context.p5.vertex(p.x, p.y);
                }
                context.p5.endShape();
            }
        }
        this._drawEdgeLabels(S, {
            showEdgeLabels: context.showEdgeLabels,
            unique_edge_labels: context.unique_edge_labels,
            p5: context.p5
        });
    }
    streamSVG(S: number[], stream: string[], colmap: any) {
        var s = '<polygon points="';
        var at_start = true;
        for (let p of this.pts) {
            const sp = transPt(S, p);
            if (at_start) {
                at_start = false;
            } else {
                s = s + ' ';
            }
            s = s + `${sp.x},${sp.y}`;
        }
        const col = colmap[this.label];
        s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
        stream.push(s);
    }
}

export class CurvyShape {
    quad: Array<{x:number, y:number}>;
    label: string;
    origPts: Array<{x:number, y:number}>;
    pts: Array<{x:number, y:number}>;
    constructor(pts: Array<{x:number, y:number}>, quad: Array<{x:number, y:number}>, label: string) {
        this.quad = quad;
        this.label = label;
        this.origPts = pts.slice();
        let blah = true;
        this.pts = [pts[pts.length-1]];
        for (const p of pts) {
            const prev = this.pts[this.pts.length-1];
            const v = psub(p, prev);
            const w = pt(-v.y, v.x);
            if (blah) {
                this.pts.push(pframe(prev, v, w, 0.33, 0.6));
                this.pts.push(pframe(prev, v, w, 0.67, 0.6));
            } else {
                this.pts.push(pframe(prev, v, w, 0.33, -0.6));
                this.pts.push(pframe(prev, v, w, 0.67, -0.6));
            }
            blah = !blah;
            this.pts.push(p);
        }
    }
    draw(S: number[], context: {
        p5: any,
        colmap: any,
        overlays: any,
        drawPolygon: Function
    }) {
        context.p5.fill(...context.colmap[this.label]);
        context.p5.strokeWeight(0.1);
        context.p5.stroke(0);
        context.p5.beginShape();
        const tp = transPt(S, this.pts[0]);
        context.p5.vertex(tp.x, tp.y);
        for (let idx = 1; idx < this.pts.length; idx += 3) {
            const a = transPt(S, this.pts[idx]);
            const b = transPt(S, this.pts[idx+1]);
            const c = transPt(S, this.pts[idx+2]);
            context.p5.bezierVertex(a.x, a.y, b.x, b.y, c.x, c.y);
        }
        context.p5.endShape(context.p5.CLOSE);
        if (context.overlays && context.overlays[this.label]) {
            context.p5.stroke(0);
            context.p5.strokeWeight(0.1);
            context.p5.noFill();
            for (let st of context.overlays[this.label]) {
                context.p5.beginShape();
                for (let i = 0; i < st.length; ++i) {
                    const p = transPt(S, st[i]);
                    context.p5.vertex(p.x, p.y);
                }
                context.p5.endShape();
            }
        }
    }
    streamSVG(S: number[], stream: string[], colmap: any) {
        const tp = transPt(S, this.pts[0]);
        var s = `<path d="M ${tp.x} ${tp.y}`;
        for (let idx = 1; idx < this.pts.length; idx += 3) {
            const a = transPt(S, this.pts[idx]);
            const b = transPt(S, this.pts[idx+1]);
            const c = transPt(S, this.pts[idx+2]);
            s = s + ` C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`;
        }
        const col = colmap[this.label];
        s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
        stream.push(s);
    }
}

export class Meta {
    geoms: Array<{geom: Shape|CurvyShape|Meta, xform: number[]}>;
    quad: Array<{x:number, y:number}>;
    constructor() {
        this.geoms = [];
        this.quad = [];
    }
    addChild(g: Shape|CurvyShape|Meta, T: number[]) {
        this.geoms.push({ geom: g, xform: T });
    }
    draw(S: number[], context: {
        drawPolygon: Function,
        colmap: any,
        overlays: any,
        p5: any,
        showEdgeLabels: boolean,
        unique_edge_labels: any
    }) {
        for (let g of this.geoms) {
            g.geom.draw(mul(S, g.xform), context);
        }
        if (context.overlays && context.overlays['Gamma']) {
            context.p5.stroke(0);
            context.p5.strokeWeight(0.1);
            context.p5.noFill();
            for (let st of context.overlays['Gamma']) {
                context.p5.beginShape();
                for (let i = 0; i < st.length; ++i) {
                    const p = transPt(S, st[i]);
                    context.p5.vertex(p.x, p.y);
                }
                context.p5.endShape();
            }
        }
        for (let g of this.geoms) {
            if (g.geom && typeof (g.geom as any)._drawEdgeLabels === 'function') {
                (g.geom as any)._drawEdgeLabels(mul(S, g.xform), {
                    showEdgeLabels: context.showEdgeLabels,
                    unique_edge_labels: context.unique_edge_labels,
                    p5: context.p5
                });
            }
        }
    }
    streamSVG(S: number[], stream: string[], colmap: any) {
        for (let g of this.geoms) {
            g.geom.streamSVG(mul(S, g.xform), stream, colmap);
        }
    }
}

// Migrate buildSpectreBase, buildHatTurtleBase, buildHexBase, buildSupertiles with types
// ...existing code...
export function buildHatTurtleBase(hat_dominant: boolean): {[label: string]: Shape|Meta} {
    const r3 = 1.7320508075688772;
    const hr3 = 0.8660254037844386;
    function hexPt(x: number, y: number) {
        return pt(x + 0.5*y, -hr3*y);
    }
    const hat = [
        hexPt(-1, 2), hexPt(0, 2), hexPt(0, 3), hexPt(2, 2), hexPt(3, 0),
        hexPt(4, 0), hexPt(5,-1), hexPt(4,-2), hexPt(2,-1), hexPt(2,-2),
        hexPt(1, -2), hexPt(0,-2), hexPt(-1,-1), hexPt(0, 0)
    ];
    const turtle = [
        hexPt(0,0), hexPt(2,-1), hexPt(3,0), hexPt(4,-1), hexPt(4,-2),
        hexPt(6,-3), hexPt(7,-5), hexPt(6,-5), hexPt(5,-4), hexPt(4,-5),
        hexPt(2,-4), hexPt(0,-3), hexPt(-1,-1), hexPt(0,-1)
    ];
    const hat_keys = [hat[3], hat[5], hat[7], hat[11]];
    const turtle_keys = [turtle[3], turtle[5], turtle[7], turtle[11]];
    const ret: {[label: string]: Shape|Meta} = {};
    if (hat_dominant) {
        for (const lab of ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            ret[lab] = new Shape(hat, hat_keys, lab);
        }
        const mystic = new Meta();
        mystic.addChild(new Shape(hat, hat_keys, 'Gamma1'), ident);
        mystic.addChild(new Shape(turtle, turtle_keys, 'Gamma2'), ttrans(hat[8].x, hat[8].y));
        mystic.quad = hat_keys;
        ret['Gamma'] = mystic;
    } else {
        for (const lab of ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            ret[lab] = new Shape(turtle, turtle_keys, lab);
        }
        const mystic = new Meta();
        mystic.addChild(new Shape(turtle, turtle_keys, 'Gamma1'), ident);
        mystic.addChild(new Shape(hat, hat_keys, 'Gamma2'),
            mul(ttrans(turtle[9].x, turtle[9].y), trot(Math.PI/3)));
        mystic.quad = turtle_keys;
        ret['Gamma'] = mystic;
    }
    return ret;
}

export function buildHexBase(): {[label: string]: Shape} {
    const hr3 = 0.8660254037844386;
    const hex = [
        pt(0, 0), pt(1.0, 0.0), pt(1.5, hr3), pt(1, 2*hr3), pt(0, 2*hr3), pt(-0.5, hr3)
    ];
    const hex_keys = [hex[1], hex[2], hex[3], hex[5]];
    const ret: {[label: string]: Shape} = {};
    for (const lab of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
        ret[lab] = new Shape(hex, hex_keys, lab);
    }
    return ret;
}

export function buildSupertiles(sys: {[label: string]: Shape|Meta}): {[label: string]: Meta} {
    const quad = (sys['Delta'] as Shape).quad;
    const R = [-1,0,0,0,1,0];
    const t_rules: Array<[number, number, number]> = [
        [60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
        [0, 2, 0], [60, 3, 1], [-120, 3, 3]
    ];
    const Ts: number[][] = [ident];
    let total_ang = 0;
    let rot: number[] = ident;
    const tquad = [...quad];
    for (const [ang,from,to] of t_rules) {
        total_ang += ang;
        if (ang !== 0) {
            rot = trot(total_ang * Math.PI / 180);
            for (let i = 0; i < 4; ++i) {
                tquad[i] = transPt(rot, quad[i]);
            }
        }
        const ttt = transTo(tquad[to], transPt(Ts[Ts.length-1], quad[from]));
        Ts.push(mul(ttt, rot));
    }
    for (let idx = 0; idx < Ts.length; ++idx) {
        Ts[idx] = mul(R, Ts[idx]);
    }
    const super_rules: {[label: string]: string[]} = {
        'Gamma':  ['Pi','Delta','null','Theta','Sigma','Xi','Phi','Gamma'],
        'Delta':  ['Xi','Delta','Xi','Phi','Sigma','Pi','Phi','Gamma'],
        'Theta':  ['Psi','Delta','Pi','Phi','Sigma','Pi','Phi','Gamma'],
        'Lambda': ['Psi','Delta','Xi','Phi','Sigma','Pi','Phi','Gamma'],
        'Xi':     ['Psi','Delta','Pi','Phi','Sigma','Psi','Phi','Gamma'],
        'Pi':     ['Psi','Delta','Xi','Phi','Sigma','Psi','Phi','Gamma'],
        'Sigma':  ['Xi','Delta','Xi','Phi','Sigma','Pi','Lambda','Gamma'],
        'Phi':    ['Psi','Delta','Psi','Phi','Sigma','Pi','Phi','Gamma'],
        'Psi':    ['Psi','Delta','Psi','Phi','Sigma','Psi','Phi','Gamma']
    };
    const super_quad = [
        transPt(Ts[6], quad[2]),
        transPt(Ts[5], quad[1]),
        transPt(Ts[3], quad[2]),
        transPt(Ts[0], quad[1])
    ];
    const ret: {[label: string]: Meta} = {};
    for (const lab in super_rules) {
        const subs = super_rules[lab];
        const sup = new Meta();
        for (let idx = 0; idx < 8; ++idx) {
            if (subs[idx] === 'null') continue;
            sup.addChild(sys[subs[idx]], Ts[idx]);
        }
        sup.quad = super_quad;
        ret[lab] = sup;
    }
    return ret;
}

// ...convert Shape, CurvyShape, Meta, and build* functions to TypeScript...
