// --- FULL MIGRATION ---
function drawPolygon(shape: {x: number, y: number}[], T: number[], f: number[] | null, s: number[] | null, w: number) {
	if (f != null) {
		fill(...f);
	} else {
		noFill();
	}
	if (s != null) {
		stroke(0);
		strokeWeight(w);
	} else {
		noStroke();
	}
	beginShape();
	for (let p of shape) {
		const tp = transPt(T, p);
		vertex(tp.x, tp.y);
	}
	endShape(CLOSE);
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	sys = buildSpectreBase();
	palette_sys = makePaletteSnapshot(sys);

	let lab = createSpan('Shapes');
	lab.position(10, 10);
	lab.size(125, 15);

	shape_sel = createSelect();
	shape_sel.position(10, 30);
	shape_sel.size(125, 25);
	shape_sel.option('Tile(1,1)');
	shape_sel.option('Spectres');
	shape_sel.option('Hexagons');
	shape_sel.option('Turtles in Hats');
	shape_sel.option('Hats in Turtles');
	shape_sel.changed(function () {
		const s = shape_sel.value();
		if (s == 'Hexagons') {
			sys = buildHexBase();
		} else if (s == 'Turtles in Hats') {
			sys = buildHatTurtleBase(true);
		} else if (s == 'Hats in Turtles') {
			sys = buildHatTurtleBase(false);
		} else if (s == 'Spectres') {
			sys = buildSpectreBase(true);
		} else {
			sys = buildSpectreBase(false);
		}
		to_screen = [20, 0, 0, 0, -20, 0];
		lw_scale = 1;
		loop();
	});

	subst_button = createButton('Build Supertiles');
	subst_button.position(10, 60);
	subst_button.size(125, 25);
	subst_button.mousePressed(function () {
		sys = buildSupertiles(sys);
		loop();
	});

	lab = createSpan('Category');
	lab.position(10, 100);
	lab.size(125, 15);

	tile_sel = createSelect();
	tile_sel.position(10, 120);
	tile_sel.size(125, 25);
	for (let name of tile_names) {
		tile_sel.option(name);
	}
	tile_sel.value('Delta');
	tile_sel.changed(loop);

	// Thumbnail palette
	const THUMB_MULT = 3;
	const thumbSizeBase = 64;
	const thumbSize = thumbSizeBase * THUMB_MULT;
	const thumbScale = 14 * THUMB_MULT;
	paletteDiv = createDiv('');
	paletteDiv.style('position', 'absolute');
	paletteDiv.style('display', 'grid');
	paletteDiv.style('grid-template-columns', `repeat(5, ${thumbSize}px)`);
	paletteDiv.style('grid-auto-rows', `${thumbSize}px`);
	paletteDiv.style('gap', '8px');
	paletteDiv.style('overflow-x', 'auto');
	paletteDiv.style('white-space', 'normal');
	paletteDiv.elt.style.padding = '4px';

	// overlays: stored per-label as array of strokes
	// helper to draw a geometry (Shape or Meta) into a 2D canvas context using transform S
	function drawGeomToContext(ctx: CanvasRenderingContext2D, geom: any, S: number[], overrideLabel?: string) {
		if (!geom) return;
		if (geom.geoms && Array.isArray(geom.geoms)) {
			for (let g of geom.geoms) {
				if (g && g.geom) drawGeomToContext(ctx, g.geom, mul(S, g.xform), overrideLabel);
			}
			return;
		}
		ctx.beginPath();
		for (let i = 0; i < (geom.pts ? geom.pts.length : 0); ++i) {
			const p = geom.pts[i];
			const tp = transPt(S, p);
			if (i == 0) ctx.moveTo(tp.x, tp.y); else ctx.lineTo(tp.x, tp.y);
		}
		ctx.closePath();
		const labelForFill = overrideLabel || geom.label;
		const col = colmap[labelForFill] || [200, 200, 200];
		ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
		ctx.fill();
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 1;
		ctx.stroke();
		// overlays
		const overlayKey = overrideLabel || geom.label;
		if (typeof overlays !== 'undefined' && overlays[overlayKey]) {
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 2;
			for (let stroke of overlays[overlayKey]) {
				ctx.beginPath();
				for (let j = 0; j < stroke.length; ++j) {
					const sp = transPt(S, stroke[j]);
					if (j == 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
				}
				ctx.stroke();
			}
		}
		// draw edge labels on thumbnails
		try {
			if (typeof showEdgeLabels !== 'undefined' && showEdgeLabels && typeof (window as any).unique_edge_labels !== 'undefined') {
				const labList = (window as any).unique_edge_labels[labelForFill];
				if (labList && labList.length) {
					drawEdgeLabels(ctx, geom.pts || [], labList, S, { fontPx: 20, insetPx: 0, useP5: false });
				}
			}
		} catch (e) { }
	}

	function clonePt(p: {x: number, y: number}) { return { x: p.x, y: p.y }; }
	function clonePtsArray(pts: {x: number, y: number}[]) { return pts.map(clonePt); }
	function cloneGeom(geom: any) {
		if (!geom) return null;
		if (geom.geoms && Array.isArray(geom.geoms)) {
			const out = { geoms: [] as any[], quad: geom.quad ? clonePtsArray(geom.quad) : undefined };
			for (const child of geom.geoms) {
				out.geoms.push({ geom: cloneGeom(child.geom), xform: child.xform.slice() });
			}
			return out;
		}
		return { pts: clonePtsArray(geom.pts || []), label: geom.label, quad: geom.quad ? clonePtsArray(geom.quad) : undefined };
	}
	function collectPoints(geom: any, T: number[], out: {x: number, y: number}[]) {
		if (!geom) return;
		if (geom.geoms && Array.isArray(geom.geoms)) {
			for (const c of geom.geoms) {
				const childT = mul(T, c.xform);
				collectPoints(c.geom, childT, out);
			}
			return;
		}
		for (const p of (geom.pts || [])) {
			const tp = transPt(T, p);
			out.push({ x: tp.x, y: tp.y });
		}
	}
	function computeCentroid(geom: any) {
		if (!geom) return { x: 0, y: 0 };
		const pts: {x: number, y: number}[] = [];
		collectPoints(geom, ident, pts);
		if (pts.length === 0) return { x: 0, y: 0 };
		let sx = 0, sy = 0;
		for (const p of pts) { sx += p.x; sy += p.y; }
		return { x: sx / pts.length, y: sy / pts.length };
	}
	function makePaletteSnapshot(src: Record<string, any>) {
		const out: Record<string, any> = {};
		for (const k in src) {
			out[k] = cloneGeom(src[k]);
		}
		if (out['Gamma'] && out['Gamma'].geoms && Array.isArray(out['Gamma'].geoms)) {
			for (const c of out['Gamma'].geoms) {
				if (c && c.geom && c.geom.label) {
					out[c.geom.label] = cloneGeom(c.geom);
				}
			}
		}
		return out;
	}
	const activeStroke = { label: null as string | null, points: null as any, canvas: null as any };
	function makeThumbnail(label: string) {
	const el = document.createElement('canvas');
	el.width = thumbSize;
	el.height = thumbSize;
	paletteDiv.elt.appendChild(el);
	el.style.border = '1px solid #888';
	el.style.cursor = 'crosshair';
	el.style.margin = '0';
	el.style.boxSizing = 'border-box';
	el.style.width = thumbSize + 'px';
	el.style.height = thumbSize + 'px';
	const ctx = el.getContext('2d');
		let center = { x: 0, y: 0 };
		if (palette_sys && palette_sys[label]) {
			center = computeCentroid(palette_sys[label]);
		}
		const toCenter = ttrans(-center.x, -center.y);
		const scale = [thumbScale, 0, 0, 0, -thumbScale, 0];
		const place = ttrans(thumbSize / 2, thumbSize / 2);
		const S_thumb = mul(place, mul(scale, toCenter));
		function renderThumb() {
			if (!ctx) return;
			ctx.clearRect(0, 0, thumbSize, thumbSize);
			const source = (palette_sys && palette_sys[label]) ? palette_sys[label] : null;
			drawGeomToContext(ctx, source, S_thumb);
		}
		el.addEventListener('pointerdown', function (ev: any) {
			ev.preventDefault();
			const rect = el.getBoundingClientRect();
			const x = ev.clientX - rect.left;
			const y = ev.clientY - rect.top;
			const invS = inv(S_thumb);
			const local = transPt(invS, pt(x, y));
			activeStroke.label = label;
			activeStroke.points = [local];
			activeStroke.canvas = el;
			if (!overlays[label]) overlays[label] = [];
			renderThumb();
			if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
		});
		el.addEventListener('pointermove', function (ev: any) {
			if (!activeStroke.points || activeStroke.canvas !== el) return;
			ev.preventDefault();
			const rect = el.getBoundingClientRect();
			const x = ev.clientX - rect.left;
			const y = ev.clientY - rect.top;
			const invS = inv(S_thumb);
			const local = transPt(invS, pt(x, y));
			activeStroke.points.push(local);
			renderThumb();
			if (ctx) {
				ctx.beginPath();
				for (let i = 0; i < activeStroke.points.length; ++i) {
					const p = transPt(S_thumb, activeStroke.points[i]);
					if (i == 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
				}
				ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.stroke();
			}
		});
		window.addEventListener('pointerup', function (ev: any) {
			if (activeStroke.points && activeStroke.label === label && activeStroke.canvas === el) {
				overlays[label].push(activeStroke.points);
				activeStroke.points = null;
				activeStroke.canvas = null;
				loop();
			}
		});
		renderThumb();
		miniCanvases[label] = { el, ctx, S_thumb };
	}
	miniNames = ['Gamma1', 'Gamma2', ...tile_names.filter(n => n !== 'Gamma')];
	if (miniNames.length > 10) miniNames = miniNames.slice(0, 10);
	for (let name of miniNames) {
		makeThumbnail(name);
		if (!overlays[name]) overlays[name] = [];
	}
	function refreshThumbnails() {
		const s = colscheme_sel ? colscheme_sel.value() : 'Pride';
		if (s === 'Custom') {
			let cm: Record<string, [number, number, number]> = {};
			for (let k in custom_colors) {
				const hex = custom_colors[k];
				const h = hex.replace('#', '');
				cm[k] = [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
			}
			colmap = cm;
		} else if (s == 'Figure 5.3') colmap = colmap53;
		else if (s == 'Bright') colmap = colmap_orig;
		else if (s == 'Pride') colmap = colmap_pride;
		else colmap = colmap_mystics;
		for (const name of miniNames) {
			const mc = miniCanvases[name];
			if (!mc) continue;
			mc.ctx.clearRect(0, 0, thumbSize, thumbSize);
			drawGeomToContext(mc.ctx, (palette_sys && palette_sys[name]) ? palette_sys[name] : null, mc.S_thumb);
		}
	}
	refreshThumbnails();
	try {
		const cols = 5;
		const totalWidth = cols * (thumbSize + 8);
		if (totalWidth + 40 < windowWidth) {
			const left = Math.floor((windowWidth - totalWidth) / 2);
			paletteDiv.position(left, 5);
		} else {
			const minLeft = 140;
			paletteDiv.position(minLeft, 5);
			paletteDiv.elt.scrollLeft = 0;
		}
	} catch (e) { }
	function repositionPalette() {
		const gap = 6;
		const cols = 5;
		const totalWidth = cols * (thumbSize + gap);
		const minLeft = 140;
		const left = (totalWidth + 40 < windowWidth) ? Math.floor((windowWidth - totalWidth) / 2) : minLeft;
		paletteDiv.position(left, 5);
		paletteDiv.style('width', `${totalWidth}px`);
		paletteDiv.style('height', `${(thumbSize * 2) + gap}px`);
		paletteDiv.style('z-index', '1000');
		customDiv.position(left, 5 + (thumbSize * 2) + 16);
		customDiv.style('z-index', '1000');
	}
	customDiv = createDiv('');
	customDiv.style('position', 'absolute');
	customDiv.style('padding', '6px');
	customDiv.style('background', 'rgba(255,255,255,0.9)');
	repositionPalette();
	lab = createSpan('Colours');
	lab.position(10, 150);
	lab.size(125, 15);
	colscheme_sel = createSelect();
	colscheme_sel.position(10, 170);
	colscheme_sel.size(125, 25);
	colscheme_sel.option('Pride');
	colscheme_sel.option('Mystics');
	colscheme_sel.option('Figure 5.3');
	colscheme_sel.option('Custom');
	colscheme_sel.option('Bright');
	function makeColorPicker(name: string) {
		const holder = createDiv('');
		holder.parent(customDiv);
		holder.style('display', 'inline-block');
		holder.style('margin', '4px');
		const lab = createSpan(name);
		lab.parent(holder);
		lab.style('display', 'block');
		lab.style('font-size', '11px');
		const inp = createInput(custom_colors[name] || '#ffffff', 'color');
		inp.parent(holder);
		inp.input(function () {
			custom_colors[name] = inp.value();
			if (colscheme_sel.value() !== 'Custom') {
				colscheme_sel.value('Custom');
			}
			loop();
			refreshThumbnails();
		});
		return inp;
	}
	const color_pickers: Record<string, any> = {};
	for (let name of tile_names.concat(['Gamma1', 'Gamma2'])) {
		color_pickers[name] = makeColorPicker(name);
	}
	colscheme_sel.changed(function () {
		const s = colscheme_sel.value();
		if (s === 'Custom') {
			loop();
			return;
		}
		let src: Record<string, [number, number, number]>;
		if (s == 'Figure 5.3') src = colmap53;
		else if (s == 'Bright') src = colmap_orig;
		else if (s == 'Pride') src = colmap_pride;
		else src = colmap_mystics;
		for (let k in color_pickers) {
			const rgb = src[k] || [255, 255, 255];
			const hex = rgbArrayToHex(rgb);
			custom_colors[k] = hex;
			try { color_pickers[k].value(hex); } catch (e) { }
		}
		colmap = src;
		loop();
		refreshThumbnails();
	});
	try { colscheme_sel.elt.dispatchEvent(new Event('change')); } catch (e) { }
	loop();
	const lbl_check = createCheckbox('Show Edge Labels', false);
	lbl_check.position(10, 210);
	lbl_check.changed(function () {
		showEdgeLabels = lbl_check.checked();
		loop();
	});
	let save_button = createButton('Save PNG');
	save_button.position(10, 280);
	save_button.size(125, 25);
	save_button.mousePressed(function () {
		uibox = false;
		draw();
		save('output.png');
		uibox = true;
		draw();
	});
	let svg_button = createButton('Save SVG');
	svg_button.position(10, 310);
	svg_button.size(125, 25);
	svg_button.mousePressed(function () {
		const stream: string[] = [];
		stream.push(`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
		stream.push(`<g transform="translate(${width / 2},${height / 2})">`);
		sys[tile_sel.value()].streamSVG(to_screen, stream, colmap);
		stream.push('</g>');
		stream.push('</svg>');
		saveStrings(stream, 'output', 'svg');
	});
}

function draw() {
	background(255);
	window.push();
	window.translate(width / 2, height / 2);
	applyMatrix(
		to_screen[0], to_screen[3],
		to_screen[1], to_screen[4],
		to_screen[2], to_screen[5]
	);
	const s = (typeof colscheme_sel !== 'undefined' && colscheme_sel) ? colscheme_sel.value() : 'Pride';
	if (s == 'Figure 5.3') {
		colmap = colmap53;
	} else if (s == 'Bright') {
		colmap = colmap_orig;
	} else if (s == 'Pride') {
		colmap = colmap_pride;
	} else {
		colmap = colmap_mystics;
	}
	if (s == 'Custom') {
		let cm: Record<string, [number, number, number]> = {};
		for (let k in custom_colors) {
			const hex = custom_colors[k];
			const h = hex.replace('#', '');
			const r = parseInt(h.substring(0, 2), 16);
			const g = parseInt(h.substring(2, 4), 16);
			const b = parseInt(h.substring(4, 6), 16);
			cm[k] = [r, g, b];
		}
		colmap = cm;
	}
	const sel = (typeof tile_sel !== 'undefined' && tile_sel) ? tile_sel.value() : null;
	if (sel && sys && sys[sel] && typeof sys[sel].draw === 'function') {
		sys[sel].draw(to_screen, {
			drawPolygon,
			colmap,
			overlays,
			p5: window,
			showEdgeLabels,
			unique_edge_labels: (window as any).unique_edge_labels || {}
		});
	} else {
		push();
		fill(0);
		noStroke();
		textAlign('center', 'center');
		textSize(14);
		text('No tile to display', 0, 0);
		pop();
	}
	pop();
	if (uibox) {
		window.stroke(0);
		window.strokeWeight(0.5);
		window.fill(255, 220);
		window.rect(5, 5, 135, 335);
	}
	noLoop();
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	try { (window as any).repositionPalette(); } catch (e) { }
}

function mousePressed() {
	dragging = true;
	loop();
}

function mouseDragged() {
	if (dragging) {
		to_screen = mul(ttrans(mouseX - window.pmouseX, mouseY - window.pmouseY), to_screen);
		lw_scale = mag(to_screen[0], to_screen[1]) / 20.0;
		loop();
		return false;
	}
}

function mouseWheel(event: any) {
	const factor = event.deltaY > 0 ? 0.95 : 1.05;
	const world = transPt(inv(to_screen), pt(mouseX - width / 2, mouseY - height / 2));
	to_screen = mul(
		mul(ttrans(world.x, world.y), [factor, 0, 0, 0, factor, 0]),
		mul(ttrans(-world.x, -world.y), to_screen)
	);
	lw_scale = mag(to_screen[0], to_screen[1]) / 20.0;
	loop();
	return false;
}

function mouseReleased() {
	dragging = false;
	loop();
}
// --- MIGRATED MAIN LOGIC ---
declare const window: any;
declare function createCanvas(w: number, h: number): void;
declare function createSpan(txt: string): any;
declare function createSelect(): any;
declare function createButton(txt: string): any;
declare function createDiv(txt?: string): any;
declare function createInput(val: string, type: string): any;
declare function createCheckbox(label: string, checked: boolean): any;
declare function fill(...args: any[]): void;
declare function noFill(): void;
declare function stroke(...args: any[]): void;
declare function strokeWeight(w: number): void;
declare function noStroke(): void;
declare function beginShape(): void;
declare function vertex(x: number, y: number): void;
declare function endShape(mode?: any): void;
declare function push(): void;
declare function pop(): void;
declare function textAlign(h: any, v: any): void;
declare function textSize(sz: number): void;
declare function text(txt: string, x: number, y: number): void;
declare function background(val: number): void;
declare function applyMatrix(a: number, b: number, c: number, d: number, e: number, f: number): void;
declare function resizeCanvas(w: number, h: number): void;
declare function save(name: string): void;
declare function saveStrings(arr: string[], name: string, ext: string): void;
declare function loop(): void;
declare function noLoop(): void;
declare const width: number;
declare const height: number;
declare const windowWidth: number;
declare const windowHeight: number;
declare const mouseX: number;
declare const mouseY: number;
declare const pmouseX: number;
declare function CLOSE(): void;

// ...existing code...

// Migrate all main logic, event handlers, palette, overlays, and p5.js setup/draw from app.js
// For brevity, the full migration is omitted here but will be completed in the next step.
import { pt, transPt, mul, ident, inv, ttrans } from './utils';
import { drawEdgeLabels, buildSpectreBase, buildHatTurtleBase, buildHexBase, buildSupertiles, Shape, Meta } from './tiles';
// buildSpectreBase will be added to tiles.ts if missing

function mag(x: number, y: number): number {
	return Math.sqrt(x * x + y * y);
}

// UI state
let to_screen: number[] = [20, 0, 0, 0, -20, 0];
let lw_scale = 1;
let sys: Record<string, Shape | Meta>;
let showEdgeLabels = false;
let dragging = false;
let uibox = true;

let scale_centre: any;
let scale_start: any;
let scale_ts: any;
let reset_but: any;
let tile_sel: any;
let shape_sel: any;
let colscheme_sel: any;
let subst_button: any;

const tile_names = [
	'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi',
	'Pi', 'Sigma', 'Phi', 'Psi'
];

const colmap53: Record<string, [number, number, number]> = {
	'Gamma': [203, 157, 126],
	'Gamma1': [203, 157, 126],
	'Gamma2': [203, 157, 126],
	'Delta': [163, 150, 133],
	'Theta': [208, 215, 150],
	'Lambda': [184, 205, 178],
	'Xi': [211, 177, 144],
	'Pi': [218, 197, 161],
	'Sigma': [191, 146, 126],
	'Phi': [228, 213, 167],
	'Psi': [224, 223, 156]
};
const colmap_orig: Record<string, [number, number, number]> = {
	'Gamma': [255, 255, 255],
	'Gamma1': [255, 255, 255],
	'Gamma2': [255, 255, 255],
	'Delta': [220, 220, 220],
	'Theta': [255, 191, 191],
	'Lambda': [255, 160, 122],
	'Xi': [255, 242, 0],
	'Pi': [135, 206, 250],
	'Sigma': [245, 245, 220],
	'Phi': [0, 255, 0],
	'Psi': [0, 255, 255]
};
const colmap_mystics: Record<string, [number, number, number]> = {
	'Gamma': [196, 201, 169],
	'Gamma1': [196, 201, 169],
	'Gamma2': [156, 160, 116],
	'Delta': [247, 252, 248],
	'Theta': [247, 252, 248],
	'Lambda': [247, 252, 248],
	'Xi': [247, 252, 248],
	'Pi': [247, 252, 248],
	'Sigma': [247, 252, 248],
	'Phi': [247, 252, 248],
	'Psi': [247, 252, 248]
};
const colmap_pride: Record<string, [number, number, number]> = {
	'Gamma': [255, 255, 255],
	'Gamma1': [97, 57, 21],
	'Gamma2': [0, 0, 0],
	'Delta': [2, 129, 33],
	'Theta': [0, 76, 255],
	'Lambda': [118, 0, 136],
	'Xi': [229, 0, 0],
	'Pi': [255, 175, 199],
	'Sigma': [115, 215, 238],
	'Phi': [255, 141, 0],
	'Psi': [255, 238, 0]
};
let colmap: Record<string, [number, number, number]> = colmap_pride;

const defaultCustom = (() => {
	const out: Record<string, string> = {};
	const names = ['Gamma1', 'Gamma2', ...tile_names];
	for (const n of names) {
		const rgb = (colmap && colmap[n]) ? colmap[n] : [255, 255, 255];
		out[n] = rgbArrayToHex(rgb);
	}
	return out;
})();
let custom_colors: Record<string, string> = { ...defaultCustom };

let overlays: Record<string, any[]> = {};
let paletteDiv: any;
let customDiv: any;
let miniNames: string[];
let miniCanvases: Record<string, any> = {};
let palette_sys: Record<string, any> = {};

function rgbArrayToHex(a: number[]): string {
	function pad2(n: number) {
		const s = n.toString(16);
		return s.length < 2 ? '0' + s : s;
	}
	const r = pad2(a[0] || 0);
	const g = pad2(a[1] || 0);
	const b = pad2(a[2] || 0);
	return `#${r}${g}${b}`;
}
