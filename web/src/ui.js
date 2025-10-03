"use strict";
// // import * as p5 from 'p5';
// // import { AppState } from './state';
// // import { tile_names } from './config';
// import { mul, transPt, adjust_mat } from './utils';
// export function drawGeomToContext(ctx: CanvasRenderingContext2D, geom: any, S: number[], overrideLabel?: string) {
//             S = mul(S, adjust_mat);
//             if (!geom) return; // guard against missing sys[label]
//             if (geom.geoms && Array.isArray(geom.geoms)) {
//                 for (let g of geom.geoms) {
//                     if (g && g.geom) drawGeomToContext(ctx, g.geom, mul(S, g.xform), overrideLabel);
//                 }
//                 return;
//             }
//             // shape-like
//             ctx.beginPath();
//             for (let i = 0; i < (geom.pts ? geom.pts.length : 0); ++i) {
//                 const pt = geom.pts[i];
//                 const tp = transPt(S, pt);
//                 if (i == 0) ctx.moveTo(tp.x, tp.y); else ctx.lineTo(tp.x, tp.y);
//             }
//             ctx.closePath();
//             const labelForFill = overrideLabel || geom.label;
//             const col = colmap[labelForFill] || [200, 200, 200];
//             if ((window as any).showBackgrounds) {
//                 ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
//                 ctx.fill();
//             }
//             if ((window as any).showOutlines) {
//                 ctx.strokeStyle = 'black';
//                 ctx.lineWidth = 1;
//                 ctx.stroke();
//             }
//             // draw overlays if present
//             const overlayKey = overrideLabel || geom.label;
//             if (typeof overlays !== 'undefined' && overlays[overlayKey] && (window as any).showLines) {
//                 ctx.strokeStyle = 'black';
//                 ctx.lineWidth = 2;
//                 for (let stroke of overlays[overlayKey]) {
//                     ctx.beginPath();
//                     for (let j = 0; j < stroke.length; ++j) {
//                         const sp = transPt(S, stroke[j]);
//                         if (j == 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
//                     }
//                     ctx.stroke();
//                 }
//             }
//             // draw edge labels on thumbnails when requested
//             try {
//                 if ((window as any).selectedMajorEdges && (window as any).selectedMajorEdges.size > 0 && unique_edge_labels) {
//                     const labList = unique_edge_labels[labelForFill];
//                     if (labList && labList.length) {
//                         // map leading char to colors (same palette as main view)
//                         const leadColors: {[key: string]: string} = {
//                             '-': 'rgb(180,30,30)', '0': 'rgb(31,119,180)', '1': 'rgb(255,127,14)',
//                             '2': 'rgb(44,160,44)', '3': 'rgb(214,39,40)', '4': 'rgb(148,103,189)',
//                             '5': 'rgb(140,86,75)', '6': 'rgb(227,119,194)', '7': 'rgb(127,127,127)',
//                             '8': 'rgb(188,189,34)', '9': 'rgb(23,190,207)'
//                         };
//                         // compute centroid in screen space
//                         let sx=0, sy=0, sc=0;
//                         for (const p of (geom.pts || [])) { const tp = transPt(S, p); sx += tp.x; sy += tp.y; sc++; }
//                         const centroid = sc ? { x: sx/sc, y: sy/sc } : { x:0, y:0 };
//                         const pts = geom.pts || [];
//                         const n = pts.length;
//                         const k = labList.length;
//                         const step = Math.max(1, Math.floor(n / k));
//                         const thumbSize = thumbHeight; // Use thumbHeight for vertical scaling of font and inset
//                         const fontPx = Math.max(8, Math.floor(10 * (thumbSize / 192))); // scale font with thumbSize
//                         ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
//                         ctx.lineWidth = 2;
//                         for (let j = 0; j < k; ++j) {
//                             const lab = labList[j] || '';
//                             const major = parseInt(lab.replace('-', '').charAt(0));
//                             if (!(window as any).selectedMajorEdges.has(major)) {
//                                 continue;
//                             }
//                             const idxA = (j * step) % n;
//                             const idxB = (idxA + 1) % n;
//                             const a = transPt(S, pts[idxA]);
//                             const b = transPt(S, pts[idxB]);
//                             const mx = (a.x + b.x)/2; const my = (a.y + b.y)/2;
//                             // edge normal
//                             let ex = b.x - a.x; let ey = b.y - a.y;
//                             let nx = -ey; let ny = ex;
//                             // ensure normal points inward
//                             const dot = nx * (centroid.x - mx) + ny * (centroid.y - my);
//                             if (dot < 0) { nx = -nx; ny = -ny; }
//                             const nmag = Math.sqrt(nx*nx + ny*ny) || 1;
//                             const inset = Math.max(4, Math.floor(6 * (thumbSize / 192)));
//                             const px = mx + (nx / nmag) * inset;
//                             const py = my + (ny / nmag) * inset;
//                             const lead = lab && lab.length ? lab.charAt(0) : '';
//                             const col = leadColors.hasOwnProperty(lead) ? leadColors[lead] : 'black';
//                             // draw outline then fill
//                             ctx.strokeStyle = 'black';
//                             ctx.fillStyle = col;
//                             ctx.font = `${fontPx}px sans-serif`;
//                             ctx.strokeText(lab, px, py);
//                             ctx.fillText(lab, px, py);
//                         }
//                     }
//                 }
//             } catch(e) { /* non-fatal for thumbnails */ }
//         }
// // declare let p: p5;
// // export function setupUI(p: p5, state: AppState, refreshCallback: () => void) {
// //     const controlPanel = p.createDiv('');
// //     controlPanel.position(10, 10);
// //     controlPanel.style('background-color', 'rgba(255, 255, 255, 0.8)');
// //     controlPanel.style('padding', '10px');
// //     controlPanel.style('border-radius', '5px');
// //     let lab = p.createSpan('Shapes');
// //     lab.parent(controlPanel);
// //     const shape_sel = p.createSelect();
// //     shape_sel.parent(controlPanel);
// //     shape_sel.option('Tile(1,1)');
// //     shape_sel.option('Spectres');
// //     shape_sel.option('Hexagons');
// //     shape_sel.option('Turtles in Hats');
// //     shape_sel.option('Hats in Turtles');
// //     shape_sel.changed(() => {
// //         state.shape = shape_sel.value() as string;
// //         refreshCallback();
// //     });
// //     const subst_button = p.createButton("Build Supertiles");
// //     subst_button.parent(controlPanel);
// //     subst_button.mousePressed(() => {
// //         // This will be handled in sketch.ts
// //     });
// //     let lab2 = p.createSpan('Category');
// //     lab2.parent(controlPanel);
// //     const tile_sel = p.createSelect();
// //     tile_sel.parent(controlPanel);
// //     for (let name of tile_names) {
// //         tile_sel.option(name);
// //     }
// //     tile_sel.value(state.tile);
// //     tile_sel.changed(() => {
// //         state.tile = tile_sel.value() as string;
// //         refreshCallback();
// //     });
// //     let lab3 = p.createSpan('Colours');
// //     lab3.parent(controlPanel);
// //     const colscheme_sel = p.createSelect();
// //     colscheme_sel.parent(controlPanel);
// //     colscheme_sel.option('Pride');
// //     colscheme_sel.option('Mystics');
// //     colscheme_sel.option('Figure 5.3');
// //     colscheme_sel.option('Custom');
// //     colscheme_sel.option('Bright');
// //     colscheme_sel.value(state.colorScheme);
// //     colscheme_sel.changed(() => {
// //         state.colorScheme = colscheme_sel.value() as string;
// //         refreshCallback();
// //     });
// //     const showOutlinesCheck = p.createCheckbox('Show Outlines', state.showOutlines);
// //     showOutlinesCheck.parent(controlPanel);
// //     showOutlinesCheck.changed(() => {
// //         state.showOutlines = showOutlinesCheck.checked() as boolean;
// //         refreshCallback();
// //     });
// //     const showBackgroundsCheck = p.createCheckbox('Show Backgrounds', state.showBackgrounds);
// //     showBackgroundsCheck.parent(controlPanel);
// //     showBackgroundsCheck.changed(() => {
// //         state.showBackgrounds = showBackgroundsCheck.checked() as boolean;
// //         refreshCallback();
// //     });
// //     const showLinesCheck = p.createCheckbox('Show Lines', state.showLines);
// //     showLinesCheck.parent(controlPanel);
// //     showLinesCheck.changed(() => {
// //         state.showLines = showLinesCheck.checked() as boolean;
// //         refreshCallback();
// //     });
// //     const showEdgeLabelsCheck = p.createCheckbox('Show Edge Labels', state.showEdgeLabels);
// //     showEdgeLabelsCheck.parent(controlPanel);
// //     showEdgeLabelsCheck.changed(() => {
// //         state.showEdgeLabels = showEdgeLabelsCheck.checked() as boolean;
// //         refreshCallback();
// //     });
// //     const showEdgeJoinerCheck = p.createCheckbox('Show Edge Joiner', state.showEdgeJoiner);
// //     showEdgeJoinerCheck.parent(controlPanel);
// //     showEdgeJoinerCheck.changed(() => {
// //         state.showEdgeJoiner = showEdgeJoinerCheck.checked() as boolean;
// //         refreshCallback();
// //     });
// //     const save_button = p.createButton("Save PNG");
// //     save_button.parent(controlPanel);
// //     save_button.mousePressed(() => {
// //         // This will be handled in sketch.ts
// //     });
// //     const svg_button = p.createButton("Save SVG");
// //     svg_button.parent(controlPanel);
// //     svg_button.mousePressed(() => {
// //         // This will be handled in sketch.ts
// //     });
// //     const edgePanel = p.createDiv('');
// //     edgePanel.position(150, 10);
// //     edgePanel.style('background-color', 'rgba(255, 255, 255, 0.8)');
// //     edgePanel.style('padding', '10px');
// //     edgePanel.style('border-radius', '5px');
// //     const majorEdgesLabel = p.createSpan('Major Edges');
// //     majorEdgesLabel.parent(edgePanel);
// //     p.createElement('br').parent(edgePanel);
// //     const edge_types = [
// //         { value: 0, label: '0' },
// //         { value: 1, label: '1' },
// //         { value: 2, label: '2' },
// //         { value: 3, label: '3' },
// //         { value: 4, label: '4' },
// //         { value: 5, label: '5' },
// //         { value: 6, label: '6' },
// //         { value: 7, label: '7 (Mystic)' },
// //         { value: 8, label: '8' },
// //     ];
// //     for (const edge_type of edge_types) {
// //         const checkbox = p.createCheckbox(edge_type.label, false);
// //         checkbox.parent(edgePanel);
// //         checkbox.changed(() => {
// //             if (checkbox.checked()) {
// //                 state.selectedMajorEdges.add(edge_type.value);
// //             } else {
// //                 state.selectedMajorEdges.delete(edge_type.value);
// //             }
// //             refreshCallback();
// //         });
// //         p.createElement('br').parent(edgePanel);
// //     }
// // }
