export var state = {
    showOutlines: true,
    showBackgrounds: true,
    showLines: true,
    showEdgeLabels: false,
    showEdgeJoiner: false,
    showIds: true,
    showQuads: true,
    showEdgeDots: true,
    isCircuitAnalysisDirty: true,
    selectedMajorEdges: new Set<number>(),
    selectedJoinerEdges: new Set<number>(),
    colorScheme: 'Bright',
    shape: 'Tile(1,1)',
    tile: 'Delta',
    customColors: {} as { [key: string]: string },
    p: null,
    colmap: {} as { [key: string]: number[] }
};

export type AppState = typeof state;
