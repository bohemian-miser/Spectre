export const state = {
    showOutlines: true,
    showBackgrounds: true,
    showLines: true,
    showEdgeLabels: false,
    showEdgeJoiner: false,
    selectedMajorEdges: new Set<number>(),
    colorScheme: 'Bright',
    shape: 'Tile(1,1)',
    tile: 'Delta',
    customColors: {} as { [key: string]: string },
    colmap: {} as { [key: string]: number[] }
};

export type AppState = typeof state;
