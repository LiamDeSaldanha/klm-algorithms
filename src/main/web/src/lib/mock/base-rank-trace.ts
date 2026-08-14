/**
 * MOCK DATA — the backend currently only returns the final exceptionality
 * sequence and ranks for BaseRank (see IBaseRankExplanation), not a
 * per-iteration trace of the while-loop body. There is no endpoint yet that
 * exposes E[i-1], E[i+1], and R[i] as they're computed line-by-line.
 *
 * This file hardcodes a plausible trace so the debugger/stepper UI can be
 * built and demoed. Swap MOCK_BASE_RANK_TRACE for real API data once a
 * trace endpoint exists.
 */

export interface BaseRankTraceRow {
  i: number;
  ei: string[];
  eiPrev: string[] | null;
  eiNext: string[] | null;
  ri: string[] | null;
}

export interface BaseRankTraceStep {
  /** Value of i currently "in scope" for this step. */
  i: number;
  /** Index into CODE_LINES (see BaseRankAlgorithmDetail) that should be highlighted. */
  lineIndex: number;
  /** Short human-readable description of what's happening at this step. */
  note: string;
  /** Cumulative table snapshot at this point in the trace. */
  rows: BaseRankTraceRow[];
  terminated?: boolean;
}

const MOCK_KB = ["p=>b", "b~>f", "b~>w", "p~>!f"];

interface IterationConfig {
  i: number;
  eiPrev: string[] | null;
  ei: string[];
  eiNext: string[];
  ri: string[];
}

const ITERATIONS: IterationConfig[] = [
  { i: 0, eiPrev: null, ei: MOCK_KB, eiNext: ["p~>!f"], ri: ["p=>b", "b~>f", "b~>w"] },
  { i: 1, eiPrev: MOCK_KB, ei: ["p~>!f"], eiNext: [], ri: ["p~>!f"] },
  { i: 2, eiPrev: ["p~>!f"], ei: [], eiNext: [], ri: [] },
];

function buildTrace(): BaseRankTraceStep[] {
  const steps: BaseRankTraceStep[] = [];
  const rows: BaseRankTraceRow[] = [];

  ITERATIONS.forEach((iter) => {
    // Line 0: while condition check — true, enter the loop body.
    rows.push({ i: iter.i, ei: iter.ei, eiPrev: iter.eiPrev, eiNext: null, ri: null });
    steps.push({
      i: iter.i,
      lineIndex: 0,
      note: `Check E[${iter.i - 1}] ≠ E[${iter.i}] — true, entering loop body.`,
      rows: rows.map((r) => ({ ...r })),
    });

    // Line 1: compute E[i+1] — statements exceptional in E[i].
    rows[rows.length - 1] = { ...rows[rows.length - 1], eiNext: iter.eiNext };
    steps.push({
      i: iter.i,
      lineIndex: 1,
      note: `Computing E[${iter.i + 1}] — statements exceptional in E[${iter.i}].`,
      rows: rows.map((r) => ({ ...r })),
    });

    // Line 2: compute R[i] = E[i] \ E[i+1].
    rows[rows.length - 1] = { ...rows[rows.length - 1], ri: iter.ri };
    steps.push({
      i: iter.i,
      lineIndex: 2,
      note: `Computing R[${iter.i}] = E[${iter.i}] \\ E[${iter.i + 1}].`,
      rows: rows.map((r) => ({ ...r })),
    });

    // Line 3: increment i.
    steps.push({
      i: iter.i + 1,
      lineIndex: 3,
      note: `i incremented to ${iter.i + 1}.`,
      rows: rows.map((r) => ({ ...r })),
    });
  });

  const last = ITERATIONS[ITERATIONS.length - 1];
  steps.push({
    i: last.i + 1,
    lineIndex: 0,
    note: `Check E[${last.i}] ≠ E[${last.i + 1}] — false. Loop terminates. R∞ = E[${last.i + 1}].`,
    rows: rows.map((r) => ({ ...r })),
    terminated: true,
  });

  return steps;
}

export const MOCK_BASE_RANK_TRACE: BaseRankTraceStep[] = buildTrace();
