import type { BaseRankTraceRow, BaseRankTraceStep } from "@/lib/mock/base-rank-trace";

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
 * cumulative BaseRankTraceStep[] shape the BaseRank stepper UI already
 * renders (same shape the mock trace produces — see
 * BaseRankAlgorithmDetail.tsx, and the deprecated DeprecatedBaseRankDebugger.tsx),
 * so the UI doesn't need to change — only its data source does.
 *
 * Notes: the backend always sends note="" and terminated=false today (the
 * while-loop's final failing condition check isn't captured as a step), so
 * notes are synthesized client-side from lineIndex/i instead, and the
 * "Loop terminated" message won't show for real data until the backend
 * captures that final step too.
 */
export function buildBaseRankTraceFromApi(
  tracers: ApiBaseRankTracer[]
): BaseRankTraceStep[] {
  const rows: BaseRankTraceRow[] = [];
  const steps: BaseRankTraceStep[] = [];

  tracers.forEach((tracer) => {
    const { i, lineIndex, rows: r, terminated } = tracer;

    if (lineIndex === 0) {
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

    steps.push({
      i,
      lineIndex,
      note: noteFor(lineIndex, i),
      rows: rows.map((row) => ({ ...row })),
      terminated: !!terminated,
    });
  });

  return steps;
}
