import p5 from 'p5';
import { state } from './state';
import { pt, transPt, mul } from "./utils";
import { findPerfectMatchings } from './analysis';

// These need to be available for the draw functions
declare let p: p5;
// declare let state.colmap: { [key: string]: number[] };
declare let overlays: { [key: string]: p5.Vector[][] };
declare let showEdgeLabels: boolean;
declare let showEdgeJoiner: boolean;
declare let showLines: boolean;
declare let showOutlines: boolean;
declare let showBackgrounds: boolean;

export const spectre_pts = [
    {x:0, y:0},
    {x:1.0, y:0.0},
    {x:1.5, y:-0.8660254037844386},
    {x:2.366025403784439, y:-0.36602540378443865},
    {x:2.366025403784439, y:0.6339745962155614},
    {x:3.366025403784439, y:0.6339745962155614},
    {x:3.866025403784439, y:1.5},
    {x:3.0, y:2.0},
    {x:2.133974596215561, y:1.5},
    {x:1.6339745962155614, y:2.3660254037844393},
    {x:0.6339745962155614, y:2.3660254037844393},
    {x:-0.3660254037844386, y:2.3660254037844393},
    {x:-0.866025403784439, y:1.5},
    {x:0.0, y:1.0}
];

export const unique_edge_labels: { [key: string]: string[] } = {
	'Delta':  ['3.0A','3.1A', '2.0A','2.1A','2.2A', '-5.1A','-5.0A', '1.0A','1.1A','1.2A', '-3.1A','-3.0A', '-6.1A','-6.0A'],
	'Theta':  ['3.0A','3.1A', '2.0A','2.1A','2.2A', '8.0A', '2.0B','2.1B','2.2B', '0.0A','0.1A', '-2.2A','-2.1A','-2.0A'],
	'Lambda': ['3.0A','3.1A', '2.0A','2.1A','2.2A', '-5.1A','-5.0A', '1.0A','1.1A','1.2A', '-8.0A', '-2.2A','-2.1A','-2.0A'],
	'Xi':     ['-1.2A','-1.1A','-1.0A', '5.0A','5.1A', '8.0A', '2.0A','2.1A','2.2A', '0.0A','0.1A', '-2.2A','-2.1A','-2.0A'],
	'Pi':     ['-1.2A','-1.1A','-1.0A', '5.0A','5.1A', '-5.1A','-5.0A', '1.0A','1.1A','1.2A', '-8.0A', '-2.2A','-2.1A','-2.0A'],
	'Sigma':  ['4.2A','4.3A', '2.0A','2.1A','2.2A', '-5.1A','-5.0A', '1.0A','1.1A','1.2A', '-3.1A','-3.0A', '4.0A','4.1A'],
	'Phi':    ['3.0A','3.1A', '2.0A','2.1A','2.2A', '-5.1A','-5.0A', '5.0A','5.1A', '0.0A','0.1A', '-2.2A','-2.1A','-2.0A'],
	'Psi':    ['-1.2A','-1.1A','-1.0A', '5.0A','5.1A', '-5.1A','-5.0A', '5.0B','5.1B', '0.0A','0.1A', '-2.2A','-2.1A','-2.0A'],
	'Gamma2': ['-7.1A','-7.0A', '-3.1A','-3.0A', '6.0A','6.1A', '-4.3A','-4.2A','-4.1A','-4.0A', '2.0A','2.1A', '-7.3A','-7.2A'],
	'Gamma1': ['-1.2A','-1.1A','-1.0A', '1.0A','1.1A','1.2A', '7.0A','7.1A','7.2A','7.3A', '2.2A', '-2.2A','-2.1A','-2.0A']
};

export const hex_edge_labels: { [key: string]: string[] } = {
    'Delta':  ['3.0A','2.0A', '-5.0A', '1.0A', '-3.0A','-6.0A'],
    'Theta':  ['3.0A','2.0A','8.0A', '2.0B', '0.0A', '-2.0A'],
    'Lambda': ['3.0A','2.0A','-5.0A','1.0A','-8.0A', '-2.0A'],
    'Xi':     ['-1.0A', '5.0A', '8.0A', '2.0A', '0.0A','-2.0A'],
    'Pi':     ['-1.0A', '5.0A','-5.0A', '1.0A', '-8.0A','-2.0A'],
    'Sigma':  ['6.0A', '2.0A','-5.0A','1.0A','-3.0A','4.0A'],
    'Phi':    ['3.0A','2.0A', '-5.0A','5.0A','0.0A','-2.0A'],
    'Psi':    ['-1.0A','5.0A','-5.0A','5.0B', '0.0A','-2.0A'],
    'Gamma':  ['-1.0A','1.0A','-3.0A', '-4.0A','2.0A','-2.0A'],
};

function getEdgeLabelsForShape(tileLabel: string): readonly string[] {
    const labels = state.shape === 'Hexagons' ? hex_edge_labels : unique_edge_labels;
    return labels[tileLabel] || [];
}

export function getEdgeMidpoints(tileLabel: string, selectedEdges: Set<number>): p5.Vector[] {
    const midpoints: p5.Vector[] = [];
    const labels = getEdgeLabelsForShape(tileLabel);
    if (!labels || labels.length === 0) return midpoints;

    const shape = new Shape([], [], tileLabel); // A bit of a hack to get access to the pts
    const basePts = (shape.origPts && shape.origPts.length) ? shape.origPts : shape.pts;

    for (let i = 0; i < basePts.length; ++i) {
        const lab = labels[i] || '';
        const major = parseInt(lab.replace('-', '').charAt(0));
        if (selectedEdges.has(major)) {
            const a = basePts[i];
            const b = basePts[(i + 1) % basePts.length];
            midpoints.push(p.createVector((a.x + b.x) / 2, (a.y + b.y) / 2));
        }
    }
    return midpoints;
}

export function getEdgeDotMidpoints(tileLabel: string, selectedEdges: Set<number>): p5.Vector[] {
    const points: p5.Vector[] = [];
    const labels = getEdgeLabelsForShape(tileLabel);
    if (!labels || labels.length === 0) return points;

    const p = (window as any).p as p5;
    const spectreVectors = spectre_pts.map(pt => p.createVector(pt.x, pt.y));
    const shape = new Shape(spectreVectors, [], tileLabel); // A bit of a hack to get access to the pts
    const basePts = (shape.origPts && shape.origPts.length) ? shape.origPts : shape.pts;

    for (let i = 0; i < labels.length; i++) {
        const lab = labels[i] || '';
        const major = parseInt(lab.replace('-', '').charAt(0));
        const sub = parseInt(lab.replace('-', '').substring(2, 3));

        if (selectedEdges.has(major)) {
            if (major === 0) {
                if (sub === 0) {
                    // Special case for major edge 0: find vertex between 0.0 and 0.1
                    // The vertex is the one at the end of the 0.0 edge.
                    points.push(basePts[(i + 1) % basePts.length]);
                }
            } else {
                if (sub === 0) {
                    // Standard case: find midpoint of the .0 edge
                    const a = basePts[i];
                    const b = basePts[(i + 1) % basePts.length];
                    points.push(p.createVector((a.x + b.x) / 2, (a.y + b.y) / 2));
                }
            }
        }
    }
    return points;
}

function drawPolygon( shape: p5.Vector[], T: number[], f: number[] | null, s: number[] | null, w: number )
{
	if( f != null && (window as any).showBackgrounds ) {
		p.fill( f[0], f[1], f[2] );
	} else {
		p.noFill();
	}
	if( s != null && (window as any).showOutlines ) {
		p.stroke( 0 );
		p.strokeWeight( w ) ; // / lw_scale );
	} else {
		p.noStroke();
	}
	p.beginShape();
	for( let v of shape ) {
		const tp = transPt( T, v );
		p.vertex( tp.x, tp.y );
	}
	p.endShape( p.CLOSE );
}

export class Shape
{
	pts: p5.Vector[];
	quad: p5.Vector[];
	label: string;
    origPts: p5.Vector[];

	constructor( pts: p5.Vector[], quad: p5.Vector[], label: string )
	{
		this.pts = pts;
		this.quad = quad;
		this.label = label;
        this.origPts = [];
	}

	_drawEdgeLabels( S: number[] ) {
		if( (state.selectedMajorEdges.size === 0 && state.selectedJoinerEdges.size === 0) ) return;
		const labels = getEdgeLabelsForShape(this.label);
		if( !labels || labels.length === 0 ) return;
		// draw labels at midpoints of consecutive pts
		p.textAlign(p.CENTER, p.CENTER);
		p.fill(0x9f);
		p.noStroke();
		// use original vertex list if available (CurvyShape stores `origPts`)
		const basePts = (this.origPts && this.origPts.length) ? this.origPts : this.pts;
		for( let i = 0; i < basePts.length; ++i ) {
			const lab = labels[i] || '';
            const major = parseInt(lab.replace('-', '').charAt(0));
            const sub = parseInt(lab.replace('-', '').substring(2,3));

			if (state.selectedJoinerEdges.has(major) && sub === 0) {
                const a = basePts[i];
                const b = basePts[(i+1) % basePts.length];
                const ma = transPt( S, pt( (a.x + b.x)/2, (a.y + b.y)/2 ) );
                const lead = lab && lab.length ? lab.charAt(0) : '';
                const leadColors: {[key: string]: number[]} = {
                    '-': [218, 143, 143],
                    '0': [143, 187, 218],
                    '1': [255, 191, 135],
                    '2': [150, 208, 150],
                    '3': [235, 147, 148],
                    '4': [202, 179, 222],
                    '5': [198, 171, 165],
                    '6': [241, 187, 225],
                    '7': [191, 191, 191],
                    '8': [222, 222, 145],
                    '9': [139, 223, 231]
                };
                const ec = leadColors.hasOwnProperty(lead) ? leadColors[lead] : [0,0,0];
                p.fill(ec[0], ec[1], ec[2]);
                p.stroke(0);
                // p.strokeWeight(1);
                p.push();
                p.translate(ma.x, ma.y);
                p.ellipse(0, 0, .3, .3);
                p.pop();
			}
			if (state.selectedMajorEdges.has(major)) {

				const a = basePts[i];
				const b = basePts[(i + 1) % basePts.length];
				const ma = transPt(S, pt((a.x + b.x) / 2, (a.y + b.y) / 2));
				// compute perpendicular inward offset along the edge normal (screen space)
				const centroid = (() => {
					let sx = 0, sy = 0; for (const pt of basePts) { sx += pt.x; sy += pt.y; } return pt(sx / basePts.length, sy / basePts.length);
				})();
				const c_world = transPt(S, centroid);
				const a_world = transPt(S, a);
				const b_world = transPt(S, b);
				const ex = b_world.x - a_world.x;
				const ey = b_world.y - a_world.y;
				// perpendicular (edge normal)
				let nx_e = -ey;
				let ny_e = ex;
				// ensure normal points inward toward centroid (ma -> centroid)
				const dot = nx_e * (c_world.x - ma.x) + ny_e * (c_world.y - ma.y);
				if (dot < 0) { nx_e = -nx_e; ny_e = -ny_e; }
				const nmag = Math.sqrt(nx_e * nx_e + ny_e * ny_e) || 1;
				const DESIRED_INSET_PX = 0;
				const inset = DESIRED_INSET_PX;
				const ox = (nx_e / nmag) * inset;
				const oy = (ny_e / nmag) * inset;
				const px = ma.x + ox;
				const py = ma.y + oy;
			
				// set text size in screen pixels (fixed)
				const DESIRED_LABEL_PX = 2;
				const ts = DESIRED_LABEL_PX;
            
				// map leading character to a color for the major edge
				const lead = lab && lab.length ? lab.charAt(0) : '';
				const leadColors: { [key: string]: number[] } = {
                    '-': [218, 143, 143],
                    '0': [143, 187, 218],
                    '1': [255, 191, 135],
                    '2': [150, 208, 150],
                    '3': [235, 147, 148],
                    '4': [202, 179, 222],
                    '5': [198, 171, 165],
                    '6': [241, 187, 225],
                    '7': [191, 191, 191],
                    '8': [222, 222, 145],
                    '9': [139, 223, 231]
				};
				const ec = leadColors.hasOwnProperty(lead) ? leadColors[lead] : [0, 0, 0];
				p.fill(ec[0], ec[1], ec[2]);
				p.push();
				p.stroke(0);
				p.strokeWeight(1);
				p.translate(px, py);
				p.scale(0.1);
				p.scale(1, -1);
				p.textSize(ts);
				p.text(lab, 0, 0);
				p.pop();
			}
		}
	}

	draw( S: number[], ppos = 0 )
	{
		drawPolygon( this.pts, S, state.colmap[this.label], [0,0,0], 0.1 );
        if (state.showIds) {
            p.push();
            p.fill(0);
            p.stroke(0);
            p.textAlign(p.CENTER, p.CENTER);
            const centroid = this.pts.reduce((acc, pt) => acc.add(pt), p.createVector(0, 0)).div(this.pts.length);
            const tc = transPt(S, centroid);
            p.translate(tc.x, tc.y);
            p.scale(0.1, -0.1);
            p.text(ppos, 0, 0);
            p.pop();
        }
		if( typeof overlays !== 'undefined' && overlays[this.label] && (window as any).showLines ) {
			p.stroke(0);
			p.strokeWeight( 0.1 );
			p.noFill();
			for( let st of overlays[this.label] ) {
				p.beginShape();
				for( let i = 0; i < st.length; ++i ) {
					const pt = transPt( S, st[i] );
					p.vertex( pt.x, pt.y );
				}
				p.endShape();
			}
		}

		// draw edge labels if requested
		if( typeof this._drawEdgeLabels === 'function' ) this._drawEdgeLabels( S );

        // draw selected joiner edges
        if (state.selectedJoinerEdges.size > 0) {
            const midpoints = getEdgeDotMidpoints(this.label, state.selectedJoinerEdges);
            if (midpoints.length > 1) {
                const matchings = findPerfectMatchings(midpoints.map(m => ({x: m.x, y: m.y})));
                const slider = document.getElementById(`slider-${this.label}`) as HTMLInputElement;
                if (slider) {
                    const index = parseInt(slider.value, 10);
                    if (matchings[index]) {
                        const matching = matchings[index];
                        p.strokeWeight(0.1);
                        for (const pair of matching) {
                            const a = transPt(S, p.createVector(pair[0].x, pair[0].y));
                            const b = transPt(S, p.createVector(pair[1].x, pair[1].y));
                            const edgeKey = edgeToKey([[a.x, a.y], [b.x, b.y]]);
                            const color = (window as any).circuitColorMap.get(edgeKey) || '#808080';
                            p.stroke(color);
                            p.line(a.x, a.y, b.x, b.y);
                        }
                    }
                }
            }
        }
	}

	streamSVG( S: number[], stream: string[] )
	{
		var s = '<polygon points="';
		var at_start = true;
		for( let pt of this.pts ) {
			const sp = transPt( S, pt );
			if( at_start ) {
				at_start = false;
			} else {
				s = s + ' ';
			}
			s = s + `${sp.x},${sp.y}`;
		}
		const col = state.colmap[this.label];

		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
		stream.push( s );
	}
}

export class CurvyShape extends Shape
{
	constructor( pts: p5.Vector[], quad: p5.Vector[], label: string )
	{
        super(pts, quad, label)
		this.quad = quad;
		this.label = label;
		// preserve original vertex list (useful for label placement on curved shapes)
		this.origPts = pts.slice();

		let blah = true;

		this.pts = [pts[pts.length-1]];
		for( const pt of pts ) {
			const prev = this.pts[this.pts.length-1];
			const v = p.createVector(pt.x - prev.x, pt.y - prev.y);
			const w = p.createVector( -v.y, v.x );
			if( blah ) {
				this.pts.push(p.createVector(prev.x + 0.33 * v.x + 0.6 * w.x, prev.y + 0.33 * v.y + 0.6 * w.y));
				this.pts.push(p.createVector(prev.x + 0.67 * v.x + 0.6 * w.x, prev.y + 0.67 * v.y + 0.6 * w.y));
			} else {
                this.pts.push(p.createVector(prev.x + 0.33 * v.x - 0.6 * w.x, prev.y + 0.33 * v.y - 0.6 * w.y));
                this.pts.push(p.createVector(prev.x + 0.67 * v.x - 0.6 * w.x, prev.y + 0.67 * v.y - 0.6 * w.y));
			}
			blah = !blah;
			this.pts.push( pt );
		}
	}

	draw( S: number[] )
	{
		p.fill( state.colmap[this.label][0], state.colmap[this.label][1], state.colmap[this.label][2] );
		p.strokeWeight( 0.1 );
		p.stroke( 0 );

		p.beginShape();
		const tp = transPt( S, this.pts[0] );
		p.vertex( tp.x, tp.y );

		for( let idx = 1; idx < this.pts.length; idx += 3 ) {
			const a = transPt( S, this.pts[idx] );
			const b = transPt( S, this.pts[idx+1] );
			const c = transPt( S, this.pts[idx+2] );

			p.bezierVertex( a.x, a.y, b.x, b.y, c.x, c.y );
		}
		p.endShape( p.CLOSE );
		if( typeof overlays !== 'undefined' && overlays[this.label] ) {
			p.stroke(0);
			p.strokeWeight( 0.1 );
			p.noFill();
			for( let st of overlays[this.label] ) {
				p.beginShape();
				for( let i = 0; i < st.length; ++i ) {
					const pt = transPt( S, st[i] );
					p.vertex( pt.x, pt.y );
				}
				p.endShape();
			}
		}
	}

	streamSVG( S: number[], stream: string[] )
	{
		const tp = transPt( S, this.pts[0] );

		var s = `<path d="M ${tp.x} ${tp.y}`;
		
		for( let idx = 1; idx < this.pts.length; idx += 3 ) {
			const a = transPt( S, this.pts[idx] );
			const b = transPt( S, this.pts[idx+1] );
			const c = transPt( S, this.pts[idx+2] );

			s = s + ` C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`;	
		}
		const col = state.colmap[this.label];

		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
		stream.push( s );
	}
}

export class Meta
{
	geoms: { geom: any, xform: number[], pos: number }[];
	quad: p5.Vector[];
    label: string;
    
	constructor()
	{
		this.geoms = [];
		this.quad = [];
        this.label = '';
	}

	addChild( g: any, T: number[], pos: number )
	{
		this.geoms.push( { geom : g, xform: T, pos } );
	}

	draw( S: number[], ppos = 0 ) 
	{
        const m = this.geoms.length === 2 ? 1 : 10;
		for( let g of this.geoms ) {
			g.geom.draw( mul( S, g.xform ), ppos * m + g.pos );
		}

        if (this.geoms.length > 2 && state.showQuads) {
            p.push();
            p.noFill();

            // Draw a thicker black line for the outline
            p.stroke(0);
            p.strokeWeight(0.12);
            p.beginShape();
            for (const qp of this.quad) {
                const tp = transPt(S, qp);
                p.vertex(tp.x, tp.y);
            }
            p.endShape(p.CLOSE);

            // Draw the colored line on top
            const col = state.colmap[this.label];
            p.stroke(col[0], col[1], col[2]);
            p.strokeWeight(0.08);
            p.beginShape();
            for (const qp of this.quad) {
                const tp = transPt(S, qp);
                p.vertex(tp.x, tp.y);
            }
            p.endShape(p.CLOSE);
            
            for (const qp of this.quad) {
                const tp = transPt(S, qp);
                p.circle(tp.x, tp.y, 0.1);
            }
            p.pop();
        }

		// if composite children have edge labels, draw them too
		for( let g of this.geoms ) {
			if( g.geom && typeof g.geom._drawEdgeLabels === 'function' ) {
				g.geom._drawEdgeLabels( mul( S, g.xform ) );
			}
		}
	}

	streamSVG( S: number[], stream: string[] )
	{
		for( let g of this.geoms ) {
			g.geom.streamSVG( mul( S, g.xform ), stream );
		}
	}
}

function edgeToKey(edge: [[number, number], [number, number]]): string {
    const key1 = `${edge[0][0].toFixed(3)},${edge[0][1].toFixed(3)}`;
    const key2 = `${edge[1][0].toFixed(3)},${edge[1][1].toFixed(3)}`;
    return key1 < key2 ? `${key1}_${key2}` : `${key2}_${key1}`;
}
