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

// default custom colours (hex) and current custom mapping (hoisted so draw() can read)
const defaultCustom = {
	'Gamma': '#ffffff', 'Gamma1': '#ffffff', 'Gamma2': '#ffffff',
	'Delta': '#dcdcdc', 'Theta': '#ffbfbf', 'Lambda': '#ffa07a',
	'Xi': '#fff200', 'Pi': '#87cefa', 'Sigma': '#f5f5dc',
	'Phi': '#00ff00', 'Psi': '#00ffff'
};
let custom_colors = { ...defaultCustom };

// helper: convert [r,g,b] to '#rrggbb'
function rgbArrayToHex(a) {
	const r = (a[0]||0).toString(16).padStart(2,'0');
	const g = (a[1]||0).toString(16).padStart(2,'0');
	const b = (a[2]||0).toString(16).padStart(2,'0');
	return `#${r}${g}${b}`;
}

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
	return false;
}

function setButtonActive( but, b )
{
	// no-op: translate/scale buttons removed
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
	colscheme_sel.option( 'Custom' );
	colscheme_sel.option( 'Bright' );
	// changed handler will be assigned after the colour pickers are created

	// --- Custom colour pickers area (above control panel)
	// container div so we can position the group
	const customDiv = createDiv('');
	customDiv.position( 150, 10 );
	customDiv.style('padding', '6px');
	customDiv.style('background', 'rgba(255,255,255,0.9)');

	// Map of custom colours is defined at module scope

	// create one colour input per tile and label
	function makeColorPicker( name ) {
		const holder = createDiv('');
		holder.parent(customDiv);
		holder.style('display','inline-block');
		holder.style('margin','4px');
		const lab = createSpan(name);
		lab.parent(holder);
		lab.style('display','block');
		lab.style('font-size','11px');
		const inp = createInput( defaultCustom[name], 'color' );
		inp.parent(holder);
		inp.input( function() {
				// when user edits a picker, switch the scheme to Custom and redraw
				custom_colors[name] = inp.value();
				if( colscheme_sel.value() !== 'Custom' ) {
					colscheme_sel.value('Custom');
				}
				loop();
			} );
		return inp;
	}

	// Store pickers if needed later
	const color_pickers = {};
	for( let name of tile_names.concat(['Gamma1','Gamma2']) ) {
		color_pickers[name] = makeColorPicker( name );
	}

	// Now wire the colscheme selector so changing schemes updates the color pickers
	colscheme_sel.changed( function() {
		const s = colscheme_sel.value();
		if( s === 'Custom' ) {
			// nothing to overwrite, user picks control custom_colors directly
			loop();
			return;
		}
		// pick source map
		let src;
		if( s == 'Figure 5.3' ) src = colmap53;
		else if( s == 'Bright' ) src = colmap_orig;
		else if( s == 'Pride' ) src = colmap_pride;
		else src = colmap_mystics;
		// update pickers and custom_colors to match the chosen scheme
		for( let k in color_pickers ) {
			const rgb = src[k] || [255,255,255];
			const hex = rgbArrayToHex(rgb);
			custom_colors[k] = hex;
			// update picker UI value
			try { color_pickers[k].value(hex); } catch(e) {}
		}
		// update active colmap immediately
		colmap = src;
		loop();
	} );

	// Pan/zoom controls removed: drag to pan and scroll to zoom
	
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

	// If Custom, convert hex pickers to rgb arrays for colmap lookup
	if( s == 'Custom' ) {
		// build a lightweight mapping of rgb arrays keyed by tile name
		let cm = {};
		for( let k in custom_colors ) {
			const hex = custom_colors[k];
			// strip '#'
			const h = hex.replace('#','');
			const r = parseInt(h.substring(0,2),16);
			const g = parseInt(h.substring(2,4),16);
			const b = parseInt(h.substring(4,6),16);
			cm[k] = [r,g,b];
		}
		colmap = cm;
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
	loop();
}

function mouseDragged()
{
	if( dragging ) {
		// always pan by mouse drag
		to_screen = mul( ttrans( mouseX - pmouseX, mouseY - pmouseY ), to_screen );
		lw_scale = mag( to_screen[0], to_screen[1] ) / 20.0;
		loop();
		return false;
	} 
}

// Zoom with mouse wheel about cursor
function mouseWheel(event) {
	// deltaY > 0 => scroll down => zoom out
	const factor = event.deltaY > 0 ? 0.95 : 1.05;
	// compute world coords of mouse
	const world = transPt( inv( to_screen ), pt( mouseX - width/2, mouseY - height/2 ) );
	// scale about world point
	to_screen = mul(
		mul( ttrans( world.x, world.y ), [factor,0,0,0,factor,0] ),
		mul( ttrans( -world.x, -world.y ), to_screen )
	);
	lw_scale = mag( to_screen[0], to_screen[1] ) / 20.0;
	loop();
	// prevent page scroll
	return false;
}

function mouseReleased()
{
	dragging = false;
	loop();
}
