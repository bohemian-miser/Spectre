import p5 from 'p5';
export declare const unique_edge_labels: {
    [key: string]: string[];
};
export declare function getEdgeMidpoints(tileLabel: string, selectedEdges: Set<number>): p5.Vector[];
export declare class Shape {
    pts: p5.Vector[];
    quad: p5.Vector[];
    label: string;
    origPts: p5.Vector[];
    constructor(pts: p5.Vector[], quad: p5.Vector[], label: string);
    _drawEdgeLabels(S: number[]): void;
    draw(S: number[]): void;
    streamSVG(S: number[], stream: string[]): void;
}
export declare class CurvyShape extends Shape {
    constructor(pts: p5.Vector[], quad: p5.Vector[], label: string);
    draw(S: number[]): void;
    streamSVG(S: number[], stream: string[]): void;
}
export declare class Meta {
    geoms: {
        geom: any;
        xform: number[];
    }[];
    quad: p5.Vector[];
    constructor();
    addChild(g: any, T: number[]): void;
    draw(S: number[]): void;
    streamSVG(S: number[], stream: string[]): void;
}
//# sourceMappingURL=tiles.d.ts.map