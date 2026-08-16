import { useState } from "react";
import { Check, X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  MOCK_RELEVANT_CLOSURE_TRACE,
  FINAL_DECIDING_KB,
  FINAL_ENTAILED,
  QUERY_FORMULA,
  ANTECEDENT,
} from "@/lib/mock/relevant-closure-trace";

/**
 * Full RelC (Relevant Closure) pseudocode (Algorithm 3.6), comments left
 * out. Rendered with KaTeX. Lines that correspond to a step in the
 * while-loop trace carry a `step` matching
 * RelevantClosureTraceStep.lineIndex (0-2) and get highlighted as the
 * stepper moves through the loop; all other lines are static.
 */
const CODE_LINES: { tex: string; indent?: boolean; step?: number }[] = [
  {
    tex: "\\text{Input: A defeasible knowledge base } \\mathcal{K} \\text{, a defeasible query } \\alpha \\vsim \\beta \\text{ and a partition } \\langle \\mathcal{R}, \\mathcal{R}^- \\rangle \\text{ of } \\mathcal{K}",
  },
  {
    tex: "\\text{Output: If } \\mathcal{K} \\models_{RelC} \\alpha \\vsim \\beta \\text{, then return true otherwise false}",
  },
  { tex: "(\\mathcal{R}_0, \\dots, \\mathcal{R}_{n-1}, \\mathcal{R}_\\infty, n) := \\text{BaseRank}(\\mathcal{K})" },
  { tex: "i := 0" },
  { tex: "\\mathcal{R}' := \\mathcal{R}" },
  {
    tex: "\\textbf{while}\\ (\\mathcal{\\overrightarrow{R}}_\\infty \\cup \\mathcal{\\overrightarrow{R}}^- \\cup \\mathcal{\\overrightarrow{R}}') \\models \\neg\\alpha\\ \\textbf{and}\\ \\mathcal{R}' \\neq \\varnothing\\ \\textbf{do}",
    step: 0,
  },
  { tex: "\\mathcal{R}' := \\mathcal{R}' \\setminus \\{\\mathcal{R}_i \\cap \\mathcal{R}'\\}", indent: true, step: 1 },
  { tex: "i := i + 1", indent: true, step: 2 },
  { tex: "\\textbf{end}" },
  {
    tex: "\\textbf{return}\\ (\\mathcal{\\overrightarrow{R}}_\\infty \\cup \\mathcal{\\overrightarrow{R}}^- \\cup \\mathcal{\\overrightarrow{R}}') \\models \\alpha \\to \\beta",
  },
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

type Phase = "loop" | "entailment";

interface GlobalStep {
  phase: Phase;
  loopStepIndex: number | null;
}

const GLOBAL_STEPS: GlobalStep[] = [
  ...MOCK_RELEVANT_CLOSURE_TRACE.map((_, idx) => ({
    phase: "loop" as const,
    loopStepIndex: idx,
  })),
  { phase: "entailment", loopStepIndex: null },
];

/**
 * @deprecated Not routed anywhere anymore — superseded by
 * RelevantClosureAlgorithmDetail.tsx (the 3-panel drill-in reached from
 * RelevantClosureStages' Relevant Closure stage). Kept around for
 * reference only.
 *
 * Step-through debugger for the Relevant Closure while-loop that repeatedly
 * strips rank-i relevant statements out of R' until either the union
 * (R0 ∪ R- ∪ R') no longer entails ¬α, or R' is exhausted. As with the
 * BaseRank debugger, the highlight transfers from the whole Relevant
 * Closure card down to the specific active pseudocode line while stepping.
 *
 * The loop trace is mock data — see lib/mock/relevant-closure-trace.ts —
 * until a real per-iteration trace endpoint exists.
 */
export function DeprecatedRelevantClosureDebugger() {
  const [stepIndex, setStepIndex] = useState(0);
  const total = GLOBAL_STEPS.length;
  const current = GLOBAL_STEPS[stepIndex];
  const loopStep =
    current.phase === "loop" && current.loopStepIndex !== null
      ? MOCK_RELEVANT_CLOSURE_TRACE[current.loopStepIndex]
      : null;

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const restart = () => setStepIndex(0);

  const currentI = loopStep?.i ?? 0;
  const tableRows = loopStep?.rows ?? [];

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
        <BlankCard title="Relevant Closure" highlighted={false} showToggle={false}>
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
              {loopStep?.note ??
                "Step forward to enter the while loop."}
            </p>
          </div>
        </BlankCard>

        <BlankCard
          title="R' Trace"
          highlighted={current.phase === "loop"}
          showToggle={false}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>i</TableHead>
                <TableHead>R' (before)</TableHead>
                <TableHead>R_i ∩ R (removed)</TableHead>
                <TableHead>R' (after)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                      <FormulaSet formulas={row.rPrimeBefore} />
                    </TableCell>
                    <TableCell>
                      <FormulaSet formulas={row.removed} />
                    </TableCell>
                    <TableCell>
                      <FormulaSet formulas={row.rPrimeAfter} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {loopStep?.terminated && (
            <p className="mt-3 text-sm text-muted-foreground">
              Loop terminated: either (R0 ∪ R- ∪ R') no longer entails ¬{"p"}, or R' is exhausted.
            </p>
          )}
        </BlankCard>
      </div>

      <BlankCard
        title="Entailment Check"
        highlighted={current.phase === "entailment"}
        showToggle={false}
      >
        <div className="space-y-4 text-left">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Deciding KB (R0 ∪ R- ∪ R' at termination)
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              {FINAL_DECIDING_KB.length === 0 ? (
                <span className="text-muted-foreground">∅</span>
              ) : (
                <Kb formulas={FINAL_DECIDING_KB} name="\mathcal{D}" set />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <TexFormula>{"\\mathcal{D} \\models " + QUERY_FORMULA.replaceAll("~>", "\\vsim ").replaceAll("!", "\\lnot ")}</TexFormula>
            {FINAL_ENTAILED ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                <Check className="size-3.5" aria-hidden /> entailed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <X className="size-3.5" aria-hidden /> not entailed
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Once the while loop terminates, the deciding knowledge base is
            checked against the original query — a separate check from the
            ¬{ANTECEDENT} consistency test the loop itself was running.
          </p>
        </div>
      </BlankCard>
    </div>
  );
}
