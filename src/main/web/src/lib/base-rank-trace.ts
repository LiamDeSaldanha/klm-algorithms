/**
 * Row/step shapes the BaseRank stepper UI (BaseRankAlgorithmDetail.tsx)
 * renders — a cumulative i / E_i / E_i+1 / R_i table, built up one pseudocode
 * line at a time by buildBaseRankTraceFromApi below.
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

/**
 * Shape returned by POST /api/base-rank/trace — one entry per pseudocode
 * line executed (lineIndex 0-3), NOT a cumulative table. Field names match
 * the JSON keys Jackson actually produces from BaseRankTracer/BaseRankResults'
 * getters (getEprev()/getEnext() decapitalize to "eprev"/"enext", not
 * "ePrev"/"eNext" — see BaseRankResults.java).
 */
export interface ApiBaseRankResults {
  i: number;
  ei: string[] | null;
  eprev: string[] | null;
  enext: string[] | null;
  ri: string[] | null;
}

export interface ApiBaseRankTracer {
  i: number;
  lineIndex: number;
  note: string;
  rows: ApiBaseRankResults;
  terminated: boolean;
}

function noteFor(lineIndex: number, i: number): string {
  switch (lineIndex) {
    case 0:
      return `Entering loop body for i = ${i}.`;
    case 1:
      return `Computing E[${i + 1}] — statements exceptional in E[${i}].`;
    case 2:
      return `Computing R[${i}] = E[${i}] \\ E[${i + 1}].`;
    case 3:
      return `i incremented to ${i + 1}.`;
    default:
      return "";
  }
}

/**
 * Converts the flat, one-row-per-pseudocode-line API response into the
 * cumulative BaseRankTraceStep[] shape the BaseRank stepper UI
 * (BaseRankAlgorithmDetail.tsx) renders.
 *
 * The backend (BaseRankService.getBaseRankJson) emits lineIndex 0-3 for
 * every real loop iteration, then one final entry with lineIndex=0 and
 * terminated=true representing the while-condition check now failing
 * (previousKnowledgeBase == currentKnowledgeBase). That terminal entry is
 * special-cased below: unlike every other lineIndex===0 entry (which starts
 * a brand-new table row for a new iteration), it must NOT push a new row —
 * it reuses the existing cumulative rows unchanged. This matters because
 * BaseRankAlgorithmDetail derives R-infinity from the *last real row's*
 * eiNext (i.e. the previous iteration's computed E[i+1]) — if the terminal
 * entry pushed its own row instead, that row's eiNext would be empty and
 * R-infinity would incorrectly render as empty every time.
 *
 * The terminal entry's own `i` is a sentinel (the backend sets it to
 * Integer.MAX_VALUE, not a real rank number), so it's never used directly —
 * the note below derives the real "i at which the condition failed" from
 * the last real row instead (that row's i + 1).
 */
export function buildBaseRankTraceFromApi(
  tracers: ApiBaseRankTracer[]
): BaseRankTraceStep[] {
  const rows: BaseRankTraceRow[] = [];
  const steps: BaseRankTraceStep[] = [];

  tracers.forEach((tracer) => {
    const { i, lineIndex, rows: r, terminated } = tracer;

    if (terminated) {
      // While-condition now false — reuse the existing rows as-is.
    } else if (lineIndex === 0) {
      rows.push({
        i,
        ei: r.ei ?? [],
        eiPrev: r.eprev ?? [],
        eiNext: r.enext ?? null,
        ri: r.ri ?? null,
      });
    } else {
      const last = rows[rows.length - 1];
      if (last) {
        rows[rows.length - 1] = {
          ...last,
          eiNext: r.enext ?? last.eiNext,
          ri: r.ri ?? last.ri,
        };
      }
    }

    let note: string;
    if (terminated) {
      const lastRealI = rows.length > 0 ? rows[rows.length - 1].i + 1 : 0;
      note = `Check E[${lastRealI - 1}] ≠ E[${lastRealI}] — false. Loop terminates. R∞ = E[${lastRealI}].`;
    } else {
      note = noteFor(lineIndex, i);
    }

    steps.push({
      i,
      lineIndex,
      note,
      rows: rows.map((row) => ({ ...row })),
      terminated: !!terminated,
    });
  });

  return steps;
}
