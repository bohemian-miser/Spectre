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
