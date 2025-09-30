
// Consolidated edge label drawing utility
function drawEdgeLabels(ctx, pts, labels, S, opts = {}) {
	if (!labels || labels.length === 0) return;
	// Default options
	const {
		fontPx = 2,
		insetPx = 0,
		useP5 = true // true: p5.js context, false: 2D canvas
	} = opts;
	// Compute centroid
	let sx=0, sy=0;
	for(const p of pts){ sx+=p.x; sy+=p.y; }
	const centroid = { x: sx/pts.length, y: sy/pts.length };
	// Draw labels at midpoints of consecutive pts
	for( let i = 0; i < pts.length; ++i ) {
		const a = pts[i];
		const b = pts[(i+1) % pts.length];
		// Midpoint
		const ma = transPt( S, pt( (a.x + b.x)/2, (a.y + b.y)/2 ) );
		// Edge normal
		const c_world = transPt( S, centroid );
		const a_world = transPt( S, a );
		const b_world = transPt( S, b );
		const ex = b_world.x - a_world.x;
		const ey = b_world.y - a_world.y;
		let nx_e = -ey;
		let ny_e = ex;
		// Ensure normal points inward
		const dot = nx_e * (c_world.x - ma.x) + ny_e * (c_world.y - ma.y);
		if (dot < 0) { nx_e = -nx_e; ny_e = -ny_e; }
		const nmag = Math.sqrt(nx_e*nx_e + ny_e*ny_e) || 1;
		const ox = (nx_e / nmag) * insetPx;
		const oy = (ny_e / nmag) * insetPx;
		const px = ma.x + ox;
		const py = ma.y + oy;
		const lab = labels[i] || '';
		// Color by leading character
		const lead = lab && lab.length ? lab.charAt(0) : '';
		const leadColors = {
			'-': [180, 30, 30],
			'0': [31,119,180],
			'1': [255,127,14],
			'2': [44,160,44],
			'3': [214,39,40],
			'4': [148,103,189],
			'5': [140,86,75],
			'6': [227,119,194],
			'7': [127,127,127],
			'8': [188,189,34],
			'9': [23,190,207]
		};
		const ec = leadColors.hasOwnProperty(lead) ? leadColors[lead] : [0,0,0];
		if (useP5) {
			fill(ec[0], ec[1], ec[2]);
			stroke(0);
			strokeWeight(1);
			push();
			translate(px, py);
			scale(0.1);
			scale(1, -1);
			textAlign(CENTER, CENTER);
			textSize(fontPx);
			text(lab, 0, 0);
			pop();
		} else {
			ctx.save();
			ctx.translate(px, py);
			ctx.scale(0.1, -0.1);
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

class Shape {
	constructor(pts, quad, label) {
		this.pts = pts;
		this.quad = quad;
		this.label = label;
	}

	_drawEdgeLabels(S) {
		if (typeof showEdgeLabels === 'undefined' || !showEdgeLabels) return;
		if (typeof unique_edge_labels === 'undefined') return;
		const labels = unique_edge_labels[this.label];
		if (!labels || labels.length === 0) return;
		const basePts = (this.origPts && this.origPts.length) ? this.origPts : this.pts;
		drawEdgeLabels(null, basePts, labels, S, { fontPx: 2, insetPx: 0, useP5: true });
	}

	draw( S )
	{
		drawPolygon( this.pts, S, colmap[this.label], [0,0,0], 0.1 );
		if( typeof overlays !== 'undefined' && overlays[this.label] ) {
			stroke(0);
			strokeWeight( 0.1 );
			noFill();
			for( let st of overlays[this.label] ) {
				beginShape();
				for( let i = 0; i < st.length; ++i ) {
					const p = transPt( S, st[i] );
					vertex( p.x, p.y );
				}
				endShape();
			}
		}

		// draw edge labels if requested
		if( typeof this._drawEdgeLabels === 'function' ) this._drawEdgeLabels( S );
	}

	// hook into draw to render labels
	_drawHook( S ) {
		this._drawEdgeLabels( S );
	}

	streamSVG( S, stream )
	{
		var s = '<polygon points="';
		var at_start = true;
		for( let p of this.pts ) {
			const sp = transPt( S, p );
			if( at_start ) {
				at_start = false;
			} else {
				s = s + ' ';
			}
			s = s + `${sp.x},${sp.y}`;
		}
		const col = colmap[this.label];

		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
		stream.push( s );
	}
}

class CurvyShape
{
	constructor( pts, quad, label )
	{
		this.quad = quad;
		this.label = label;
		// preserve original vertex list (useful for label placement on curved shapes)
		this.origPts = pts.slice();

		let blah = true;

		this.pts = [pts[pts.length-1]];
		for( const p of pts ) {
			const prev = this.pts[this.pts.length-1];
			const v = psub( p, prev );
			const w = pt( -v.y, v.x );
			if( blah ) {
				this.pts.push( pframe( prev, v, w, 0.33, 0.6 ) );
				this.pts.push( pframe( prev, v, w, 0.67, 0.6 ) );
			} else {
				this.pts.push( pframe( prev, v, w, 0.33, -0.6 ) );
				this.pts.push( pframe( prev, v, w, 0.67, -0.6 ) );
			}
			blah = !blah;
			this.pts.push( p );
		}
	}

	draw( S )
	{
		fill( ...colmap[this.label] );
		strokeWeight( 0.1 );
		stroke( 0 );

		beginShape();
		const tp = transPt( S, this.pts[0] );
		vertex( tp.x, tp.y );

		for( let idx = 1; idx < this.pts.length; idx += 3 ) {
			const a = transPt( S, this.pts[idx] );
			const b = transPt( S, this.pts[idx+1] );
			const c = transPt( S, this.pts[idx+2] );

			bezierVertex( a.x, a.y, b.x, b.y, c.x, c.y );
		}
		endShape( CLOSE );
		if( typeof overlays !== 'undefined' && overlays[this.label] ) {
			stroke(0);
			strokeWeight( 0.1 );
			noFill();
			for( let st of overlays[this.label] ) {
				beginShape();
				for( let i = 0; i < st.length; ++i ) {
					const p = transPt( S, st[i] );
					vertex( p.x, p.y );
				}
				endShape();
			}
		}
	}

	streamSVG( S, stream )
	{
		const tp = transPt( S, this.pts[0] );
		vertex( tp.x, tp.y );

		var s = `<path d="M ${tp.x} ${tp.y}`;
		
		for( let idx = 1; idx < this.pts.length; idx += 3 ) {
			const a = transPt( S, this.pts[idx] );
			const b = transPt( S, this.pts[idx+1] );
			const c = transPt( S, this.pts[idx+2] );

			s = s + ` C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`;	
		}
		const col = colmap[this.label];

		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
		stream.push( s );
	}
}

class Meta
{
	constructor()
	{
		this.geoms = [];
		this.quad = [];
	}

	addChild( g, T )
	{
		this.geoms.push( { geom : g, xform: T } );
	}

	draw( S ) 
	{
		for( let g of this.geoms ) {
			g.geom.draw( mul( S, g.xform ) );
		}
		if( typeof overlays !== 'undefined' && overlays['Gamma'] ) {
			stroke(0);
			strokeWeight( 0.1 );
			noFill();
			for( let st of overlays['Gamma'] ) {
				beginShape();
				for( let i = 0; i < st.length; ++i ) {
					const p = transPt( S, st[i] );
					vertex( p.x, p.y );
				}
				endShape();
			}
		}

		// if composite children have edge labels, draw them too
		for( let g of this.geoms ) {
			if( g.geom && typeof g.geom._drawEdgeLabels === 'function' ) {
				g.geom._drawEdgeLabels( mul( S, g.xform ) );
			}
		}
	}

	streamSVG( S, stream )
	{
		for( let g of this.geoms ) {
			g.geom.streamSVG( mul( S, g.xform ), stream );
		}
	}
}

function buildSpectreBase( curved )
{
	const spectre = [
		pt(0, 0),
		pt(1.0, 0.0),
		pt(1.5, -0.8660254037844386),
		pt(2.366025403784439, -0.36602540378443865),
		pt(2.366025403784439, 0.6339745962155614),
		pt(3.366025403784439, 0.6339745962155614),
		pt(3.866025403784439, 1.5),
		pt(3.0, 2.0),
		pt(2.133974596215561, 1.5),
		pt(1.6339745962155614, 2.3660254037844393),
		pt(0.6339745962155614, 2.3660254037844393),
		pt(-0.3660254037844386, 2.3660254037844393),
		pt(-0.866025403784439, 1.5),
		pt(0.0, 1.0) 
	];

	const spectre_keys = [
		spectre[3], spectre[5], spectre[7], spectre[11]
	];

	const ret = {};

	for( lab of ['Delta', 'Theta', 'Lambda', 'Xi', 
				 'Pi', 'Sigma', 'Phi', 'Psi'] ) {
		if( curved ) {
			ret[lab] = new CurvyShape( spectre, spectre_keys, lab );
		} else {
			ret[lab] = new Shape( spectre, spectre_keys, lab );
		}
	}

	const mystic = new Meta();
	if( curved ) {
		mystic.addChild( 
			new CurvyShape( spectre, spectre_keys, 'Gamma1' ), ident );
		mystic.addChild( 
			new CurvyShape( spectre, spectre_keys, 'Gamma2' ),
				mul( ttrans( spectre[8].x, spectre[8].y ), trot( PI / 6 ) ) );
	} else {
		mystic.addChild( new Shape( spectre, spectre_keys, 'Gamma1' ), ident );
		mystic.addChild( new Shape( spectre, spectre_keys, 'Gamma2' ),
			mul( ttrans( spectre[8].x, spectre[8].y ), trot( PI / 6 ) ) );
	}
	mystic.quad = spectre_keys;
	ret['Gamma'] = mystic;

	return ret;
}

// Unique edge labels (ported from Spectre_Patterns.ipynb)
const unique_edge_labels = {
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


function buildHatTurtleBase( hat_dominant )
{
	const r3 = 1.7320508075688772;
	const hr3 = 0.8660254037844386;

	function hexPt( x, y )
	{
		return pt( x + 0.5*y, -hr3*y );
	}

	function hexPt2( x, y )
	{
		return pt( x + hr3*y, -0.5*y );
	}

	const hat = [
		hexPt(-1, 2), hexPt(0, 2), hexPt(0, 3), hexPt(2, 2), hexPt(3, 0),
		hexPt(4, 0), hexPt(5,-1), hexPt(4,-2), hexPt(2,-1), hexPt(2,-2),
		hexPt( 1, -2), hexPt(0,-2), hexPt(-1,-1), hexPt(0, 0) ];

	const turtle = [
		hexPt(0,0), hexPt(2,-1), hexPt(3,0), hexPt(4,-1), hexPt(4,-2),
		hexPt(6,-3), hexPt(7,-5), hexPt(6,-5), hexPt(5,-4), hexPt(4,-5),
		hexPt(2,-4), hexPt(0,-3), hexPt(-1,-1), hexPt(0,-1)
		];

	const hat_keys = [
		hat[3], hat[5], hat[7], hat[11]
	];
	const turtle_keys = [
		turtle[3], turtle[5], turtle[7], turtle[11]
	];

	const ret = {};

	if( hat_dominant ) {
		for( lab of ['Delta', 'Theta', 'Lambda', 'Xi', 
					 'Pi', 'Sigma', 'Phi', 'Psi'] ) {
			ret[lab] = new Shape( hat, hat_keys, lab );
		}

		const mystic = new Meta();
		mystic.addChild( new Shape( hat, hat_keys, 'Gamma1' ), ident );
		mystic.addChild( new Shape( turtle, turtle_keys, 'Gamma2' ),
			ttrans( hat[8].x, hat[8].y ) );
		mystic.quad = hat_keys;
		ret['Gamma'] = mystic;
	} else {
		for( lab of ['Delta', 'Theta', 'Lambda', 'Xi', 
					 'Pi', 'Sigma', 'Phi', 'Psi'] ) {
			ret[lab] = new Shape( turtle, turtle_keys, lab );
		}

		const mystic = new Meta();
		mystic.addChild( new Shape( turtle, turtle_keys, 'Gamma1' ), ident );
		mystic.addChild( new Shape( hat, hat_keys, 'Gamma2' ),
			mul( ttrans( turtle[9].x, turtle[9].y ), trot( PI/3 ) ) );
		mystic.quad = turtle_keys;
		ret['Gamma'] = mystic;
	}

	return ret;
}

function buildHexBase()
{
	const hr3 = 0.8660254037844386;

	const hex = [
		pt(0, 0),
		pt(1.0, 0.0),
		pt(1.5, hr3),
		pt(1, 2*hr3),
		pt(0, 2*hr3),
		pt(-0.5, hr3) 
	];

	const hex_keys = [ hex[1], hex[2], hex[3], hex[5] ];

	const ret = {};

	for( lab of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 
				 'Pi', 'Sigma', 'Phi', 'Psi'] ) {
		ret[lab] = new Shape( hex, hex_keys, lab );
	}

	return ret;
}

function buildSupertiles( sys )
{
	// First, use any of the nine-unit tiles in sys to obtain
	// a list of transformation matrices for placing tiles within
	// supertiles.

	const quad = sys['Delta'].quad;
	const R = [-1,0,0,0,1,0];
	
	const t_rules = [
		[60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
		[0, 2, 0], [60, 3, 1], [-120, 3, 3] ];  

	const Ts = [ident];
	let total_ang = 0;
	let rot = ident;
	const tquad = [...quad];
	for( const [ang,from,to] of t_rules ) {
		total_ang += ang;
		if( ang != 0 ) {
			rot = trot( radians( total_ang ) );
			for( i = 0; i < 4; ++i ) {
				tquad[i] = transPt( rot, quad[i] );
			}
		}

		const ttt = transTo( tquad[to], 
			transPt( Ts[Ts.length-1], quad[from] ) );
		Ts.push( mul( ttt, rot ) );
	}

	for( let idx = 0; idx < Ts.length; ++idx ) {
		Ts[idx] = mul( R, Ts[idx] );
	}

	// Now build the actual supertiles, labelling appropriately.
	const super_rules = {
		'Gamma' :  ['Pi','Delta','null','Theta','Sigma','Xi','Phi','Gamma'],
		'Delta' :  ['Xi','Delta','Xi','Phi','Sigma','Pi','Phi','Gamma'],
		'Theta' :  ['Psi','Delta','Pi','Phi','Sigma','Pi','Phi','Gamma'],
		'Lambda' : ['Psi','Delta','Xi','Phi','Sigma','Pi','Phi','Gamma'],
		'Xi' :     ['Psi','Delta','Pi','Phi','Sigma','Psi','Phi','Gamma'],
		'Pi' :     ['Psi','Delta','Xi','Phi','Sigma','Psi','Phi','Gamma'],
		'Sigma' :  ['Xi','Delta','Xi','Phi','Sigma','Pi','Lambda','Gamma'],
		'Phi' :    ['Psi','Delta','Psi','Phi','Sigma','Pi','Phi','Gamma'],
		'Psi' :    ['Psi','Delta','Psi','Phi','Sigma','Psi','Phi','Gamma'] };
	const super_quad = [
		transPt( Ts[6], quad[2] ),
		transPt( Ts[5], quad[1] ),
		transPt( Ts[3], quad[2] ),
		transPt( Ts[0], quad[1] ) ]; 

	const ret = {};

	for( const [lab, subs] of Object.entries( super_rules ) ) {
		const sup = new Meta();
		for( let idx = 0; idx < 8; ++idx ) {
			if( subs[idx] == 'null' ) {
				continue;
			}
			sup.addChild( sys[subs[idx]], Ts[idx] );
		}
		sup.quad = super_quad;

		ret[lab] = sup;
	}

	return ret;
}
