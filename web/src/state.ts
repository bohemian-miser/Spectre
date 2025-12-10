export var state = {
    config: {
        showOutlines: true,
        showBackgrounds: true,
        showLines: true,
        showEdgeLabels: false,
        showEdgeJoiner: false,
        showIds: false,
        showQuads: false,
        showEdgeDots: false,
    },
    isCircuitAnalysisDirty: true,
    selectedMajorEdges: new Set<number>(),
    selectedJoinerEdges: new Set<number>(),
    colorScheme: 'Bright',
    shape: 'Tile(1,1)',
    tile: 'Delta',
    customColors: {} as { [key: string]: string },
    p: null,
    colmap: {} as { [key: string]: number[] },
    analysisTime: 0,
    timePerTile: 0,
    tileCount: 0,
    circuitStats: {
        circuits: new Map<number, number>(),
        lines: new Map<number, number>(),
        circuitColors: new Map<number, string>()
    },
};

export type AppState = typeof state;
