import p5 from 'p5';
import { AppState } from './state';
import { tile_names, colmap53, colmap_orig, colmap_mystics, colmap_pride, thumbWidth, thumbHeight, thumbScale } from './config';
import { pt, mul, trot, ttrans, inv, transPt } from './utils';
import { unique_edge_labels, getEdgeMidpoints } from './tiles';

declare let p: p5;

export function setupUI(p: p5, state: AppState, refreshCallback: () => void) {
    const controlPanel = p.createDiv('');
    controlPanel.position(10, 10);
    controlPanel.style('background-color', 'rgba(255, 255, 255, 0.8)');
    controlPanel.style('padding', '10px');
    controlPanel.style('border-radius', '5px');

    let lab = p.createSpan('Shapes');
    lab.parent(controlPanel);

    const shape_sel = p.createSelect();
    shape_sel.parent(controlPanel);
    shape_sel.option('Tile(1,1)');
    shape_sel.option('Spectres');
    shape_sel.option('Hexagons');
    shape_sel.option('Turtles in Hats');
    shape_sel.option('Hats in Turtles');
    shape_sel.changed(() => {
        state.shape = shape_sel.value() as string;
        refreshCallback();
    });

    const subst_button = p.createButton("Build Supertiles");
    subst_button.parent(controlPanel);
    subst_button.mousePressed(() => {
        // This will be handled in sketch.ts
    });

    let lab2 = p.createSpan('Category');
    lab2.parent(controlPanel);

    const tile_sel = p.createSelect();
    tile_sel.parent(controlPanel);
    for (let name of tile_names) {
        tile_sel.option(name);
    }
    tile_sel.value(state.tile);
    tile_sel.changed(() => {
        state.tile = tile_sel.value() as string;
        refreshCallback();
    });

    let lab3 = p.createSpan('Colours');
    lab3.parent(controlPanel);

    const colscheme_sel = p.createSelect();
    colscheme_sel.parent(controlPanel);
    colscheme_sel.option('Pride');
    colscheme_sel.option('Mystics');
    colscheme_sel.option('Figure 5.3');
    colscheme_sel.option('Custom');
    colscheme_sel.option('Bright');
    colscheme_sel.value(state.colorScheme);
    colscheme_sel.changed(() => {
        state.colorScheme = colscheme_sel.value() as string;
        refreshCallback();
    });

    const showOutlinesCheck = p.createCheckbox('Show Outlines', state.showOutlines);
    showOutlinesCheck.parent(controlPanel);
    showOutlinesCheck.changed(() => {
        state.showOutlines = showOutlinesCheck.checked() as boolean;
        refreshCallback();
    });

    const showBackgroundsCheck = p.createCheckbox('Show Backgrounds', state.showBackgrounds);
    showBackgroundsCheck.parent(controlPanel);
    showBackgroundsCheck.changed(() => {
        state.showBackgrounds = showBackgroundsCheck.checked() as boolean;
        refreshCallback();
    });

    const showLinesCheck = p.createCheckbox('Show Lines', state.showLines);
    showLinesCheck.parent(controlPanel);
    showLinesCheck.changed(() => {
        state.showLines = showLinesCheck.checked() as boolean;
        refreshCallback();
    });

    const showEdgeLabelsCheck = p.createCheckbox('Show Edge Labels', state.showEdgeLabels);
    showEdgeLabelsCheck.parent(controlPanel);
    showEdgeLabelsCheck.changed(() => {
        state.showEdgeLabels = showEdgeLabelsCheck.checked() as boolean;
        refreshCallback();
    });

    const showEdgeJoinerCheck = p.createCheckbox('Show Edge Joiner', state.showEdgeJoiner);
    showEdgeJoinerCheck.parent(controlPanel);
    showEdgeJoinerCheck.changed(() => {
        state.showEdgeJoiner = showEdgeJoinerCheck.checked() as boolean;
        refreshCallback();
    });

    const save_button = p.createButton("Save PNG");
    save_button.parent(controlPanel);
    save_button.mousePressed(() => {
        // This will be handled in sketch.ts
    });

    const svg_button = p.createButton("Save SVG");
    svg_button.parent(controlPanel);
    svg_button.mousePressed(() => {
        // This will be handled in sketch.ts
    });

    const edgePanel = p.createDiv('');
    edgePanel.position(150, 10);
    edgePanel.style('background-color', 'rgba(255, 255, 255, 0.8)');
    edgePanel.style('padding', '10px');
    edgePanel.style('border-radius', '5px');

    const majorEdgesLabel = p.createSpan('Major Edges');
    majorEdgesLabel.parent(edgePanel);
    p.createElement('br').parent(edgePanel);

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

    for (const edge_type of edge_types) {
        const checkbox = p.createCheckbox(edge_type.label, false);
        checkbox.parent(edgePanel);
        checkbox.changed(() => {
            if (checkbox.checked()) {
                state.selectedMajorEdges.add(edge_type.value);
            } else {
                state.selectedMajorEdges.delete(edge_type.value);
            }
            refreshCallback();
        });
        p.createElement('br').parent(edgePanel);
    }
}
