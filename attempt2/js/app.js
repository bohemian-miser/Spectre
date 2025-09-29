let to_screen = [20, 0, 0, 0, -20, 0];
let lw_scale = 1;

let sys;
// UI flags
let showEdgeLabels = false;

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
// Initialize custom colours to match the currently active `colmap` so the
// colour pickers default to the same values as the dropdown scheme.
const defaultCustom = (function() {
	const out = {};
	// include Gamma1/Gamma2 plus named tiles
	const names = ['Gamma1','Gamma2'].concat(tile_names);
	for (const n of names) {
		const rgb = (colmap && colmap[n]) ? colmap[n] : [255,255,255];
		out[n] = rgbArrayToHex(rgb);
	}
	return out;
})();
let custom_colors = { ...defaultCustom };

// UI palette elements (hoisted so repositioning can run on resize)
let overlays = {};
let paletteDiv;
let customDiv;
let miniNames;
let miniCanvases = {};
let palette_sys = null;

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

function setup() {
	createCanvas( windowWidth, windowHeight );

	sys = buildSpectreBase();
	// initial thumbnail snapshot
	palette_sys = makePaletteSnapshot(sys);

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
		// do not update palette snapshot here; thumbnails should remain
		// showing the original flavours and never change when sys is rebuilt
		loop();
	} );
	// trigger the change once so the pickers and `custom_colors` reflect the initial selection
	try { colscheme_sel.elt.dispatchEvent(new Event('change')); } catch(e) {}

	subst_button = createButton( "Build Supertiles" );
	subst_button.position( 10, 60 );
	subst_button.size( 125, 25 );
	subst_button.mousePressed( function() {
		sys = buildSupertiles( sys );
		// do not touch palette snapshot here; thumbnails are persistent
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

	// --- Thumbnail palette: one miniature tile of each flavour for drawing overlays
	// thumbnail sizing constants (must be defined before paletteDiv uses them)
	const THUMB_MULT = 3; // thumbnails 3x larger
	const thumbSizeBase = 64;
	const thumbSize = thumbSizeBase * THUMB_MULT;
	const thumbScale = 14 * THUMB_MULT; // scale factor for thumbnail
	// --- Thumbnail palette: one miniature tile of each flavour for drawing overlays
	paletteDiv = createDiv('');
	// style as absolute container; actual position set by repositionPalette()
	paletteDiv.style('position','absolute');
	// use CSS grid so we have a fixed 5-column layout (2 rows for 10 thumbnails)
	paletteDiv.style('display','grid');
	paletteDiv.style('grid-template-columns', `repeat(5, ${thumbSize}px)`);
	paletteDiv.style('grid-auto-rows', `${thumbSize}px`);
	paletteDiv.style('gap','8px');
	// allow horizontal scroll if thumbnails overflow; allow wrapping into rows
	paletteDiv.style('overflow-x','auto');
	paletteDiv.style('white-space','normal');
	paletteDiv.elt.style.padding = '4px';

	// overlays: stored per-label as array of strokes (stroke = array of tile-local points)
	// (overlays is hoisted to module scope)

	// helper to draw a geometry (Shape or Meta) into a 2D canvas context using transform S
	function drawGeomToContext(ctx, geom, S, overrideLabel) {
		if( !geom ) return; // guard against missing sys[label]
		if( geom.geoms && Array.isArray(geom.geoms) ) {
			for( let g of geom.geoms ) {
				if( g && g.geom ) drawGeomToContext(ctx, g.geom, mul(S, g.xform), overrideLabel);
			}
			return;
		}
		// shape-like
		ctx.beginPath();
		for( let i = 0; i < (geom.pts ? geom.pts.length : 0); ++i ) {
			const p = geom.pts[i];
			const tp = transPt(S, p);
			if( i==0 ) ctx.moveTo(tp.x, tp.y); else ctx.lineTo(tp.x, tp.y);
		}
		ctx.closePath();
		const labelForFill = overrideLabel || geom.label;
		const col = colmap[labelForFill] || [200,200,200];
		ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
		ctx.fill();
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 1;
		ctx.stroke();
		// draw overlays if present
		const overlayKey = overrideLabel || geom.label;
		if( typeof overlays !== 'undefined' && overlays[overlayKey] ) {
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 2;
			for( let stroke of overlays[overlayKey] ) {
				ctx.beginPath();
				for( let j = 0; j < stroke.length; ++j ) {
					const sp = transPt(S, stroke[j]);
					if( j==0 ) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
				}
				ctx.stroke();
			}
		}
	}

	// Create a thumbnail-friendly deep snapshot of `sys` where each geom
	// is turned into plain objects (pts, label) or geoms arrays so the
	// 2D canvas renderer never touches live Shape/Meta instances.
	function clonePt(p) { return { x: p.x, y: p.y }; }
	function clonePtsArray(pts) { return pts.map(p => clonePt(p)); }

	function cloneGeom(geom) {
		if (!geom) return null;
		// Meta-like composite
		if (geom.geoms && Array.isArray(geom.geoms)) {
			const out = { geoms: [], quad: geom.quad ? clonePtsArray(geom.quad) : undefined };
			for (const child of geom.geoms) {
				out.geoms.push({ geom: cloneGeom(child.geom), xform: child.xform.slice() });
			}
			return out;
		}
		// shape-like (Shape or CurvyShape) - copy pts and label
		return { pts: clonePtsArray(geom.pts || []), label: geom.label, quad: geom.quad ? clonePtsArray(geom.quad) : undefined };
	}

	// Collect all world-space points for a snapshot geom under transform T
	function collectPoints(geom, T, out) {
		if (!geom) return;
		if (geom.geoms && Array.isArray(geom.geoms)) {
			for (const c of geom.geoms) {
				const childT = mul(T, c.xform);
				collectPoints(c.geom, childT, out);
			}
			return;
		}
		// shape-like
		for (const p of (geom.pts || [])) {
			const tp = transPt(T, p);
			out.push({ x: tp.x, y: tp.y });
		}
	}

	function computeCentroid(geom) {
		if (!geom) return { x: 0, y: 0 };
		const pts = [];
		collectPoints(geom, ident, pts);
		if (pts.length === 0) return { x: 0, y: 0 };
		let sx = 0, sy = 0;
		for (const p of pts) { sx += p.x; sy += p.y; }
		return { x: sx / pts.length, y: sy / pts.length };
	}

	function makePaletteSnapshot(src) {
		const out = {};
		for (const k in src) {
			out[k] = cloneGeom(src[k]);
		}
		// If Gamma is a composite, also expose its children (Gamma1/Gamma2)
		if (out['Gamma'] && out['Gamma'].geoms && Array.isArray(out['Gamma'].geoms)) {
			for (const c of out['Gamma'].geoms) {
				if (c && c.geom && c.geom.label) {
					out[c.geom.label] = cloneGeom(c.geom);
				}
			}
		}
		return out;
	}

	// miniCanvases is hoisted
	const activeStroke = { label: null, points: null, canvas: null };

	function makeThumbnail( label ) {
		const el = createElement('canvas');
		el.attribute('width', thumbSize);
		el.attribute('height', thumbSize);
		el.parent(paletteDiv);
		el.elt.style.border = '1px solid #888';
		el.elt.style.cursor = 'crosshair';
		// ensure the canvas fills the grid cell exactly
		el.elt.style.margin = '0';
		el.elt.style.boxSizing = 'border-box';
		el.elt.style.width = thumbSize + 'px';
		el.elt.style.height = thumbSize + 'px';
		const ctx = el.elt.getContext('2d');
		// compute thumbnail transform: center + scale (flip y)
		// center the shape's centroid in the thumbnail
		let center = { x: 0, y: 0 };
		if (palette_sys && palette_sys[label]) {
			center = computeCentroid(palette_sys[label]);
		}
		// translate centroid to origin then scale and move to canvas center
		const toCenter = ttrans( -center.x, -center.y );
		const scale = [thumbScale,0,0,0,-thumbScale,0];
		const place = ttrans( thumbSize/2, thumbSize/2 );
		const S_thumb = mul( place, mul( scale, toCenter ) );

		function renderThumb() {
			ctx.clearRect(0,0,thumbSize,thumbSize);
			// Use only the persistent palette snapshot. If a label is missing
			// from the snapshot, render nothing (do not fall back to live sys).
			const source = (palette_sys && palette_sys[label]) ? palette_sys[label] : null;
			drawGeomToContext(ctx, source, S_thumb);
		}

		// events for drawing
		el.elt.addEventListener('pointerdown', function(ev) {
			ev.preventDefault();
			const rect = el.elt.getBoundingClientRect();
			const x = ev.clientX - rect.left;
			const y = ev.clientY - rect.top;
			// convert to tile-local coords
			const invS = inv(S_thumb);
			const local = transPt(invS, pt(x, y));
			activeStroke.label = label;
			activeStroke.points = [ local ];
			activeStroke.canvas = el.elt;
			// ensure overlay array exists
			if( !overlays[label] ) overlays[label] = [];
			// draw feedback
			renderThumb();
			ctx.beginPath(); ctx.moveTo(x,y);
		});

		el.elt.addEventListener('pointermove', function(ev) {
			if( !activeStroke.points || activeStroke.canvas !== el.elt ) return;
			ev.preventDefault();
			const rect = el.elt.getBoundingClientRect();
			const x = ev.clientX - rect.left;
			const y = ev.clientY - rect.top;
			const invS = inv(S_thumb);
			const local = transPt(invS, pt(x, y));
			activeStroke.points.push(local);
			// immediate feedback on thumb
			renderThumb();
			ctx.beginPath();
			for( let i = 0; i < activeStroke.points.length; ++i ) {
				const p = transPt(S_thumb, activeStroke.points[i]);
				if( i==0 ) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
			}
			ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.stroke();
		});

		window.addEventListener('pointerup', function(ev) {
			if( activeStroke.points && activeStroke.label === label && activeStroke.canvas === el.elt ) {
				overlays[label].push(activeStroke.points);
				activeStroke.points = null;
				activeStroke.canvas = null;
				// trigger main redraw
				loop();
			}
		});

		// initial render
		renderThumb();
		miniCanvases[label] = { el: el.elt, ctx: ctx, S_thumb };
	}

	// build thumbnails for each flavour (include Gamma1, Gamma2, then all other names except the composite 'Gamma')
	// ensure exactly 10 thumbnails: Gamma1, Gamma2, then the 8 named tiles
	miniNames = ['Gamma1','Gamma2'].concat(tile_names.filter(n => n !== 'Gamma'));
	if (miniNames.length > 10) miniNames = miniNames.slice(0,10);
	for( let name of miniNames ) {
		makeThumbnail(name);
		if( !overlays[name] ) overlays[name] = [];
	}

	function refreshThumbnails() {
		// ensure colmap reflects selector (and custom_colors)
		const s = colscheme_sel ? colscheme_sel.value() : 'Pride';
		if (s === 'Custom') {
			let cm = {};
			for (let k in custom_colors) {
				const hex = custom_colors[k];
				const h = hex.replace('#','');
				cm[k] = [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
			}
			colmap = cm;
		} else if (s == 'Figure 5.3') colmap = colmap53;
		else if (s == 'Bright') colmap = colmap_orig;
		else if (s == 'Pride') colmap = colmap_pride;
		else colmap = colmap_mystics;

		for (const name of miniNames) {
			const mc = miniCanvases[name];
			if (!mc) continue;
			mc.ctx.clearRect(0,0, thumbSize, thumbSize);
			// draw from persistent snapshot only
			drawGeomToContext(mc.ctx, (palette_sys && palette_sys[name]) ? palette_sys[name] : null, mc.S_thumb);
		}
	}

	// initial thumbnail refresh to match dropdown on load
	refreshThumbnails();

	// center visible thumbnails into two rows of 5 columns if they fit
	try {
		const cols = 5;
		const totalWidth = cols * (thumbSize + 8);
		if( totalWidth + 40 < windowWidth ) {
			const left = Math.floor((windowWidth - totalWidth)/2);
			paletteDiv.position(left, 5);
		} else {
			const minLeft = 140;
			paletteDiv.position(minLeft, 5);
			// ensure first thumbnails visible
			paletteDiv.elt.scrollLeft = 0;
		}
	} catch(e) {}

	// reposition palette to avoid overlapping left controls
	function repositionPalette() {
		const gap = 6;
		const cols = 5;
		const totalWidth = cols * (thumbSize + gap);
		// center across the top
		const minLeft = 140; // avoid left controls
		const left = (totalWidth + 40 < windowWidth) ? Math.floor((windowWidth - totalWidth)/2) : minLeft;
			paletteDiv.position( left, 5 );
			paletteDiv.style('width', `${totalWidth}px`);
			// reserve two rows of thumbnail height for layout
			paletteDiv.style('height', `${(thumbSize * 2) + (gap)}px`);
		paletteDiv.style('z-index', '1000');
		// position custom div under two rows of thumbnails
		customDiv.position( left, 5 + (thumbSize * 2) + 16 );
		customDiv.style('z-index', '1000');
	}

	// create customDiv (moved here so reposition can reference thumbSize)
	customDiv = createDiv('');
	customDiv.style('position','absolute');
	customDiv.style('padding', '6px');
	customDiv.style('background', 'rgba(255,255,255,0.9)');
	repositionPalette();

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
	// ensure UI reflects initial scheme: trigger change after handler assignment

	// --- Custom colour pickers area (below thumbnails)
	// container div created earlier (customDiv) — styles/position handled by repositionPalette()

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
	const inp = createInput( custom_colors[name] || '#ffffff', 'color' );
		inp.parent(holder);
		inp.input( function() {
				// when user edits a picker, switch the scheme to Custom and redraw
				custom_colors[name] = inp.value();
				if( colscheme_sel.value() !== 'Custom' ) {
					colscheme_sel.value('Custom');
				}
				loop();
				refreshThumbnails();
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
		refreshThumbnails();
	} );

	// Checkbox: show edge labels
	const lbl_check = createCheckbox('Show Edge Labels', false);
	lbl_check.position( 10, 210 );
	lbl_check.changed( function() {
		showEdgeLabels = lbl_check.checked();
		loop();
	} );

	// ...existing code...

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

	// draw the currently selected tile only
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
	try { repositionPalette(); } catch(e) {}
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
