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
    customColors: {} as { [key: string]: string }
};

export type AppState = typeof state;
