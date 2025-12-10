import p5 from 'p5';
import { Shape, CurvyShape, Meta, unique_edge_labels, getEdgeDotMidpoints, spectre_pts, hex_edge_labels, hex_pts, hat_pts, turtle_pts } from './tiles';
import { state } from './state';
import { tile_names, colmap53, colmap_orig, colmap_mystics, colmap_pride } from './config';
import { pt, mul, trot, ttrans, inv, transPt, ident, adjust_mat } from './utils';
import { getEdgeDotCount, analyzeAndColor } from './analysis';
import { findPerfectMatchings } from './analysis';

p5.disableFriendlyErrors = true;

const maxThumbWidth = 504; // 64 * 3

const sketch = (p: p5) => {
    (window as any).p = p; // Make p5 instance globally available for modules
    (window as any).state = state;
    let to_screen = [20, 0, 0, 0, -20, 0];

    let sys: any;
    // UI flags
    let tile_sel: p5.Element & { option: (name: string) => void, changed: (callback: () => void) => void };
    let shape_sel: p5.Element & { option: (name: string) => void, changed: (callback: () => void) => void };
    let colscheme_sel: p5.Element & { option: (name: string) => void, changed: (callback: () => void) => void };

    let subst_button: p5.Element;
    let dragging = false;
    let uibox = true;
    let y_pos = 0;
    (window as any).circuitColorMap = new Map<string, string>();

    // For pinch-to-zoom on mobile
    let prevPinchDist = 0;



    let colmap = colmap_orig;
    state.colmap = colmap;

    // default custom colours (hex) and current custom mapping (hoisted so draw() can read)
    // Initialize custom colours to match the currently active `colmap` so the
    // colour pickers default to the same values as the dropdown scheme.
    const defaultCustom = (function () {
        const out: { [key: string]: string } = {};
        // include Gamma1/Gamma2 plus named tiles
        const names = ['Gamma1', 'Gamma2'].concat(tile_names);
        for (const n of names) {
            const rgb = (colmap && colmap[n]) ? colmap[n] : [255, 255, 255];
            out[n] = rgbArrayToHex(rgb);
        }
        return out;
    })();
    let custom_colors: { [key: string]: string } = { ...defaultCustom };

    // UI palette elements (hoisted so repositioning can run on resize)
    let overlays: { [key: string]: p5.Vector[][] } = {};
    (window as any).overlays = overlays;
    let paletteDiv: p5.Element;
    let customDiv: p5.Element;
    let miniNames: string[];
    let miniCanvases: { [key: string]: any } = {};
    let palette_sys: any = null;

    // Responsive thumbnail sizing
    let thumbWidth: number, thumbHeight: number, thumbScale: number;

    // helper: convert [r,g,b] to '#rrggbb'
    function rgbArrayToHex(a: number[]) {
        const r = (a[0] || 0).toString(16).padStart(2, '0');
        const g = (a[1] || 0).toString(16).padStart(2, '0');
        const b = (a[2] || 0).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    function buildSpectreBase(curved?: boolean) {
        const spectre = spectre_pts.map(pt => p.createVector(pt.x, pt.y));

        const spectre_keys = [
            spectre[3], spectre[5], spectre[7], spectre[11]
        ];

        const ret: { [key: string]: any } = {};

        for (let lab of ['Delta', 'Theta', 'Lambda', 'Xi',
            'Pi', 'Sigma', 'Phi', 'Psi']) {
            if (curved) {
                ret[lab] = new CurvyShape(spectre, spectre_keys, lab);
            } else {
                ret[lab] = new Shape(spectre, spectre_keys, lab);
            }
        }

        const mystic = new Meta();
        mystic.label = 'Gamma';
        if (curved) {
            mystic.addChild(
                new CurvyShape(spectre, spectre_keys, 'Gamma1'), ident, 0);
            mystic.addChild(
                new CurvyShape(spectre, spectre_keys, 'Gamma2'),
                mul(ttrans(spectre[8].x, spectre[8].y), trot(p.PI / 6)), 1);
        } else {
            mystic.addChild(new Shape(spectre, spectre_keys, 'Gamma1'), ident, 0);
            mystic.addChild(new Shape(spectre, spectre_keys, 'Gamma2'),
                mul(ttrans(spectre[8].x, spectre[8].y), trot(p.PI / 6)), 1);
        }
        mystic.quad = spectre_keys;
        ret['Gamma'] = mystic;

        return ret;
    }

    function buildHatTurtleBase(hat_dominant: boolean) {
        const hat = hat_pts.map(pt => p.createVector(pt.x, pt.y));
        const turtle = turtle_pts.map(pt => p.createVector(pt.x, pt.y));

        const hat_keys = [
            hat[3], hat[5], hat[7], hat[11]
        ];
        const turtle_keys = [
            turtle[3], turtle[5], turtle[7], turtle[11]
        ];

        const ret: { [key: string]: any } = {};

        if (hat_dominant) {
            for (let lab of ['Delta', 'Theta', 'Lambda', 'Xi',
                'Pi', 'Sigma', 'Phi', 'Psi']) {
                ret[lab] = new Shape(hat, hat_keys, lab);
            }

            const mystic = new Meta();
            mystic.label = 'Gamma';
            mystic.addChild(new Shape(hat, hat_keys, 'Gamma1'), ident, 0);
            mystic.addChild(new Shape(turtle, turtle_keys, 'Gamma2'),
                ttrans(hat[8].x, hat[8].y), 1);
            mystic.quad = hat_keys;
            ret['Gamma'] = mystic;
        } else {
            for (let lab of ['Delta', 'Theta', 'Lambda', 'Xi',
                'Pi', 'Sigma', 'Phi', 'Psi']) {
                ret[lab] = new Shape(turtle, turtle_keys, lab);
            }

            const mystic = new Meta();
            mystic.label = 'Gamma';
            mystic.addChild(new Shape(turtle, turtle_keys, 'Gamma1'), ident, 0);
            mystic.addChild(new Shape(hat, hat_keys, 'Gamma2'),
                mul(ttrans(turtle[9].x, turtle[9].y), trot(p.PI / 3)), 1);
            mystic.quad = turtle_keys;
            ret['Gamma'] = mystic;
        }

        return ret;
    }

    function buildHexBase() {
        const hex = hex_pts.map(pt => p.createVector(pt.x, pt.y));
        const hex_keys = [hex[1], hex[2], hex[3], hex[5]];

        const ret: { [key: string]: any } = {};

        for (let lab of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi',
            'Pi', 'Sigma', 'Phi', 'Psi']) {
            ret[lab] = new Shape(hex, hex_keys, lab);
        }

        return ret;
    }

    function buildSupertiles(sys: { [key: string]: any }) {
        const quad = sys['Delta'].quad;
        const R = [-1, 0, 0, 0, 1, 0];

        const t_rules = [
            [60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
            [0, 2, 0], [60, 3, 1], [-120, 3, 3]
        ];

        const Ts = [ident];
        let total_ang = 0;
        let rot = ident;
        const tquad = [...quad];
        for (const [ang, from, to] of t_rules) {
            total_ang += ang as number;
            if (ang != 0) {
                rot = trot(p.radians(total_ang));
                for (let i = 0; i < 4; ++i) {
                    tquad[i] = transPt(rot, quad[i]);
                }
            }

            const ttt = ttrans(transPt(Ts[Ts.length - 1], quad[from as number]).x - tquad[to as number].x, transPt(Ts[Ts.length - 1], quad[from as number]).y - tquad[to as number].y);
            Ts.push(mul(ttt, rot));
        }

        for (let idx = 0; idx < Ts.length; ++idx) {
            Ts[idx] = mul(R, Ts[idx]);
        }

        const super_rules: { [key: string]: string[] } = {
            'Gamma': ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'],
            'Delta': ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            'Theta': ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            'Lambda': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            'Xi': ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
            'Pi': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
            'Sigma': ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'],
            'Phi': ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            'Psi': ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma']
        };
        const super_quad = [
            transPt(Ts[6], quad[2]),
            transPt(Ts[5], quad[1]),
            transPt(Ts[3], quad[2]),
            transPt(Ts[0], quad[1])
        ];

        const ret: { [key: string]: any } = {};

        for (const [lab, subs] of Object.entries(super_rules)) {
            const sup = new Meta();
            sup.label = lab;
            for (let idx = 0; idx < 8; ++idx) {
                if (subs[idx] == 'null') {
                    continue;
                }
                sup.addChild(sys[subs[idx]], Ts[idx], idx);
            }
            sup.quad = super_quad;

            ret[lab] = sup;
        }

        return ret;
    }

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);

        sys = buildSpectreBase();
        // initial thumbnail snapshot
        palette_sys = makePaletteSnapshot(sys);

        let lab = p.createSpan('Shapes');
        lab.position(10, 10);
        lab.size(125, 15);

        shape_sel = p.createSelect() as any;
        shape_sel.position(10, 30);
        shape_sel.size(125, 25);
        shape_sel.option('Tile(1,1)');
        shape_sel.option('Hexagons');
        shape_sel.option('Turtles in Hats');
        shape_sel.option('Hats in Turtles');
        shape_sel.changed(() => {
            const s = shape_sel.value();
            state.shape = s as string;
            if (s == 'Hexagons') {
                sys = buildHexBase();
            } else if (s == 'Turtles in Hats') {
                sys = buildHatTurtleBase(true);
            } else if (s == 'Hats in Turtles') {
                sys = buildHatTurtleBase(false);
            } else {
                sys = buildSpectreBase(false);
            }
            to_screen = [20, 0, 0, 0, -20, 0];
            state.isCircuitAnalysisDirty = true;
            // Rebuild and refresh thumbnails to match the new shape
            rebuildThumbnails();
            refreshThumbnails();
            p.loop();
        });
        // trigger the change once so the pickers and `custom_colors` reflect the initial selection
        try { (colscheme_sel.elt as any).dispatchEvent(new Event('change')); } catch (e) { }

        subst_button = p.createButton("Build Supertiles");
        subst_button.position(10, 60);
        subst_button.size(125, 25);
        subst_button.mousePressed(() => {
            sys = buildSupertiles(sys);
            state.isCircuitAnalysisDirty = true;
            // do not touch palette snapshot here; thumbnails are persistent
            p.loop();
        });

        lab = p.createSpan('Category');
        lab.position(10, 100);
        lab.size(125, 15);

        tile_sel = p.createSelect() as any;
        tile_sel.position(10, 120);
        tile_sel.size(125, 25);
        for (let name of tile_names) {
            tile_sel.option(name);
        }
        tile_sel.value('Delta');
        tile_sel.changed(() => {
            state.isCircuitAnalysisDirty = true;
            p.loop();
        });

        // --- Thumbnail palette: one miniature tile of each flavour for drawing overlays
        paletteDiv = p.createDiv('');
        paletteDiv.style('position', 'absolute');
        paletteDiv.style('display', 'grid');
        paletteDiv.style('gap', '8px');
        paletteDiv.style('padding', '4px');

        // overlays: stored per-label as array of strokes (stroke = array of tile-local points)
        // (overlays is hoisted to module scope)

        function rebuildThumbnails() {
            const shape = shape_sel ? shape_sel.value() as string : 'Tile(1,1)';
            
            palette_sys = makePaletteSnapshot(sys);

            if (shape === 'Hexagons') {
                miniNames = tile_names;
            } else {
                miniNames = ['Gamma1', 'Gamma2'].concat(tile_names.filter(n => n !== 'Gamma'));
            }

            paletteDiv.html('');
            miniCanvases = {};
            for (let name of miniNames) {
                makeThumbnail(name);
                if (!overlays[name]) overlays[name] = [];
            }
        }

        // helper to draw a geometry (Shape or Meta) into a 2D canvas context using transform S
        function drawGeomToContext(ctx: CanvasRenderingContext2D, geom: any, S: number[], overrideLabel?: string) {
            S = mul(S, adjust_mat);
            if (!geom) return; // guard against missing sys[label]
            if (geom.geoms && Array.isArray(geom.geoms)) {
                for (let g of geom.geoms) {
                    if (g && g.geom) drawGeomToContext(ctx, g.geom, mul(S, g.xform), overrideLabel);
                }
                return;
            }
            // shape-like
            ctx.beginPath();
            for (let i = 0; i < (geom.pts ? geom.pts.length : 0); ++i) {
                const pt = geom.pts[i];
                const tp = transPt(S, pt);
                if (i == 0) ctx.moveTo(tp.x, tp.y); else ctx.lineTo(tp.x, tp.y);
            }
            ctx.closePath();
            const labelForFill = overrideLabel || geom.label;
            const col = colmap[labelForFill] || [200, 200, 200];
            if (state.config.showBackgrounds) {
                ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
                ctx.fill();
            }
            if (state.config.showOutlines) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            // draw overlays if present
            const overlayKey = overrideLabel || geom.label;
            if (typeof overlays !== 'undefined' && overlays[overlayKey] && state.config.showLines) {
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

            // draw faint outlines between all selected dots
            if (state.selectedJoinerEdges.size > 0) {
                const midpoints = getEdgeDotMidpoints(labelForFill, state.selectedJoinerEdges);
                if (midpoints.length > 1) {
                    const matchings = findPerfectMatchings(midpoints.map(m => ({ x: m.x, y: m.y })));
                    const slider = document.getElementById(`slider-${labelForFill}`) as HTMLInputElement;
                    if (slider) {
                        const selectedIndex = parseInt(slider.value, 10);
                        matchings.forEach((matching, index) => {
                            const isSelected = index === selectedIndex;
                            ctx.strokeStyle = isSelected ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.1)';
                            ctx.lineWidth = isSelected ? 2 : 1;
                            for (const pair of matching) {
                                const a = transPt(S, p.createVector(pair[0].x, pair[0].y));
                                const b = transPt(S, p.createVector(pair[1].x, pair[1].y));
                                ctx.beginPath();
                                ctx.moveTo(a.x, a.y);
                                ctx.lineTo(b.x, b.y);
                                ctx.stroke();
                            }
                        });
                    }
                }
            }

            // draw edge labels on thumbnails when requested
            try {
                const getEdgeLabelsForShape = (tileLabel: string): readonly string[] => {
                    const labels = state.shape === 'Hexagons' ? hex_edge_labels : unique_edge_labels;
                    return labels[tileLabel] || [];
                };
                if (state.selectedMajorEdges.size > 0 || state.selectedJoinerEdges.size > 0) {
                    const labList = getEdgeLabelsForShape(labelForFill);
                    if (labList && labList.length) {
                        // map leading char to colors (same palette as main view)
                        const leadColors: {[key: string]: string} = {
                            '-': 'rgb(218, 143, 143)',
                            '0': 'rgb(143, 187, 218)',
                            '1': 'rgb(255, 191, 135)',
                            '2': 'rgb(150, 208, 150)',
                            '3': 'rgb(235, 147, 148)',
                            '4': 'rgb(202, 179, 222)',
                            '5': 'rgb(198, 171, 165)',
                            '6': 'rgb(241, 187, 225)',
                            '7': 'rgb(191, 191, 191)',
                            '8': 'rgb(222, 222, 145)',
                            '9': 'rgb(139, 223, 231)'
                        };
                        // compute centroid in screen space
                        let sx=0, sy=0, sc=0;
                        for (const p of (geom.pts || [])) { const tp = transPt(S, p); sx += tp.x; sy += tp.y; sc++; }
                        const centroid = sc ? { x: sx/sc, y: sy/sc } : { x:0, y:0 };
                        const pts = geom.pts || [];
                        const n = pts.length;
                        const k = labList.length;
                        const step = Math.max(1, Math.floor(n / k));
                        const thumbSize = thumbHeight; // Use thumbHeight for vertical scaling of font and inset
                        const fontPx = Math.max(1, Math.floor(35 * (thumbSize / maxThumbWidth))); // scale font with thumbSize
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.lineWidth = 2;
                        for (let j = 0; j < k; ++j) {
                            const lab = labList[j] || '';
                            const major = parseInt(lab.replace('-', '').charAt(0));
                            const sub = parseInt(lab.replace('-', '').substring(2,3));

                            
                            
                            if (state.selectedJoinerEdges.has(major) && sub === 0) {
                                const idxA = (j * step) % n;
                                const idxB = (idxA + 1) % n;
                                const a = transPt(S, pts[idxA]);
                                const b = transPt(S, pts[idxB]);
                                const mx = (a.x + b.x)/2; const my = (a.y + b.y)/2;
                                const lead = lab && lab.length ? lab.charAt(0) : '';
                                const col = leadColors.hasOwnProperty(lead) ? leadColors[lead] : 'black';
                                ctx.fillStyle = col;
                                ctx.beginPath();
                                ctx.arc(mx, my, 4, 0, 2 * Math.PI);
                                ctx.fill();
                            } 
                            if (state.selectedMajorEdges.has(major)) {

                                const idxA = (j * step) % n;
                                const idxB = (idxA + 1) % n;
                                const a = transPt(S, pts[idxA]);
                                const b = transPt(S, pts[idxB]);
                                const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
                                // edge normal
                                let ex = b.x - a.x; let ey = b.y - a.y;
                                let nx = -ey; let ny = ex;
                                // ensure normal points inward
                                const dot = nx * (centroid.x - mx) + ny * (centroid.y - my);
                                if (dot < 0) { nx = -nx; ny = -ny; }
                                const nmag = Math.sqrt(nx * nx + ny * ny) || 1;
                                const inset = Math.max(4, Math.floor(6 * (thumbSize / maxThumbWidth)));
                                const px = mx + (nx / nmag) * inset;
                                const py = my + (ny / nmag) * inset;
                            
                                const lead = lab && lab.length ? lab.charAt(0) : '';
                                const col = leadColors.hasOwnProperty(lead) ? leadColors[lead] : 'black';
                                // draw outline then fill
                                ctx.strokeStyle = 'black';
                                ctx.fillStyle = col;
                                ctx.font = `${fontPx}px sans-serif`;
                                ctx.strokeText(lab, px, py);
                                ctx.fillText(lab, px, py);
                            }
                        }
                    }
                }
            } catch(e) { /* non-fatal for thumbnails */ }
        }

        // Create a thumbnail-friendly deep snapshot of `sys` where each geom
        // is turned into plain objects (pts, label) or geoms arrays so the
        // 2D canvas renderer never touches live Shape/Meta instances.
        function clonePt(p: p5.Vector) { return { x: p.x, y: p.y }; }
        function clonePtsArray(pts: p5.Vector[]) { return pts.map(p => clonePt(p)); }

        function cloneGeom(geom: any): any {
            if (!geom) return null;
            // Meta-like composite
            if (geom.geoms && Array.isArray(geom.geoms)) {
                const out: { [key: string]: any } = { geoms: [], quad: geom.quad ? clonePtsArray(geom.quad) : undefined };
                for (const child of geom.geoms) {
                    if (out.geoms) {
                        out.geoms.push({ geom: cloneGeom(child.geom), xform: child.xform.slice() });
                    }
                }
                return out;
            }
            // shape-like (Shape or CurvyShape) - copy pts and label
            return { pts: clonePtsArray(geom.pts || []), label: geom.label, quad: geom.quad ? clonePtsArray(geom.quad) : undefined };
        }

        // Collect all world-space points for a snapshot geom under transform T
        function collectPoints(geom: any, T: number[], out: p5.Vector[]) {
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
                out.push(tp);
            }
        }

        function makePaletteSnapshot(src: any) {
            const out: { [key: string]: any } = {};
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
        const activeStroke: { label: string | null, points: p5.Vector[] | null, canvas: HTMLCanvasElement | null } = { label: null, points: null, canvas: null };

        function makeThumbnail(label: string) {
            const holder = p.createDiv('');
            holder.parent(paletteDiv);
            holder.style('position', 'relative');

            const el = p.createElement('canvas');
            el.attribute('width', thumbWidth.toString());
            el.attribute('height', thumbHeight.toString());
            el.parent(holder);

            const slider = p.createSlider(0, 0, 0, 1) as any;
            slider.parent(holder);
            slider.style('position', 'absolute');
            slider.style('bottom', '0px');
            slider.style('left', '0px');
            slider.style('width', '100%');
            slider.style('visibility', 'hidden'); // Use visibility instead of display
            slider.id(`slider-${label}`);
            slider.input(() => {
                renderThumb();
                state.isCircuitAnalysisDirty = true;
                p.loop(); // Redraw main canvas
            });

            // Prevent mouse events on the slider from dragging the main canvas
            (slider.elt as HTMLElement).addEventListener('pointerdown', (ev) => ev.stopPropagation());
            (slider.elt as HTMLElement).addEventListener('pointermove', (ev) => ev.stopPropagation());

            const clearButton = p.createButton('X');
            clearButton.parent(holder);
            clearButton.style('position', 'absolute');
            clearButton.style('top', '0px');
            clearButton.style('right', '0px');
            clearButton.style('width', '20px');
            clearButton.style('height', '20px');
            clearButton.style('padding', '0');
            clearButton.style('border', 'none');
            clearButton.style('background', 'rgba(255, 0, 0, 0.5)');
            clearButton.style('color', 'white');
            clearButton.style('cursor', 'pointer');
            clearButton.mousePressed(() => {
                overlays[label] = [];
                renderThumb();
                p.loop();
            });

            (el.elt as any).style.border = '1px solid #888';
            (el.elt as any).style.cursor = 'crosshair';
            // ensure the canvas fills the grid cell exactly
            (el.elt as any).style.margin = '0';
            (el.elt as any).style.boxSizing = 'border-box';
            (el.elt as any).style.width = thumbWidth + 'px';
            (el.elt as any).style.height = thumbHeight + 'px';
            const ctx = (el.elt as any).getContext('2d');

            // --- Dynamic Thumbnail Transform Calculation ---
            let S_thumb: number[];

            const shapeGeom = (palette_sys && palette_sys[label]) ? palette_sys[label] : null;
            if (shapeGeom) {
                // Collect all points to calculate the bounding box
                const allPoints: p5.Vector[] = [];
                collectPoints(shapeGeom, ident, allPoints);

                if (allPoints.length > 0) {
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    for (const p of allPoints) {
                        if (p.x < minX) minX = p.x;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.y > maxY) maxY = p.y;
                    }

                    const shapeWidth = maxX - minX;
                    const shapeHeight = maxY - minY;
                    const shapeCenterX = (minX + maxX) / 2;
                    const shapeCenterY = (minY + maxY) / 2;

                    // Determine scale to fit shape within thumbnail, with padding
                    const padding = 0.9; // Use 90% of the space
                    const scaleX = (thumbWidth * padding) / shapeWidth;
                    const scaleY = (thumbHeight * padding) / shapeHeight;
                    const scale = Math.min(scaleX, scaleY);

                    // Create transformation matrix
                    const toCenter = ttrans(-shapeCenterX, -shapeCenterY);
                    const scaler = [scale, 0, 0, 0, -scale, 0]; // Flip Y-axis
                    const place = ttrans(thumbWidth / 2, thumbHeight / 2);
                    
                    const pad = ttrans(0, (thumbHeight * (1 - padding)));
                    S_thumb =  mul( pad,mul(place, mul(scaler,  toCenter)));

                } else {
                    // Fallback for shapes with no points
                    S_thumb = [thumbScale, 0, thumbWidth / 2, 0, -thumbScale, thumbHeight / 2];
                }
            } else {
                // Fallback for missing geometry
                S_thumb = [thumbScale, 0, thumbWidth / 2, 0, -thumbScale, thumbHeight / 2];
            }
            
            const S_thumb_adjusted = mul(S_thumb, adjust_mat);


            function renderThumb() {
                ctx.clearRect(0, 0, thumbWidth, thumbHeight);
                // Use only the persistent palette snapshot. If a label is missing
                // from the snapshot, render nothing (do not fall back to live sys).
                const source = (palette_sys && palette_sys[label]) ? palette_sys[label] : null;
                drawGeomToContext(ctx, source, S_thumb);

                const midpoints = getEdgeDotMidpoints(label, state.selectedJoinerEdges);
                if (midpoints.length > 1 && midpoints.length % 2 === 0) {
                    const matchings = findPerfectMatchings(midpoints.map(m => ({ x: m.x, y: m.y })));
                    if (matchings.length > 1) {
                        slider.style('visibility', 'visible');
                        slider.elt.max = (matchings.length - 1).toString();
                    } else {
                        slider.style('visibility', 'hidden');
                    }
                } else {
                    slider.style('visibility', 'hidden');
                }
            }

            // events for drawing
            (el.elt as any).addEventListener('pointerdown', function (ev: PointerEvent) {
                ev.preventDefault();
                ev.stopPropagation();
                const rect = (el.elt as any).getBoundingClientRect();
                const x = ev.clientX - rect.left;
                const y = ev.clientY - rect.top;
                // convert to tile-local coords
                const invS = inv(S_thumb_adjusted);
                const local = transPt(invS, pt(x, y));
                activeStroke.label = label;
                activeStroke.points = [local];
                activeStroke.canvas = el.elt;
                // ensure overlay array exists
                if (!overlays[label]) overlays[label] = [];
                // draw feedback
                renderThumb();
                ctx.beginPath(); ctx.moveTo(x, y);
            });

            (el.elt as any).addEventListener('pointermove', function (ev: PointerEvent) {
                if (!activeStroke.points || activeStroke.canvas !== el.elt) return;
                ev.preventDefault();
                const rect = (el.elt as any).getBoundingClientRect();
                const x = ev.clientX - rect.left;
                const y = ev.clientY - rect.top;
                const invS = inv(S_thumb_adjusted);
                const local = transPt(invS, pt(x, y));
                activeStroke.points.push(local);
                // immediate feedback on thumb
                renderThumb();
                ctx.beginPath();
                for (let i = 0; i < activeStroke.points.length; ++i) {
                    const p = transPt(S_thumb_adjusted, activeStroke.points[i]);
                    if (i == 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                }
                ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.stroke();
            });

            window.addEventListener('pointerup', function () {
                if (activeStroke.points && activeStroke.label === label && activeStroke.canvas === el.elt) {
                    overlays[label].push(activeStroke.points);
                    activeStroke.points = null;
                    activeStroke.canvas = null;
                    // trigger main redraw
                    p.loop();
                }
            });

            // initial render
            renderThumb();
            miniCanvases[label] = { el: el.elt, ctx: ctx, S_thumb };
        }

        function refreshThumbnails() {
            // ensure colmap reflects selector (and custom_colors)
            const s = colscheme_sel ? colscheme_sel.value() : 'Bright';
            if (s === 'Custom') {
                let cm: { [key: string]: number[] } = {};
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
                mc.ctx.clearRect(0, 0, thumbWidth, thumbHeight);
                // draw from persistent snapshot only
                drawGeomToContext(mc.ctx, (palette_sys && palette_sys[name]) ? palette_sys[name] : null, mc.S_thumb);
            }
        }

        // create customDiv (moved here so reposition can reference thumbSize)
        customDiv = p.createDiv('');
        customDiv.style('position', 'absolute');
        customDiv.style('padding', '6px');
        customDiv.style('background', 'rgba(255,255,255,0.9)');
        
        function calculateAndApplyLayout() {
            const leftPanelWidth = 150; // Width of the left control panel
            const gap = 8;
            const cols = 5;

            // Calculate available width for the palette
            const availableWidth = p.windowWidth - leftPanelWidth - (gap * (cols + 1));
            
            // Calculate new thumbnail width, constrained to a max size
            
            const newThumbWidth = Math.max(32, Math.min(maxThumbWidth, availableWidth / cols));

            // Update global sizing variables if they have changed
            if (newThumbWidth !== thumbWidth) {
                const aspectRatio = 45 / 64;
                thumbWidth = newThumbWidth;
                thumbHeight = thumbWidth * aspectRatio;
                thumbScale = thumbWidth / 4.5; // Maintain approximate scale ratio

                // Rebuild all thumbnails with the new dimensions
                rebuildThumbnails();
            }

            // Position the palette and custom color picker
            const totalWidth = (thumbWidth * cols) + (gap * (cols - 1));
            const left = leftPanelWidth + gap;
            paletteDiv.position(left, 5);
            paletteDiv.style('width', `${totalWidth}px`);
            paletteDiv.style('grid-template-columns', `repeat(${cols}, 1fr)`);
            paletteDiv.style('grid-auto-rows', `${thumbHeight}px`);
            
            customDiv.position(left, 5 + (thumbHeight * 2) + 16);
            customDiv.style('z-index', '1000');
        }

        calculateAndApplyLayout();

        lab = p.createSpan('Colours');
        lab.position(10, 150);
        lab.size(125, 15);

        colscheme_sel = p.createSelect() as any;
        colscheme_sel.position(10, 170);
        colscheme_sel.size(125, 25);
        colscheme_sel.option('Pride');
        colscheme_sel.option('Mystics');
        colscheme_sel.option('Figure 5.3');
        colscheme_sel.option('Custom');
        colscheme_sel.option('Bright');
        colscheme_sel.value('Bright');
        // changed handler will be assigned after the colour pickers are created
        // ensure UI reflects initial scheme: trigger change after handler assignment

        // --- Custom colour pickers area (below thumbnails)
        // container div created earlier (customDiv) — styles/position handled by repositionPalette()

        // Map of custom colours is defined at module scope

        // create one colour input per tile and label
        function makeColorPicker(name: string) {
            const holder = p.createDiv('');
            holder.parent(customDiv);
            holder.style('display', 'inline-block');
            holder.style('margin', '4px');
            const lab = p.createSpan(name);
            lab.parent(holder);
            lab.style('display', 'block');
            lab.style('font-size', '11px');
            const inp = p.createInput(custom_colors[name] || '#ffffff', 'color') as any;
            inp.parent(holder);
            inp.input(() => {
                // when user edits a picker, switch the scheme to Custom and redraw
                custom_colors[name] = inp.value() as string;
                if (colscheme_sel.value() !== 'Custom') {
                    colscheme_sel.value('Custom');
                }
                p.loop();
                refreshThumbnails();
            });
            return inp;
        }

        // Store pickers if needed later
        const color_pickers: { [key: string]: p5.Element } = {};
        for (let name of tile_names.concat(['Gamma1', 'Gamma2'])) {
            color_pickers[name] = makeColorPicker(name);
        }

        // Now wire the colscheme selector so changing schemes updates the color pickers
        colscheme_sel.changed(() => {
            const s = colscheme_sel.value();
            if (s === 'Custom') {
                // nothing to overwrite, user picks control custom_colors directly
                p.loop();
                return;
            }
            // pick source map
            let src: { [key: string]: number[] };
            if (s == 'Figure 5.3') src = colmap53;
            else if (s == 'Bright') src = colmap_orig;
            else if (s == 'Pride') src = colmap_pride;
            else src = colmap_mystics;
            // update pickers and custom_colors to match the chosen scheme
            for (let k in color_pickers) {
                const rgb = src[k] || [255, 255, 255];
                const hex = rgbArrayToHex(rgb);
                custom_colors[k] = hex;
                // update picker UI value
                try { color_pickers[k].value(hex); } catch (e) { }
            }
            // update active colmap immediately
            colmap = src;
            p.loop();
            refreshThumbnails();
        });

        // Checkbox: show edge labels
        const lbl_check = p.createCheckbox('Show all', false) as any;
        lbl_check.position(10, 210);

        y_pos = 240;

        const majorEdgesLabel = p.createSpan('Major Edges');
        majorEdgesLabel.position(10, y_pos);
        y_pos += 20;

        const edge_types = [
            { value: 0, label: '0' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
            { value: 5, label: '5' },
            { value: 6, label: '6' },
            { value: 7, label: '7 (Mystic)' },
            { value: 8, label: '8' },
        ];

        const majorEdgeCheckboxes: p5.Element[] = [];
        for (const edge_type of edge_types) {
            const checkbox = p.createCheckbox(edge_type.label, false) as any;
            checkbox.position(10, y_pos);
            checkbox.changed(() => {
                if (checkbox.checked()) {
                    state.selectedMajorEdges.add(edge_type.value);
                } else {
                    state.selectedMajorEdges.delete(edge_type.value);
                }
                refreshThumbnails();
                p.loop();
            });
            majorEdgeCheckboxes.push(checkbox);
            y_pos += 20;
        }

        const line = p.createDiv();
        line.position(10, y_pos);
        line.style('border-bottom', '1px solid black');
        line.style('width', '125px');
        y_pos += 10;

        const joinerEdgesLabel = p.createSpan('Joiner Edges');
        joinerEdgesLabel.position(10, y_pos);
        y_pos += 20;

        const joinerEdgeCheckboxes: p5.Element[] = [];
        for (const edge_type of edge_types) {
            const checkbox = p.createCheckbox(edge_type.label, false) as any;
            checkbox.position(10, y_pos);
            checkbox.changed(() => {
                if (checkbox.checked()) {
                    state.selectedJoinerEdges.add(edge_type.value);
                } else {
                    state.selectedJoinerEdges.delete(edge_type.value);
                }
                updateJoinerEdgesLabel();
                state.isCircuitAnalysisDirty = true;
                refreshThumbnails();
                p.loop();
            });
            joinerEdgeCheckboxes.push(checkbox);
            y_pos += 20;
        }

        lbl_check.changed(() => {
            const isChecked = lbl_check.checked() as boolean;
            majorEdgeCheckboxes.forEach((checkbox: any, index) => {
                checkbox.checked(isChecked);
                if (isChecked) {
                    state.selectedMajorEdges.add(edge_types[index].value);
                } else {
                    state.selectedMajorEdges.clear();
                }
            });
            refreshThumbnails();
            p.loop();
        });

        // Initialize the checkboxes using the default state values to ensure they are in sync.
        const checkboxConfigs: { label: string; key: keyof typeof state.config; refresh: boolean; reanalyze?: boolean }[] = [
            { label: 'Show Outlines', key: 'showOutlines', refresh: true },
            { label: 'Show Backgrounds', key: 'showBackgrounds', refresh: true },
            { label: 'Show Lines', key: 'showLines', refresh: true },
            { label: 'Show IDs', key: 'showIds', refresh: false },
            { label: 'Show Quads', key: 'showQuads', refresh: false },
            { label: 'Show Edge Dots', key: 'showEdgeDots', refresh: false },
            { label: 'Rainbow Lines', key: 'rainbowLines', refresh: false, reanalyze: true },
        ];

        for (const config of checkboxConfigs) {
            const checkbox = p.createCheckbox(config.label, state.config[config.key]) as any;
            checkbox.position(10, y_pos);
            checkbox.changed(() => {
                state.config[config.key] = checkbox.checked();
                if (config.refresh) {
                    refreshThumbnails();
                }
                if (config.reanalyze) {
                    state.isCircuitAnalysisDirty = true;
                }
                p.loop();
            });
            y_pos += 20;
        }

        
        y_pos += 20;


        function updateJoinerEdgesLabel() {
            let allEven = true;
            for (const name of miniNames) {
                const count = getEdgeDotCount(name, state.selectedJoinerEdges);
                if (count % 2 !== 0) {
                    allEven = false;
                    break;
                }
            }
            joinerEdgesLabel.html(`Joiner Edges ${allEven ? '&#9989;' : '&#10060;'}`);
        }
        // Pan/zoom controls removed: drag to pan and scroll to zoom

        let save_button = p.createButton("Save PNG");
        save_button.position(10, y_pos);
        save_button.size(125, 25);
        save_button.mousePressed(() => {
            uibox = false;
            p.draw();
            p.save("output.png");
            uibox = true;
            p.draw();
        });
        y_pos += 30;

        let svg_button = p.createButton("Save SVG");
        svg_button.position(10, y_pos);
        svg_button.size(125, 25);
        svg_button.mousePressed(() => {
            const stream: string[] = [];
            stream.push(`<svg viewBox="0 0 ${p.width} ${p.height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
            stream.push(`<g transform="translate(${p.width / 2},${p.height / 2})">`);

            sys[tile_sel.value() as string].streamSVG(to_screen, stream, ident);

            stream.push('</g>');
            stream.push('</svg>');

            p.saveStrings(stream, 'output', 'svg');
        });
    };

    p.draw = () => {
        p.background(255);

        // Analyze circuits and get color map before drawing, only if needed
        if (state.isCircuitAnalysisDirty) {
            const startTime = p.millis();
            const tile = sys[tile_sel.value() as string];
            const result = analyzeAndColor(tile, p);
            (window as any).circuitColorMap = result.colorMap;
            state.circuitStats = result.stats;
            const endTime = p.millis();
            state.analysisTime = endTime - startTime;
            state.tileCount = tile.count();
            state.timePerTile = state.analysisTime / state.tileCount;
            state.isCircuitAnalysisDirty = false; // Reset the flag
        }

        p.push();
        p.translate(p.width / 2, p.height / 2);

        p.applyMatrix(
            to_screen[0], to_screen[3],
            to_screen[1], to_screen[4],
            to_screen[2], to_screen[5]);

        const s = colscheme_sel.value();
        if (s == 'Figure 5.3') {
            colmap = colmap53;
        } else if (s == 'Bright') {
            colmap = colmap_orig;
        } else if (s == 'Pride') {
            colmap = colmap_pride;
        } else {
            colmap = colmap_mystics;
        }

        // If Custom, convert hex pickers to rgb arrays for colmap lookup
        if (s == 'Custom') {
            // build a lightweight mapping of rgb arrays keyed by tile name
            let cm: { [key: string]: number[] } = {};
            for (let k in custom_colors) {
                const hex = custom_colors[k];
                // strip '#'
                const h = hex.replace('#', '');
                const r = parseInt(h.substring(0, 2), 16);
                const g = parseInt(h.substring(2, 4), 16);
                const b = parseInt(h.substring(4, 6), 16);
                cm[k] = [r, g, b];
            }
            colmap = cm;
        }
        state.colmap = colmap;

        // draw the currently selected tile only
        sys[tile_sel.value() as string].draw(ident);

        p.pop();

        if (uibox) {
            p.stroke(0);
            p.strokeWeight(0.5);
            p.fill(255, 220);
            p.rect(5, 5, 135, y_pos + 5);
        }

        // Display stats (Bottom Left)
        p.fill(0);
        p.noStroke();
        p.textAlign(p.LEFT, p.BOTTOM);
        p.text(`Analysis Time: ${state.analysisTime.toFixed(2)} ms`, 10, p.height - 30);
        p.text(`Time Per Tile: ${state.timePerTile.toFixed(4)} ms`, 10, p.height - 10);

        // Display circuit stats (Bottom Right, two columns)
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(12);
        
        const rightMargin = 20;
        const colWidth = 60;
        const startX = p.width - (colWidth * 2) - rightMargin;

        const sortedCircuitLens = Array.from(state.circuitStats.circuits.keys()).sort((a,b) => a-b);
        const sortedLineLens = Array.from(state.circuitStats.lines.keys()).sort((a,b) => a-b);

        // Calculate total height to position from bottom
        let totalHeight = 20 + 20; // Header + "Circuits" label
        if (sortedCircuitLens.length === 0) totalHeight += 20;
        else totalHeight += sortedCircuitLens.length * 16;
        
        totalHeight += 10 + 20; // Gap + "Lines" label
        if (sortedLineLens.length === 0) totalHeight += 20;
        else totalHeight += sortedLineLens.length * 16;

        let statY = p.height - totalHeight - 10;

        // Header
        p.fill(0);
        p.text("Len", startX, statY);
        p.text("Count", startX + colWidth, statY);
        statY += 20;

        // Circuits
        p.fill(0);
        p.text("Circuits", startX, statY);
        statY += 20;

        if (sortedCircuitLens.length === 0) {
            p.fill(100);
            p.text("-", startX, statY);
            p.text("-", startX + colWidth, statY);
            statY += 20;
        } else {
            for (const len of sortedCircuitLens) {
                const colorStr = state.circuitStats.circuitColors.get(len) || '#000';
                p.fill(colorStr);
                p.text(len.toString(), startX, statY);
                p.text(state.circuitStats.circuits.get(len)!.toString(), startX + colWidth, statY);
                statY += 16;
            }
        }

        statY += 10; // Gap

        // Lines
        p.fill(0);
        p.text("Lines", startX, statY);
        statY += 20;

        if (sortedLineLens.length === 0) {
            p.fill(100);
            p.text("-", startX, statY);
            p.text("-", startX + colWidth, statY);
            statY += 20;
        } else {
            p.fill('#808080'); // Grey for lines
            for (const len of sortedLineLens) {
                p.text(len.toString(), startX, statY);
                p.text(state.circuitStats.lines.get(len)!.toString(), startX + colWidth, statY);
                statY += 16;
            }
        }

        p.noLoop();
    };

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        calculateAndApplyLayout();
    };

    p.mousePressed = () => {
        dragging = true;
        p.loop();
    };

    p.mouseDragged = () => {
        if (dragging) {
            // always pan by mouse drag
            to_screen = mul(ttrans(p.mouseX - p.pmouseX, p.mouseY - p.pmouseY), to_screen);
            p.loop();
            return false;
        }
        return;
    };

    // Zoom with mouse wheel about cursor
    p.mouseWheel = (event: any) => {
        // deltaY > 0 => scroll down => zoom out
        const factor = event.deltaY > 0 ? 0.95 : 1.05;
        // compute world coords of mouse
        const world = transPt(inv(to_screen), pt(p.mouseX - p.width / 2, p.mouseY - p.height / 2));
        // scale about world point
        to_screen = mul(
            mul(ttrans(world.x, world.y), [factor, 0, 0, 0, factor, 0]),
            mul(ttrans(-world.x, -world.y), to_screen)
        );
        p.loop();
        // prevent page scroll
        return false;
    };

    p.mouseReleased = () => {
        dragging = false;
        p.loop();
    };

    // --- Touch Events for Mobile Pinch-to-Zoom ---

    p.touchStarted = () => {
        if (p.touches.length === 2) {
            prevPinchDist = p.dist(
                (p.touches[0] as any).x, (p.touches[0] as any).y,
                (p.touches[1] as any).x, (p.touches[1] as any).y
            );
            // Prevent default browser actions
            return false;
        }
        return;
    };

    p.touchMoved = () => {
        // Handle pinch-to-zoom
        if (p.touches.length === 2 && prevPinchDist > 0) {
            const currentPinchDist = p.dist(
                (p.touches[0] as any).x, (p.touches[0] as any).y,
                (p.touches[1] as any).x, (p.touches[1] as any).y
            );

            const zoomFactor = currentPinchDist / prevPinchDist;

            // Get the midpoint of the pinch gesture
            const midX = ((p.touches[0] as any).x + (p.touches[1] as any).x) / 2;
            const midY = ((p.touches[0] as any).y + (p.touches[1] as any).y) / 2;

            // Use the same logic as mouseWheel for zooming
            const world = transPt(inv(to_screen), pt(midX - p.width / 2, midY - p.height / 2));
            to_screen = mul(
                mul(ttrans(world.x, world.y), [zoomFactor, 0, 0, 0, zoomFactor, 0]),
                mul(ttrans(-world.x, -world.y), to_screen)
            );

            prevPinchDist = currentPinchDist; // Update for next frame
            p.loop();
            // Prevent default browser actions (like scrolling)
            return false;
        }
        return;
    };

    p.touchEnded = () => {
        // Reset pinch distance when fingers are lifted
        prevPinchDist = 0;
        return;
    };
};

new p5(sketch);
