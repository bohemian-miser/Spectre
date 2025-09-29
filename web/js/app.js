// js/app.js

// Global variables
let sys, palette_sys;
let to_screen = [20, 0, 0, 0, -20, 0];
let dragging = false;
let tile_canvases = {};
let drawn_lines = {};
let drawing_mode = 'Free Draw';
let line_start_point = null;
let show_edge_labels = false;

const all_tile_names = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Gamma1', 'Gamma2'];
const tile_names = all_tile_names.slice(0, 9);

// Color maps
const colmap_orig = {
    'Gamma': [255, 255, 255], 'Gamma1': [255, 255, 255], 'Gamma2': [255, 255, 255],
    'Delta': [220, 220, 220], 'Theta': [255, 191, 191], 'Lambda': [255, 160, 122],
    'Xi': [255, 242, 0], 'Pi': [135, 206, 250], 'Sigma': [245, 245, 220],
    'Phi': [0, 255, 0], 'Psi': [0, 255, 255]
};
let colmap = colmap_orig;
let custom_colors = {};

const unique_edge_labels = {
    'Delta': ['3.0A', '3.1A', '2.0A', '2.1A', '2.2A', '-5.1A', '-5.0A', '1.0A', '1.1A', '1.2A', '-3.1A', '-3.0A', '-6.1A', '-6.0A'],
    'Theta': ['3.0A', '3.1A', '2.0A', '2.1A', '2.2A', '8.0A', '2.0B', '2.1B', '2.2B', '0.0A', '0.1A', '-2.2A', '-2.1A', '-2.0A'],
    'Lambda': ['3.0A', '3.1A', '2.0A', '2.1A', '2.2A', '-5.1A', '-5.0A', '1.0A', '1.1A', '1.2A', '-8.0A', '-2.2A', '-2.1A', '-2.0A'],
    'Xi': ['-1.2A', '-1.1A', '-1.0A', '5.0A', '5.1A', '8.0A', '2.0A', '2.1A', '2.2A', '0.0A', '0.1A', '-2.2A', '-2.1A', '-2.0A'],
    'Pi': ['-1.2A', '-1.1A', '-1.0A', '5.0A', '5.1A', '-5.1A', '-5.0A', '1.0A', '1.1A', '1.2A', '-8.0A', '-2.2A', '-2.1A', '-2.0A'],
    'Sigma': ['4.2A', '4.3A', '2.0A', '2.1A', '2.2A', '-5.1A', '-5.0A', '1.0A', '1.1A', '1.2A', '-3.1A', '-3.0A', '4.0A', '4.1A'],
    'Phi': ['3.0A', '3.1A', '2.0A', '2.1A', '2.2A', '-5.1A', '-5.0A', '5.0A', '5.1A', '0.0A', '0.1A', '-2.2A', '-2.1A', '-2.0A'],
    'Psi': ['-1.2A', '-1.1A', '-1.0A', '5.0A', '5.1A', '-5.1A', '-5.0A', '5.0B', '5.1B', '0.0A', '0.1A', '-2.2A', '-2.1A', '-2.0A'],
    'Gamma2': ['-7.1A', '-7.0A', '-3.1A', '-3.0A', '6.0A', '6.1A', '-4.3A', '-4.2A', '-4.1A', '-4.0A', '2.0A', '2.1A', '-7.3A', '-7.2A'],
    'Gamma1': ['-1.2A', '-1.1A', '-1.0A', '1.0A', '1.1A', '1.2A', '7.0A', '7.1A', '7.2A', '7.3A', '2.2A', '-2.2A', '-2.1A', '-2.0A'],
};

// Drawing functions
function drawPolygon(shape, T, f, s, w) {
    if (f != null) { fill(...f); } else { noFill(); }
    if (s != null) { stroke(0); strokeWeight(w); } else { noStroke(); }
    beginShape();
    for (let p of shape) { const tp = transPt(T, p); vertex(tp.x, tp.y); }
    endShape(CLOSE);
}
function drawEdgeLabels(tileName, T, p5_instance) {
    const p = p5_instance || this;
    const spectre_pts = palette_sys['Delta'].pts;
    const labels = unique_edge_labels[tileName];
    if (!labels) return;
    for (let i = 0; i < labels.length; i++) {
        const p1 = spectre_pts[i], p2 = spectre_pts[(i + 1) % spectre_pts.length];
        const label_pt = get_inset_point(p1, p2, 0.2);
        const tp = transPt(T, label_pt);
        p.push();
        p.translate(tp.x, tp.y);
        if (!p5_instance) { const current_scale = mag(to_screen[0], to_screen[3]); p.scale(1 / current_scale); }
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(p5_instance ? 10 : 0.2);
        p.fill(labels[i].startsWith('-') ? 'red' : 'blue');
        p.noStroke();
        p.text(labels[i], 0, 0);
        p.pop();
    }
}

// p5.js setup and draw
function setup() {
    const main_canvas = createCanvas(windowWidth, windowHeight);
    main_canvas.parent('main-content');
    sys = buildSpectreBase();
    palette_sys = buildSpectreBase();

    const controlsContainer = select('#controls-container');
    createSpan('Shapes').parent(controlsContainer);
    const shape_sel = createSelect().parent(controlsContainer);
    shape_sel.option('Tile(1,1)');
    shape_sel.option('Spectres');
    shape_sel.changed(() => { sys = (shape_sel.value() === 'Spectres') ? buildSpectreBase(true) : buildSpectreBase(false); loop(); });
    createButton('Build Supertiles').parent(controlsContainer).mousePressed(() => { sys = buildSupertiles(sys); loop(); });
    createSpan('Category').parent(controlsContainer);
    const tile_sel = createSelect().id('tile_sel').parent(controlsContainer);
    for (let name of tile_names) { tile_sel.option(name); }
    tile_sel.value('Delta');
    tile_sel.changed(loop);
    createSpan('Colours').parent(controlsContainer);
    const colscheme_sel = createSelect().id('colscheme_sel').parent(controlsContainer);
    colscheme_sel.option('Custom');
    colscheme_sel.option('Original');
    colscheme_sel.changed(loop);
    createButton('Save PNG').parent(controlsContainer).mousePressed(() => { redraw(); save('output.png'); });
    createButton('Save SVG').parent(controlsContainer).mousePressed(() => { /* SVG save logic */ });

    const drawingControlsContainer = select('#drawing-controls-container');
    createSpan('Drawing Mode:').parent(drawingControlsContainer);
    const drawingModeSelect = createSelect().parent(drawingControlsContainer);
    drawingModeSelect.option('Free Draw');
    drawingModeSelect.option('Line');
    drawingModeSelect.changed(() => { drawing_mode = drawingModeSelect.value(); line_start_point = null; for (const tileName in tile_canvases) { tile_canvases[tileName].redraw(); } });
    const showLabelsCheckbox = createCheckbox('Show Edge Labels', false).parent(drawingControlsContainer);
    showLabelsCheckbox.changed(() => { show_edge_labels = showLabelsCheckbox.checked(); for (const tileName in tile_canvases) { tile_canvases[tileName].redraw(); } loop(); });

    const paletteControls = select('#palette-controls');
    const fillRow = createDiv().addClass('control-row').parent(paletteControls);
    createSpan('Fill:').parent(fillRow);
    for (const tileName of all_tile_names) { makeColorPicker(fillRow, tileName, 'fill'); }
    makeColorPicker(fillRow, 'Update All', 'fill', true);
    const lineRow = createDiv().addClass('control-row').parent(paletteControls);
    createSpan('Line:').parent(lineRow);
    for (const tileName of all_tile_names) { makeColorPicker(lineRow, tileName, 'line'); }
    makeColorPicker(lineRow, 'Update All', 'line', true);
    const clearRow = createDiv().addClass('control-row').parent(paletteControls);
    createSpan('Clear:').parent(clearRow);
    for (const tileName of all_tile_names) {
        const btn = createButton('X').addClass('clear-button').parent(clearRow);
        btn.mousePressed(() => { drawn_lines[tileName] = []; tile_canvases[tileName].redraw(); loop(); });
    }
    const clearAllButton = select('#clear-all-button');
    clearAllButton.mousePressed(() => { for (const tileName in drawn_lines) { drawn_lines[tileName] = []; } for (const tileName in tile_canvases) { tile_canvases[tileName].redraw(); } loop(); });

    const tilePalette = select('#tile-palette');
    for (const tileName of all_tile_names) {
        const tileContainer = createDiv().addClass('tile-canvas-container').parent(tilePalette);
        custom_colors[tileName] = { fill: rgbToHex(colmap_orig[tileName]), line: '#000000' };
        new p5(p => {
            p.setup = function () { p.createCanvas(100, 100); tile_canvases[tileName] = p; drawn_lines[tileName] = []; p.noLoop(); p.redraw(); };
            p.draw = function () {
                p.background(240);
                let tile_to_draw = (tileName === 'Gamma1') ? palette_sys['Gamma'].geoms[0].geom : (tileName === 'Gamma2') ? palette_sys['Gamma'].geoms[1].geom : palette_sys[tileName];
                const com = center_of_mass(tileName === 'Gamma' ? tile_to_draw.geoms.flatMap(g => g.geom.pts) : tile_to_draw.pts);
                const T = mul(ttrans(p.width / 2, p.height / 2), mul([12, 0, 0, 0, -12, 0], ttrans(-com.x, -com.y)));
                const fillColor = custom_colors[tileName].fill;
                const r = parseInt(fillColor.substring(1, 3), 16), g = parseInt(fillColor.substring(3, 5), 16), b = parseInt(fillColor.substring(5, 7), 16);
                p.fill(r, g, b);
                p.stroke(0);
                p.strokeWeight(1);
                if (tileName === 'Gamma') {
                    const mystic = tile_to_draw;
                    for (let g of mystic.geoms) {
                        const shape = g.geom;
                        const transform = mul(T, g.xform);
                        p.beginShape();
                        for (let pt of shape.pts) { const tp = transPt(transform, pt); p.vertex(tp.x, tp.y); }
                        p.endShape(p.CLOSE);
                    }
                } else {
                    const shape = tile_to_draw;
                    if (shape) {
                        p.beginShape();
                        for (let pt of shape.pts) { const tp = transPt(T, pt); p.vertex(tp.x, tp.y); }
                        p.endShape(p.CLOSE);
                    }
                }
                if (show_edge_labels) { drawEdgeLabels(tileName, T, p); }
                let all_lines = drawn_lines[tileName] ? [...drawn_lines[tileName]] : [];
                if (tileName === 'Gamma') { all_lines.push(...(drawn_lines['Gamma1'] || [])); all_lines.push(...(drawn_lines['Gamma2'] || [])); }
                for (const line of all_lines) {
                    p.stroke(line.color);
                    p.strokeWeight(2);
                    p.noFill();
                    p.beginShape();
                    for (const point of line.points) { const tp = transPt(T, point); p.vertex(tp.x, tp.y); }
                    p.endShape();
                }
                if (line_start_point && line_start_point.tile === tileName) {
                    p.stroke(custom_colors[tileName].line);
                    p.strokeWeight(2);
                    p.noFill();
                    const start_tp = transPt(T, line_start_point.point);
                    const mouse_tp = transPt(T, transPt(inv(T), { x: p.mouseX, y: p.mouseY }));
                    p.line(start_tp.x, start_tp.y, mouse_tp.x, mouse_tp.y);
                }
            };
            p.mousePressed = function (event) {
                if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
                    const T = [12, 0, 50, 0, -12, 50];
                    const invT = inv(T);
                    const mouse_pt = transPt(invT, { x: p.mouseX, y: p.mouseY });
                    if (drawing_mode === 'Free Draw') {
                        drawn_lines[tileName].push({ points: [mouse_pt], color: custom_colors[tileName].line });
                    } else if (drawing_mode === 'Line') {
                        if (line_start_point) {
                            drawn_lines[line_start_point.tile].push({ points: [line_start_point.point, mouse_pt], color: custom_colors[line_start_point.tile].line });
                            line_start_point = null;
                        } else {
                            line_start_point = { tile: tileName, point: mouse_pt };
                        }
                    }
                    p.redraw();
                    loop();
                    return false;
                }
            };
            p.mouseDragged = function (event) {
                if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
                    if (drawing_mode === 'Free Draw') {
                        const T = [12, 0, 50, 0, -12, 50];
                        const invT = inv(T);
                        const mouse_pt = transPt(invT, { x: p.mouseX, y: p.mouseY });
                        const current_line = drawn_lines[tileName][drawn_lines[tileName].length - 1];
                        current_line.points.push(mouse_pt);
                        p.redraw();
                        loop();
                    }
                    return false;
                }
            };
            p.mouseMoved = function () { if (drawing_mode === 'Line' && line_start_point) { p.redraw(); } }
            p.mouseReleased = function () { if (drawing_mode === 'Free Draw') { loop(); } };
        }, tileContainer.elt);
    }
}
function draw() {
    background(255);
    push();
    translate(width / 2, height / 2);
    applyMatrix(...to_screen);
    const s = select('#colscheme_sel').value();
    if (s == 'Original') { colmap = colmap_orig; } else {
        colmap = {};
        for (const tileName in custom_colors) {
            const fill_hex = custom_colors[tileName].fill;
            const r = parseInt(fill_hex.substring(1, 3), 16), g = parseInt(fill_hex.substring(3, 5), 16), b = parseInt(fill_hex.substring(5, 7), 16);
            colmap[tileName] = [r, g, b];
            if (tileName === 'Gamma') { colmap['Gamma1'] = [r, g, b]; colmap['Gamma2'] = [r, g, b]; }
        }
    }
    sys[select('#tile_sel').value()].draw(ident);
    pop();
    noLoop();
}
function makeColorPicker(parent, tileName, type, isUpdateAll = false) {
    const container = createDiv().addClass('color-box-container').parent(parent);
    const picker = createInput(type === 'fill' ? rgbToHex(colmap_orig[tileName] || [255, 255, 255]) : '#000000', 'color').addClass('color-box').parent(container);
    if (isUpdateAll) { picker.addClass('update-all'); }
    const tooltip = createSpan(tileName).addClass('tooltip').parent(container);
    picker.input(() => {
        if (isUpdateAll) { for (const name of all_tile_names) { custom_colors[name][type] = picker.value(); } } else { custom_colors[tileName][type] = picker.value(); }
        for (const name in tile_canvases) { tile_canvases[name].redraw(); }
        if (select('#colscheme_sel').value() === 'Custom') { loop(); }
    });
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function mousePressed() { if (mouseX > 170 && mouseX < width - 270) { dragging = true; loop(); } }
function mouseDragged() { if (dragging) { to_screen = mul(ttrans(mouseX - pmouseX, mouseY - pmouseY), to_screen); loop(); return false; } }
function mouseReleased() { dragging = false; loop(); }
function mouseWheel(event) {
    if (mouseX < 170 || mouseX > width - 270) { return; }
    const zoom_factor = event.delta > 0 ? 0.95 : 1.05;
    const mouse_world = transPt(inv(to_screen), pt(mouseX, mouseY));
    const zoom_matrix = mul(ttrans(mouse_world.x, mouse_world.y), mul([zoom_factor, 0, 0, 0, zoom_factor, 0], ttrans(-mouse_world.x, -mouse_world.y)));
    to_screen = mul(zoom_matrix, to_screen);
    loop();
    return false;
}
