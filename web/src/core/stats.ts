/**
 * Parser for the pre-computed analysis CSVs in `/graph_analysis`
 * (`lvl4.csv`, `lvl6.csv`). Copies of those files live in `web/src/data/`
 * so they can be imported with Vite's `?raw`; regenerate them by copying from
 * `/graph_analysis` — that directory stays the source of truth.
 *
 * Pure: takes raw text, returns rows. No fetch, no import of the data itself.
 */

export interface ComboRow {
  /** One digit per leaf tile in LEAF_ORDER (README order). */
  readonly combo: string;
  readonly tails: number;
  readonly circuits: number;
  readonly maxTail: number;
  readonly maxCircuit: number;
  readonly circuitLengths: readonly number[];
  /** length -> count */
  readonly tailLengths: ReadonlyMap<number, number>;
  /** e.g. '2578' */
  readonly edgeSelection: string;
}

/** RFC4180-lite: handles quoted fields containing commas and doubled quotes. */
export function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let started = false;

  const endField = (): void => {
    row.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
    started = false;
  };

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && !started) {
      inQuotes = true;
      started = true;
    } else if (ch === ',') {
      endField();
      started = false;
    } else if (ch === '\r') {
      // ignore
    } else if (ch === '\n') {
      endRow();
    } else {
      field += ch;
      started = true;
    }
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

/** `"[3, 4, 5]"` -> [3,4,5] */
export function parsePyList(s: string): number[] {
  const body = s.trim().replace(/^\[|\]$/g, '').trim();
  if (!body) return [];
  return body
    .split(',')
    .map((p) => Number.parseFloat(p.trim()))
    .filter((n) => Number.isFinite(n));
}

/** `"{2: 491, 1: 118}"` -> Map(2->491, 1->118) */
export function parsePyDict(s: string): Map<number, number> {
  const out = new Map<number, number>();
  const body = s.trim().replace(/^\{|\}$/g, '').trim();
  if (!body) return out;
  for (const part of body.split(',')) {
    const m = /^\s*'?(-?\d+)'?\s*:\s*(-?\d+)\s*$/.exec(part);
    if (m) out.set(Number.parseInt(m[1], 10), Number.parseInt(m[2], 10));
  }
  return out;
}

function num(v: string | undefined): number {
  const n = Number.parseFloat((v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse a graph_analysis CSV. Expected header:
 * `combo,tails,circuits,max_tail,max_circuit,circuit_lengths,tail_lengths,edge_selection`
 */
export function parseStatsCsv(raw: string): ComboRow[] {
  const rows = parseCsvRows(raw);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const col = (name: string): number => header.indexOf(name);
  const iCombo = col('combo');
  const iTails = col('tails');
  const iCircuits = col('circuits');
  const iMaxTail = col('max_tail');
  const iMaxCircuit = col('max_circuit');
  const iCircuitLengths = col('circuit_lengths');
  const iTailLengths = col('tail_lengths');
  const iEdgeSelection = col('edge_selection');

  const out: ComboRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length < header.length) continue;
    out.push({
      combo: (cells[iCombo] ?? '').trim(),
      tails: num(cells[iTails]),
      circuits: num(cells[iCircuits]),
      maxTail: num(cells[iMaxTail]),
      maxCircuit: num(cells[iMaxCircuit]),
      circuitLengths: parsePyList(cells[iCircuitLengths] ?? ''),
      tailLengths: parsePyDict(cells[iTailLengths] ?? ''),
      edgeSelection: (cells[iEdgeSelection] ?? '').trim(),
    });
  }
  return out;
}

/** Row counts per `edge_selection`, for the stats page filter chips. */
export function countByEdgeSelection(rows: readonly ComboRow[]): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.edgeSelection, (out.get(r.edgeSelection) ?? 0) + 1);
  return out;
}
