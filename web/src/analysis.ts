import { unique_edge_labels, hex_edge_labels } from './tiles';
import { getEdgeDotMidpoints } from './tiles';
import { state } from './state';
import { mul, transPt, ident } from './utils';
import p5 from 'p5';

function getEdgeLabelsForShape(tileLabel: string): readonly string[] {
    const labels = state.shape === 'Hexagons' ? hex_edge_labels : unique_edge_labels;
    return labels[tileLabel] || [];
}

export function getEdgeDotCount(tileLabel: string, selectedEdges: Set<number>): number {
    let count = 0;
    const labels = getEdgeLabelsForShape(tileLabel);
    if (!labels) return 0;

    for (const lab of labels) {
        const major = parseInt(lab.replace('-', '').charAt(0));
        const sub = parseInt(lab.replace('-', '').substring(2, 3));
        if (selectedEdges.has(major) && sub === 0) {
            count++;
        }
    }
    return count;
}

export function findPerfectMatchings(points: {x: number, y: number}[]): {x: number, y: number}[][][] {
    if (points.length === 0) {
        return [[]];
    }
    if (points.length % 2 !== 0) {
        return [];
    }

    const first = points[0];
    const rest = points.slice(1);
    const solutions = [];

    for (let i = 0; i < rest.length; i++) {
        const pair: {x: number, y: number}[] = [first, rest[i]];
        const remaining = rest.slice(0, i).concat(rest.slice(i + 1));
        const subSolutions = findPerfectMatchings(remaining);
        for (const subSolution of subSolutions) {
            solutions.push([pair].concat(subSolution));
        }
    }

    return solutions;
}

// --- Circuit Analysis ---

type Point = [number, number];
type Edge = [Point, Point];

// Helper to create a canonical key for a point, rounding to avoid floating point issues
function pointToKey(p: Point): string {
    return `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
}

// Helper to create a canonical key for an edge
function edgeToKey(edge: Edge): string {
    const key1 = pointToKey(edge[0]);
    const key2 = pointToKey(edge[1]);
    // Sort to ensure the key is the same regardless of point order
    return key1 < key2 ? `${key1}_${key2}` : `${key2}_${key1}`;
}

// Recursively collect all selected line segments (edges) in global coordinates
function collectEdges(tile: any, transform: number[], allEdges: Edge[], p: p5): void {
    if (!tile) return;

    // If it's a MetaTile, recurse
    if (tile.geoms) {
        for (const child of tile.geoms) {
            const childTransform = mul(transform, child.xform);
            collectEdges(child.geom, childTransform, allEdges, p);
        }
        return;
    }

    // If it's a Shape, get its selected matching
    const midpoints = getEdgeDotMidpoints(tile.label, state.selectedJoinerEdges);
    if (midpoints.length < 2 || midpoints.length % 2 !== 0) {
        return;
    }

    const matchings = findPerfectMatchings(midpoints.map(m => ({ x: m.x, y: m.y })));
    const slider = document.getElementById(`slider-${tile.label}`) as HTMLInputElement;
    const index = slider ? parseInt(slider.value, 10) : 0;

    if (matchings.length > 0 && matchings[index]) {
        const selectedMatching = matchings[index];
        for (const pair of selectedMatching) {
            const p1 = transPt(transform, p.createVector(pair[0].x, pair[0].y));
            const p2 = transPt(transform, p.createVector(pair[1].x, pair[1].y));
            allEdges.push([[p1.x, p1.y], [p2.x, p2.y]]);
        }
    }
}

// Process the collected edges to find paths and circuits using DFS
function processCircuits(edges: Edge[]): { circuits: Map<number, Edge[][]>, openPaths: Edge[][] } {
    const adj: Map<string, string[]> = new Map();
    for (const edge of edges) {
        const p1_key = pointToKey(edge[0]);
        const p2_key = pointToKey(edge[1]);
        if (!adj.has(p1_key)) adj.set(p1_key, []);
        if (!adj.has(p2_key)) adj.set(p2_key, []);
        adj.get(p1_key)!.push(p2_key);
        adj.get(p2_key)!.push(p1_key);
    }

    const visited: Set<string> = new Set();
    const circuits: Map<number, Edge[][]> = new Map();
    const openPaths: Edge[][] = [];

    for (const startNode of adj.keys()) {
        if (visited.has(startNode)) continue;

        const pathKeys: string[] = [];
        const stack: string[] = [startNode];
        const parentMap: Map<string, string | null> = new Map([[startNode, null]]);
        
        let isCircuit = false;
        let pathEndNode: string | null = null;

        while (stack.length > 0) {
            const curr = stack.pop()!;
            if (visited.has(curr)) continue;
            
            visited.add(curr);
            pathKeys.push(curr);

            const neighbors = adj.get(curr) || [];
            let unvisitedCount = 0;
            for (const neighbor of neighbors) {
                if (neighbor === parentMap.get(curr)) continue;

                if (visited.has(neighbor)) {
                    isCircuit = true;
                    pathEndNode = curr;
                } else {
                    unvisitedCount++;
                    parentMap.set(neighbor, curr);
                    stack.push(neighbor);
                }
            }
            if (unvisitedCount === 0 && !isCircuit) {
                pathEndNode = curr;
            }
        }

        // Reconstruct path from parentMap
        const reconstructedPath: Edge[] = [];
        let curr = pathEndNode;
        while (curr) {
            const parent = parentMap.get(curr);
            if (parent) {
                const p1_str = curr.split(',');
                const p2_str = parent.split(',');
                reconstructedPath.unshift([
                    [parseFloat(p1_str[0]), parseFloat(p1_str[1])],
                    [parseFloat(p2_str[0]), parseFloat(p2_str[1])]
                ]);
            }
            curr = parent!;
        }
        if (isCircuit && pathEndNode) {
             const startNodeOfPath = reconstructedPath.length > 0 ? reconstructedPath[0][0] : null;
             if (startNodeOfPath) {
                const p1_str = pathEndNode.split(',');
                const p2_str = startNode.split(',');
                 reconstructedPath.push([
                    [parseFloat(p1_str[0]), parseFloat(p1_str[1])],
                    [parseFloat(p2_str[0]), parseFloat(p2_str[1])]
                ]);
             }
        }
        
        if (reconstructedPath.length > 0) {
            const len = reconstructedPath.length;
            if (isCircuit) {
                if (!circuits.has(len)) circuits.set(len, []);
                circuits.get(len)!.push(reconstructedPath);
            } else {
                openPaths.push(reconstructedPath);
            }
        }
    }
    return { circuits, openPaths };
}


// Generate colors for circuits
function generateColorMap(analysis: { circuits: Map<number, Edge[][]>, openPaths: Edge[][] }): Map<string, string> {
    const colorMap: Map<string, string> = new Map();
    const circuitColors: Map<number, string> = new Map();
    let hue = 0;

    // Assign a unique color to each circuit length
    const sortedLengths = Array.from(analysis.circuits.keys()).sort((a, b) => a - b);
    for (const length of sortedLengths) {
        circuitColors.set(length, `hsl(${hue}, 100%, 50%)`);
        hue = (hue + 40) % 360;
    }

    // Populate the color map for circuits
    for (const [length, circuitList] of analysis.circuits.entries()) {
        const color = circuitColors.get(length)!;
        for (const circuit of circuitList) {
            for (const edge of circuit) {
                colorMap.set(edgeToKey(edge), color);
            }
        }
    }

    // Assign a default color for open paths
    for (const path of analysis.openPaths) {
        for (const edge of path) {
            colorMap.set(edgeToKey(edge), '#808080'); // Grey
        }
    }

    return colorMap;
}

// Main analysis function
export function analyzeAndColor(rootTile: any, p: p5): Map<string, string> {
    const allEdges: Edge[] = [];
    collectEdges(rootTile, ident, allEdges, p);
    const analysis = processCircuits(allEdges);
    return generateColorMap(analysis);
}
