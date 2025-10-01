const ident = [1,0,0,0,1,0];

let to_screen = [20, 0, 0, 0, -20, 0];
let lw_scale = 1;

let sys;

let scale_centre;
let scale_start;
let scale_ts;

let reset_but;
let tile_sel;
let shape_sel;
let colscheme_sel;

let subst_button;
let translate_button;
let scale_button;
let dragging = false;
let uibox = true;

const tile_names = [ 
	'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi',
	'Pi', 'Sigma', 'Phi', 'Psi' ];

// Color map from Figure 5.3
const colmap53 = {
	'Gamma' : [203, 157, 126],
	'Gamma1' : [203, 157, 126],
	'Gamma2' : [203, 157, 126],
	'Delta' : [163, 150, 133],
	'Theta' : [208, 215, 150],
	'Lambda' : [184, 205, 178],
	'Xi' : [211, 177, 144],
	'Pi' : [218, 197, 161],
	'Sigma' : [191, 146, 126],
	'Phi' : [228, 213, 167],
	'Psi' : [224, 223, 156] };

const colmap_orig = {
	'Gamma' : [255, 255, 255],
	'Gamma1' : [255, 255, 255],
	'Gamma2' : [255, 255, 255],
	'Delta' : [220, 220, 220],
	'Theta' : [255, 191, 191],
	'Lambda' : [255, 160, 122],
	'Xi' : [255, 242, 0],
	'Pi' : [135, 206, 250],
	'Sigma' : [245, 245, 220],
	'Phi' : [0, 255, 0],
	'Psi' : [0, 255, 255] };

const colmap_mystics = {
	'Gamma' : [196, 201, 169],
	'Gamma1' : [196, 201, 169],
	'Gamma2' : [156, 160, 116],
	'Delta' : [247, 252, 248],
	'Theta' : [247, 252, 248],
	'Lambda' : [247, 252, 248],
	'Xi' : [247, 252, 248],
	'Pi' : [247, 252, 248],
	'Sigma' : [247, 252, 248],
	'Phi' : [247, 252, 248],
	'Psi' : [247, 252, 248] };

const colmap_pride = {
	'Gamma' : [255, 255, 255],
	'Gamma1' : [97, 57, 21], 
	'Gamma2' : [0, 0, 0],
	'Delta' : [2, 129, 33],
	'Theta' : [0, 76, 255],
	'Lambda' : [118, 0, 136],
	'Xi' : [229, 0, 0],
	'Pi' : [255, 175, 199],
	'Sigma' : [115, 215, 238],
	'Phi' : [255, 141, 0],
	'Psi' : [255, 238, 0] };

let colmap = colmap_pride;

function pt( x, y )
{
	return { x : x, y : y };
}

// Affine matrix inverse
function inv( T ) {
	const det = T[0]*T[4] - T[1]*T[3];
	return [T[4]/det, -T[1]/det, (T[1]*T[5]-T[2]*T[4])/det,
		-T[3]/det, T[0]/det, (T[2]*T[3]-T[0]*T[5])/det];
};

// Affine matrix multiply
function mul( A, B )
{
	return [A[0]*B[0] + A[1]*B[3], 
		A[0]*B[1] + A[1]*B[4],
		A[0]*B[2] + A[1]*B[5] + A[2],

		A[3]*B[0] + A[4]*B[3], 
		A[3]*B[1] + A[4]*B[4],
		A[3]*B[2] + A[4]*B[5] + A[5]];
}

function padd( p, q )
{
	return { x : p.x + q.x, y : p.y + q.y };
}

function psub( p, q )
{
	return { x : p.x - q.x, y : p.y - q.y };
}

function pframe( o, p, q, a, b )
{
	return { x : o.x + a*p.x + b*q.x, y : o.y + a*p.y + b*q.y };
}

// Rotation matrix
function trot( ang )
{
	const c = cos( ang );
	const s = sin( ang );
	return [c, -s, 0, s, c, 0];
}

// Translation matrix
function ttrans( tx, ty )
{
	return [1, 0, tx, 0, 1, ty];
}

function transTo( p, q )
{
	return ttrans( q.x - p.x, q.y - p.y );
}

function rotAbout( p, ang )
{
	return mul( ttrans( p.x, p.y ), 
		mul( trot( ang ), ttrans( -p.x, -p.y ) ) );
}

// Matrix * point
function transPt( M, P )
{
	return pt(M[0]*P.x + M[1]*P.y + M[2], M[3]*P.x + M[4]*P.y + M[5]);
}

// Match unit interval to line segment p->q
function matchSeg( p, q )
{
	return [q.x-p.x, p.y-q.y, p.x,  q.y-p.y, q.x-p.x, p.y];
};

// Match line segment p1->q1 to line segment p2->q2
function matchTwo( p1, q1, p2, q2 )
{
	return mul( matchSeg( p2, q2 ), inv( matchSeg( p1, q1 ) ) );
};

function drawPolygon( shape, T, f, s, w )
{
	if( f != null ) {
		fill( ...f );
	} else {
		noFill();
	}
	if( s != null ) {
		stroke( 0 );
		strokeWeight( w ) ; // / lw_scale );
	} else {
		noStroke();
	}
	beginShape();
	for( let p of shape ) {
		const tp = transPt( T, p );
		vertex( tp.x, tp.y );
	}
	endShape( CLOSE );
}

function streamPolygon( shape, T, f, s, w )
{

}

class Shape
{
	constructor( pts, quad, label )
	{
		this.pts = pts;
		this.quad = quad;
		this.label = label;
	}

	draw( S )
	{
		drawPolygon( this.pts, S, colmap[this.label], [0,0,0], 0.1 );
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

function isButtonActive( but )
{
	return but.elt.style.border.length > 0;
}

function setButtonActive( but, b )
{
	but.elt.style.border = (b ? "3px solid black" : "");
}

function setup() {
	createCanvas( windowWidth, windowHeight );

	sys = buildSpectreBase();

	let lab = createSpan( 'Shapes' );
	lab.position( 10, 10 );
	lab.size( 125, 15 );

	shape_sel = createSelect();
	shape_sel.position( 10, 30 );
	shape_sel.size( 125, 25 );
	shape_sel.option( 'Tile(1,1)' );
	shape_sel.option( 'Spectres' );
	shape_sel.option( 'Hexagons' );
	shape_sel.option( 'Turtles in Hats' );
	shape_sel.option( 'Hats in Turtles' );
	shape_sel.changed( function() {
		const s = shape_sel.value();
		if( s == 'Hexagons' ) {
			sys = buildHexBase();
		} else if( s == 'Turtles in Hats' ) {
			sys = buildHatTurtleBase( true );
		} else if( s == 'Hats in Turtles' ) {
			sys = buildHatTurtleBase( false );
		} else if( s == 'Spectres' ) {
			sys = buildSpectreBase( true );
		} else {
			sys = buildSpectreBase( false );
		}
		to_screen = [20, 0, 0, 0, -20, 0];
		lw_scale = 1;
		loop();
	} );


/*
	reset_but = createButton( "Reset" );
	reset_but.position( 10, 10 );
	reset_but.size( 125, 25 );
	reset_but.mousePressed( function() {
		sys = buildSpectreBase();
		to_screen = [20, 0, 0, 0, -20, 0];
		lw_scale = 0.2;
		loop();
	} );
	*/

	subst_button = createButton( "Build Supertiles" );
	subst_button.position( 10, 60 );
	subst_button.size( 125, 25 );
	subst_button.mousePressed( function() {
		sys = buildSupertiles( sys );	
		loop();
	} );

	lab = createSpan( 'Category' );
	lab.position( 10, 100 );
	lab.size( 125, 15 );

	tile_sel = createSelect();
	tile_sel.position( 10, 120 );
	tile_sel.size( 125, 25 );
	for( let name of tile_names ) {
		tile_sel.option( name );
	}
	tile_sel.value( 'Delta' );
	tile_sel.changed( loop );

	lab = createSpan( 'Colours' );
	lab.position( 10, 150 );
	lab.size( 125, 15 );

	colscheme_sel = createSelect();
	colscheme_sel.position( 10, 170 );
	colscheme_sel.size( 125, 25 );
	colscheme_sel.option( 'Pride' );
	colscheme_sel.option( 'Mystics' );
	colscheme_sel.option( 'Figure 5.3' );
	colscheme_sel.option( 'Bright' );
	colscheme_sel.changed( loop );

	translate_button = createButton( "Translate" );
	setButtonActive( translate_button, true );
	translate_button.position( 10, 210 );
	translate_button.size( 125, 25 );
	translate_button.mousePressed( function() {
		setButtonActive( translate_button, true );
		setButtonActive( scale_button, false );
		loop();
	} );

	scale_button = createButton( "Scale" );
	scale_button.position( 10, 240 );
	scale_button.size( 125, 25 );
	scale_button.mousePressed( function() {
		setButtonActive( translate_button, false );
		setButtonActive( scale_button, true );
		loop();
	} );
	
	let save_button = createButton( "Save PNG" );
	save_button.position( 10, 280 );
	save_button.size( 125, 25 );
	save_button.mousePressed( function () {
		uibox = false;
		draw();
		save( "output.png" );
		uibox = true;
		draw();
	} );

	let svg_button = createButton( "Save SVG" );
	svg_button.position( 10, 310 );
	svg_button.size( 125, 25 );
    svg_button.mousePressed( function () {
        const stream = [];
        stream.push( `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` );
		stream.push( `<g transform="translate(${width/2},${height/2})">` );

		sys[tile_sel.value()].streamSVG( to_screen, stream );

        stream.push( '</g>' );
        stream.push( '</svg>' );

        saveStrings( stream, 'output', 'svg' );
    } );
}

function draw()
{
	background( 255 );

	push();
	translate( width/2, height/2 );

	applyMatrix( 
		to_screen[0], to_screen[3], 
		to_screen[1], to_screen[4], 
		to_screen[2], to_screen[5] );

	const s = colscheme_sel.value();
	if( s == 'Figure 5.3' ) {
		colmap = colmap53;
	} else if( s == 'Bright' ) {
		colmap = colmap_orig;
	} else if( s == 'Pride' ) {
		colmap = colmap_pride;
	} else {
		colmap = colmap_mystics;
	}

	sys[tile_sel.value()].draw( ident );

	pop();

	if( uibox ) {
		stroke( 0 );
		strokeWeight( 0.5 );
		fill( 255, 220 );
		rect( 5, 5, 135, 335 );
	}
	noLoop();
}

function windowResized() 
{
	resizeCanvas( windowWidth, windowHeight );
}

function mousePressed()
{
	dragging = true;
	if( isButtonActive( scale_button ) ) {
		scale_centre = transPt( inv( to_screen ), pt( width/2, height/2 ) );
		scale_start = pt( mouseX, mouseY );
		scale_ts = [...to_screen];
	}
	loop();
}

function mouseDragged()
{
	if( dragging ) {
		if( isButtonActive( translate_button ) ) {
			to_screen = mul( ttrans( mouseX - pmouseX, mouseY - pmouseY ), 
				to_screen );
		} else if( isButtonActive( scale_button ) ) {
			let sc = dist( mouseX, mouseY, width/2, height/2 ) / 
				dist( scale_start.x, scale_start.y, width/2, height/2 );
			to_screen = mul( 
				mul( ttrans( scale_centre.x, scale_centre.y ),
					mul( [sc, 0, 0, 0, sc, 0],
						ttrans( -scale_centre.x, -scale_centre.y ) ) ),
				scale_ts );
			lw_scale = mag( to_screen[0], to_screen[1] ) / 20.0;
		}
		loop();
		return false;
	} 
}

function mouseReleased()
{
	dragging = false;
	loop();
}

