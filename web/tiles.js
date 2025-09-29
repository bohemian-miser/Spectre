// Shape and Meta classes
class Shape {
    constructor(pts, quad, label) { this.pts = pts; this.quad = quad; this.label = label; }
    draw(S) {
        drawPolygon(this.pts, S, colmap[this.label], [0, 0, 0], 0.1);
        if (show_edge_labels) { drawEdgeLabels(this.label, S); }
        let lines_to_draw = drawn_lines[this.label] ? [...drawn_lines[this.label]] : [];
        if (this.label === 'Gamma1' || this.label === 'Gamma2') { lines_to_draw.push(...(drawn_lines['Gamma'] || [])); }
        if (lines_to_draw.length > 0) {
            const current_scale = mag(to_screen[0], to_screen[3]);
            strokeWeight(2 / current_scale);
            noFill();
            for (const line of lines_to_draw) {
                stroke(line.color);
                beginShape();
                for (const point of line.points) {
                    const tp = transPt(S, point);
                    vertex(tp.x, tp.y);
                }
                endShape();
            }
        }
    }
}
class Meta {
    constructor() { this.geoms = []; this.quad = []; }
    addChild(g, T) { this.geoms.push({ geom: g, xform: T }); }
    draw(S) { for (let g of this.geoms) { g.geom.draw(mul(S, g.xform)); } }
}

// Tile building functions
function buildSpectreBase() {
    const spectre = [pt(0, 0), pt(1, 0), pt(1.5, -0.866), pt(2.366, -0.366), pt(2.366, 0.634), pt(3.366, 0.634), pt(3.866, 1.5), pt(3, 2), pt(2.134, 1.5), pt(1.634, 2.366), pt(0.634, 2.366), pt(-0.366, 2.366), pt(-0.866, 1.5), pt(0, 1)];
    const spectre_keys = [spectre[3], spectre[5], spectre[7], spectre[11]];
    const ret = {};
    for (const lab of ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) { ret[lab] = new Shape(spectre, spectre_keys, lab); }
    const mystic = new Meta();
    mystic.addChild(new Shape(spectre, spectre_keys, 'Gamma1'), ident);
    mystic.addChild(new Shape(spectre, spectre_keys, 'Gamma2'), mul(ttrans(spectre[8].x, spectre[8].y), trot(PI / 6)));
    mystic.quad = spectre_keys;
    ret['Gamma'] = mystic;
    ret['Gamma1'] = mystic.geoms[0].geom;
    ret['Gamma2'] = mystic.geoms[1].geom;
    return ret;
}
function buildSupertiles(sys) {
    const quad = sys['Delta'].quad;
    const R = [-1, 0, 0, 0, 1, 0];
    const t_rules = [[60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1], [0, 2, 0], [60, 3, 1], [-120, 3, 3]];
    const Ts = [ident];
    let total_ang = 0, rot = ident;
    const tquad = [...quad];
    for (const [ang, from, to] of t_rules) {
        total_ang += ang;
        if (ang != 0) { rot = trot(radians(total_ang)); for (let i = 0; i < 4; ++i) { tquad[i] = transPt(rot, quad[i]); } }
        const ttt = ttrans(psub(transPt(Ts[Ts.length - 1], quad[from]), tquad[to]).x, psub(transPt(Ts[Ts.length - 1], quad[from]), tquad[to]).y);
        Ts.push(mul(ttt, rot));
    }
    for (let idx = 0; idx < Ts.length; ++idx) { Ts[idx] = mul(R, Ts[idx]); }
    const super_rules = { 'Gamma': ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'], 'Delta': ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'], 'Theta': ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'], 'Lambda': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'], 'Xi': ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'], 'Pi': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'], 'Sigma': ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'], 'Phi': ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'], 'Psi': ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'] };
    const super_quad = [transPt(Ts[6], quad[2]), transPt(Ts[5], quad[1]), transPt(Ts[3], quad[2]), transPt(Ts[0], quad[1])];
    const ret = {};
    for (const [lab, subs] of Object.entries(super_rules)) {
        const sup = new Meta();
        for (let idx = 0; idx < 8; ++idx) { if (subs[idx] == 'null') { continue; } sup.addChild(sys[subs[idx]], Ts[idx]); }
        sup.quad = super_quad;
        ret[lab] = sup;
    }
    return ret;
}
