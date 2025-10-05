import { unique_edge_labels } from './tiles';

export function getEdgeDotCount(tileLabel: string, selectedEdges: Set<number>): number {
    let count = 0;
    if (typeof unique_edge_labels === 'undefined') return 0;
    const labels = unique_edge_labels[tileLabel];
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
