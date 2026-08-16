import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlankCard } from "./BlankCard";
import { Kb } from "@/components/main-tabs/common/formulas";
import { TexFormula } from "@/components/main-tabs/common/TexFormula";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RankingTable } from "@/components/main-tabs/tables/ranking-table";
import { cn } from "@/lib/utils";
import { BaseRankTraceStep, MOCK_BASE_RANK_TRACE } from "@/lib/mock/base-rank-trace";
import { IRank } from "@/lib/models";

/**
 * Full BaseRank pseudocode (Algorithm 1). Rendered with KaTeX so the
 * set-builder notation, entailment symbol, and set difference render
 * correctly. Lines that correspond to a step in the while-loop trace carry
 * a `step` matching BaseRankTraceStep.lineIndex (0-3) and get highlighted
 * as the stepper moves through the loop; all other lines are static.
 */
const CODE_LINES: { tex: string; indent?: boolean; step?: number }[] = [
  { tex: "\\text{Input: A knowledge base } \\mathcal{K}" },
  {
    tex: "\\text{Output: An ordered tuple } (\\mathcal{R}_0, \\dots, \\mathcal{R}_{n-1}, \\mathcal{R}_\\infty, n)",
  },
  { tex: "i := 0" },
  { tex: "\\mathcal{E}_0 := \\mathcal{\\overrightarrow{K}}" },
  { tex: "\\textbf{while}\\ \\mathcal{E}_{i-1} \\neq \\mathcal{E}_i\\ \\textbf{do}", step: 0 },
  {
    tex: "\\mathcal{E}_{i+1} := \\{\\alpha \\to \\beta \\in \\mathcal{E}_i \\mid \\mathcal{E}_i \\models \\neg\\alpha\\}",
    indent: true,
    step: 1,
  },
  { tex: "\\mathcal{R}_i := \\mathcal{E}_i \\setminus \\mathcal{E}_{i+1}", indent: true, step: 2 },
  { tex: "i := i + 1", indent: true, step: 3 },
  { tex: "\\textbf{end while}" },
  { tex: "\\mathcal{R}_\\infty := \\mathcal{E}_{i-1}" },
  { tex: "\\textbf{if}\\ \\mathcal{E}_{i-1} = \\varnothing\\ \\textbf{then}" },
  { tex: "n := i - 1", indent: true },
  { tex: "\\textbf{else}" },
  { tex: "n := i", indent: true },
  { tex: "\\textbf{end if}" },
  { tex: "\\textbf{return}\\ (\\mathcal{R}_0, \\dots, \\mathcal{R}_{n-1}, \\mathcal{R}_\\infty, n)" },
];

function FormulaSet({ formulas }: { formulas: string[] | null }) {
  if (formulas === null) {
    return <span className="text-muted-foreground">…</span>;
  }
  if (formulas.length === 0) {
    return <span className="text-muted-foreground">∅</span>;
  }
  return <Kb formulas={formulas} />;
}

type Phase = "loop" | "infinity" | "final";

interface GlobalStep {
  phase: Phase;
  loopStepIndex: number | null;
}

function buildGlobalSteps(trace: BaseRankTraceStep[]): GlobalStep[] {
  return [
    ...trace.map((_, idx) => ({ phase: "loop" as const, loopStepIndex: idx })),
    { phase: "infinity", loopStepIndex: null },
    { phase: "final", loopStepIndex: null },
  ];
}

/**
 * @deprecated Not routed anywhere anymore — superseded by
 * BaseRankAlgorithmDetail.tsx (the 3-panel drill-in reached from
 * RelevantClosureStages' Base Rank stage). Kept around for reference only;
 * safe to delete once nothing else needs to be cross-checked against it.
 *
 * Unified step-through debugger for the BaseRank algorithm. One stepIndex
 * drives three phases in order: Base Rank Algorithm (the while loop) ->
 * Rank Infinity -> Final Ranking. Whichever phase is active gets its
 * BlankCard highlighted as a whole — except the Base Rank Algorithm phase,
 * where the highlight transfers from the card down to the specific active
 * pseudocode line instead.
 *
 * The while-loop trace (rows + line highlighting) comes from the real
 * /api/base-rank/trace endpoint (pass it as `trace`, already converted via
 * buildBaseRankTraceFromApi). If no real trace is available yet, this
 * falls back to MOCK_BASE_RANK_TRACE — see lib/mock/base-rank-trace.ts.
 * Rank Infinity and Final Ranking always use real data from the API.
 */
export function DeprecatedBaseRankDebugger({
  rankInfinity,
  ranks,
  trace,
}: {
  rankInfinity: IRank | null | undefined;
  ranks: IRank[];
  trace?: BaseRankTraceStep[] | null;
}) {
  const activeTrace =
    trace && trace.length > 0 ? trace : MOCK_BASE_RANK_TRACE;
  const globalSteps = useMemo(() => buildGlobalSteps(activeTrace), [activeTrace]);
  const lastLoopStep = activeTrace[activeTrace.length - 1];

  const [stepIndex, setStepIndex] = useState(0);
  // Reset to the start whenever the underlying trace changes (e.g. real
  // data arrives after the mock was shown, or a new query is run).
  useEffect(() => {
    setStepIndex(0);
  }, [activeTrace]);
  const total = globalSteps.length;
  const current = globalSteps[Math.min(stepIndex, total - 1)];
  const loopStep =
    current.phase === "loop" && current.loopStepIndex !== null
      ? activeTrace[current.loopStepIndex]
      : null;

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const restart = () => setStepIndex(0);

  const currentI = loopStep ? loopStep.i : lastLoopStep.i + 1;

  const tableRows = loopStep?.rows ?? lastLoopStep.rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={restart}>
          <RotateCcw className="mr-1.5 size-3.5" aria-hidden /> Restart
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={stepIndex === 0}
          onClick={goPrev}
          aria-label="Previous step"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span className="text-xs text-muted-foreground">
          Step {stepIndex + 1} / {total}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={stepIndex === total - 1}
          onClick={goNext}
          aria-label="Next step"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <BlankCard title="Base Rank Algorithm" highlighted={false} showToggle={false}>
          <div className="space-y-4 text-left">
            <span className="inline-block rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-900">
              i = {currentI}
            </span>
            <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {CODE_LINES.map((line, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded px-2 py-1",
                    line.indent && "pl-8",
                    current.phase === "loop" &&
                      line.step === loopStep?.lineIndex &&
                      "bg-sky-100 text-sky-900 ring-1 ring-sky-300"
                  )}
                >
                  <TexFormula>{line.tex}</TexFormula>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {loopStep?.note ?? "The while loop has finished."}
            </p>
          </div>
        </BlankCard>

        <BlankCard
          title="Result Table"
          highlighted={current.phase === "loop"}
          showToggle={false}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>i</TableHead>
                <TableHead>R_i</TableHead>
                <TableHead>E_i</TableHead>
                <TableHead>E_i-1</TableHead>
                <TableHead>E_i+1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No rows yet.
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row) => (
                  <TableRow
                    key={row.i}
                    className={cn(row.i === currentI && current.phase === "loop" && "bg-sky-50")}
                  >
                    <TableCell className="font-semibold">{row.i}</TableCell>
                    <TableCell>
                      <FormulaSet formulas={row.ri} />
                    </TableCell>
                    <TableCell>
                      <FormulaSet formulas={row.ei} />
                    </TableCell>
                    <TableCell>
                      <FormulaSet formulas={row.eiPrev} />
                    </TableCell>
                    <TableCell>
                      <FormulaSet formulas={row.eiNext} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </BlankCard>
      </div>

      <BlankCard
        title="Rank Infinity"
        highlighted={current.phase === "infinity"}
        showToggle={false}
      >
        {rankInfinity ? (
          <Kb formulas={rankInfinity.formulas} set />
        ) : (
          <p className="text-sm text-muted-foreground">
            No R∞ statements were produced.
          </p>
        )}
      </BlankCard>

      <BlankCard
        title="Final Ranking"
        highlighted={current.phase === "final"}
        showToggle={false}
      >
        <RankingTable ranking={ranks} />
      </BlankCard>
    </div>
  );
}
