import type { JustificationTraceStep } from "@/lib/mock/justification-trace";

/**
 * Shape actually returned by POST /api/relevant/basic/justification/{queryFormula}
 * — field names match the JSON keys Jackson produces from
 * ModelJustificationTraceStep's getters, which don't exactly match the
 * mock/spec's JustificationTraceStep interface:
 *
 * - `isMinimal()` decapitalizes to property "minimal", not "isMinimal".
 * - `getJustificationSoFar()` decapitalizes to "justificationSoFar"
 *   (singular), not the mock's "justificationsSoFar" (plural).
 *
 * (Same kind of getter-name gotcha as ApiBaseRankResults in
 * lib/base-rank-trace.ts — see that file's comment.)
 *
 * Also, as of the current PowersetJustificationService implementation:
 * - `combinedKb` is never set on the Java side, so it always comes back
 *   null. It isn't rendered anywhere in PartitionJustificationDetail today,
 *   so this is harmless for now but worth fixing on the backend eventually.
 * - `note` is never set either, so it's always null — the frontend explains
 *   each step from entailed/isMinimal directly, so this isn't relied on,
 *   but the "note" line in JustificationExplanation just won't show
 *   anything extra until the backend populates it.
 */
export interface ApiJustificationTraceStep {
  candidateNumber: number;
  candidate: string[];
  combinedKb: string[] | null;
  entailed: boolean;
  minimal: boolean;
  justificationSoFar: string[][] | null;
  note: string | null;
}

/**
 * Converts the raw API response into the JustificationTraceStep[] shape
 * PartitionJustificationDetail.tsx already renders (same shape
 * MOCK_JUSTIFICATION_TRACE produces), so the component doesn't need to
 * change — only its data source does.
 *
 * `isMinimal` is reconstructed as null when the step wasn't entailed, since
 * the backend's `minimal` field is a Java primitive boolean (always false
 * by default) and can't itself distinguish "not applicable" from "entailed
 * but not minimal" the way the frontend type does.
 */
export function buildJustificationTraceFromApi(
  steps: ApiJustificationTraceStep[]
): JustificationTraceStep[] {
  return steps.map((step) => ({
    candidateNumber: step.candidateNumber,
    candidate: step.candidate,
    combinedKb: step.combinedKb ?? [],
    entailed: step.entailed,
    isMinimal: step.entailed ? step.minimal : null,
    justificationsSoFar: step.justificationSoFar ?? [],
    note: step.note ?? "",
  }));
}
