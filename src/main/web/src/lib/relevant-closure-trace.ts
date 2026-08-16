/**
 * Row/step shapes the Relevant Closure stepper UI
 * (RelevantClosureAlgorithmDetail.tsx) renders — a cumulative i / R'(before)
 * / removed / R'(after) table, built up one pseudocode line at a time by
 * buildRelevantClosureTraceFromApi below.
 */
export interface RelevantClosureTraceRow {
  i: number;
  rPrimeBefore: string[];
  removed: string[] | null;
  rPrimeAfter: string[] | null;
}

export interface RelevantClosureTraceStep {
  i: number;
  /** 0 = while-check line, 1 = R' update line, 2 = i increment line. */
  lineIndex: number;
  note: string;
  rows: RelevantClosureTraceRow[];
  terminated?: boolean;
}

/**
 * Shape returned by POST /api/relevant/basic/trace/detailed — one entry per
 * pseudocode line executed, NOT a cumulative table. Field names match the
 * JSON keys Jackson produces from RelevantTracer's getters (see
 * uct.cs.klm.algorithms.relevant.RelevantTracer /
 * RelevantClosureEntailmentBase.getDetailedRelevantJson).
 *
 * lineIndex meaning (backend numbering):
 *   0 — while-condition check for rank i (before/terminated set)
 *   1 — intersection := R+ ∩ Rank(i) (intersection set)
 *   2 — R' := R' \ intersection (current set)
 *   3 — i := i + 1
 *   4 — terminal: final entailment check on the deciding KB (terminated=true)
 */
export interface ApiRelevantTracer {
  i: number;
  lineIndex: number;
  note: string;
  before: string[] | null;
  current: string[] | null;
  intersection: string[] | null;
  terminated: boolean;
}

/** Shape of the full POST /api/relevant/basic/trace/detailed response body
 * (uct.cs.klm.algorithms.relevant.ModelRelevant). */
export interface ApiModelRelevant {
  steps: ApiRelevantTracer[];
  entailment: boolean;
  relevant: string[];
  irrelevant: string[];
}

/**
 * Converts the flat, one-row-per-pseudocode-line API response into the
 * cumulative RelevantClosureTraceStep[] shape the RelC stepper UI
 * (RelevantClosureAlgorithmDetail.tsx) renders.
 *
 * Backend lineIndex 1 (intersection computed) and 2 (R' updated) both map
 * onto the UI's single lineIndex 1 ("R' update line", matching Algorithm
 * 3.6's one pseudocode line `R' := R' \ {R_i ∩ R'}`) — they're two distinct
 * API-level steps so the intersection can be shown before it's subtracted,
 * but they highlight the same line of pseudocode. Backend lineIndex 3 (i
 * incremented) maps onto UI lineIndex 2.
 *
 * Backend lineIndex 4 is the terminal entailment check on the deciding KB —
 * it isn't a loop step at all, so it's dropped here; the UI derives the
 * equivalent "deciding KB / entailed" info from the entailment result
 * already in reasoner context instead (see RelevantClosureAlgorithmDetail).
 */
export function buildRelevantClosureTraceFromApi(
  tracers: ApiRelevantTracer[]
): RelevantClosureTraceStep[] {
  console.log(
    "[DEBUG] buildRelevantClosureTraceFromApi — received " +
      tracers.length +
      " raw tracer(s):",
    tracers
  );

  const rows: RelevantClosureTraceRow[] = [];
  const steps: RelevantClosureTraceStep[] = [];

  tracers.forEach((tracer) => {
    const { i, lineIndex, before, current, intersection, note, terminated } = tracer;

    if (lineIndex === 4) {
      return;
    }

    if (lineIndex === 0) {
      if (!terminated) {
        rows.push({ i, rPrimeBefore: before ?? [], removed: null, rPrimeAfter: null });
      }
      // terminated: while-condition now false — reuse existing rows as-is.
    } else if (lineIndex === 1) {
      const last = rows[rows.length - 1];
      if (last) {
        rows[rows.length - 1] = { ...last, removed: intersection ?? last.removed };
      }
    } else if (lineIndex === 2) {
      const last = rows[rows.length - 1];
      if (last) {
        rows[rows.length - 1] = { ...last, rPrimeAfter: current ?? last.rPrimeAfter };
      }
    }
    // lineIndex 3 (i incremented): no row mutation needed.

    const uiLineIndex = lineIndex === 0 ? 0 : lineIndex === 3 ? 2 : 1;

    steps.push({
      i,
      lineIndex: uiLineIndex,
      note,
      rows: rows.map((r) => ({ ...r })),
      terminated: !!terminated,
    });
  });

  console.log(
    "[DEBUG] buildRelevantClosureTraceFromApi — built " +
      steps.length +
      " UI step(s):",
    steps
  );

  return steps;
}
