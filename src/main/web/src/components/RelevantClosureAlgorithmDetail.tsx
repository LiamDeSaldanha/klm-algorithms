import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUp, ArrowRight, Check, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlankCard } from "./BlankCard";
import { Formula, Kb } from "@/components/main-tabs/common/formulas";
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
  RelevantClosureTraceStep,
} from "@/lib/mock/relevant-closure-trace";
import { RelevantClosureAlgorithm } from "./RelevantClosureStages";

/** Full RelC pseudocode (Algorithm 3.6) — same as DeprecatedRelevantClosureDebugger. */
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

function RelevantClosureExplanation({
  phase,
  loopStep,
  currentI,
}: {
  phase: Phase;
  loopStep: RelevantClosureTraceStep | null;
  currentI: number;
}) {
  if (phase === "loop" && loopStep) {
    switch (loopStep.lineIndex) {
      case 0:
        return (
          <div className="space-y-3 text-left text-sm">
            <p>
              We check whether the union{" "}
              <Formula formula="\mathcal{\overrightarrow{R}}_\infty \cup \mathcal{\overrightarrow{R}}^- \cup \mathcal{\overrightarrow{R}}'" />{" "}
              still entails <Formula formula={`\\lnot ${ANTECEDENT}`} />, and
              whether <Formula formula="\mathcal{R}'" /> still has statements
              left in it.
            </p>
            <p>
              If both hold, <Formula formula="\mathcal{R}'" /> still contains
              something responsible for the inconsistency, so we keep
              refining it. If either fails, we stop — either the
              inconsistency is gone, or there's nothing left to remove.
            </p>
            <p className="text-muted-foreground">{loopStep.note}</p>
          </div>
        );
      case 1:
        return (
          <div className="space-y-3 text-left text-sm">
            <p>
              We remove from <Formula formula="\mathcal{R}'" /> the
              statements assigned to rank{" "}
              <Formula formula={`${currentI}`} /> that are still in it:{" "}
              <Formula formula={`\\mathcal{R}' := \\mathcal{R}' \\setminus \\{\\mathcal{R}_{${currentI}} \\cap \\mathcal{R}'\\}`} />
              .
            </p>
            <p>
              Rank <Formula formula={`${currentI}`} /> is the most typical
              rank not yet considered, so these are the next statements to
              give up in order to restore consistency with the antecedent.
            </p>
            <p className="text-muted-foreground">{loopStep.note}</p>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3 text-left text-sm">
            <p>
              <Formula formula="i" /> is incremented so the next iteration
              considers rank <Formula formula={`${currentI}`} />, moving on to
              slightly less typical statements if refinement needs to
              continue.
            </p>
            <p className="text-muted-foreground">{loopStep.note}</p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-3 text-left text-sm">
      <p>
        The loop has stopped, leaving a refined{" "}
        <Formula formula="\mathcal{R}'" />. The deciding knowledge base is{" "}
        <Formula formula="\mathcal{D} = \mathcal{R}_\infty \cup \mathcal{R}^- \cup \mathcal{R}'" />
        .
      </p>
      <p>
        We now run a separate check against the actual query — not the
        antecedent-consistency check the loop was running, but whether{" "}
        <Formula formula="\mathcal{D}" /> classically entails{" "}
        <Formula formula={`${QUERY_FORMULA.replaceAll("~>", "=>")}`} />.
      </p>
      <p>
        {FINAL_ENTAILED
          ? "It does, so the query is entailed by Relevant Closure."
          : "It doesn't, so the query is not entailed by Relevant Closure."}
      </p>
    </div>
  );
}

/**
 * Drill-in screen reached via the down arrow from the Relevant Closure
 * stage of RelevantClosureStages. Same 3-panel shape as the other two
 * detail screens: top-left is the Result (the growing R' trace table while
 * looping, then the deciding-KB entailment check once the loop
 * terminates), bottom-left is the Algorithm (RelC pseudocode, highlighted
 * line-by-line), and the right panel explains the current step. Left/right
 * step through the algorithm; up returns to the Relevant Closure stage
 * screen.
 *
 * The trace is mock data — see lib/mock/relevant-closure-trace.ts — until
 * a real per-iteration trace endpoint exists.
 */
export function RelevantClosureAlgorithmDetail({
  algorithm,
}: {
  algorithm: RelevantClosureAlgorithm;
}) {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const total = GLOBAL_STEPS.length;
  const current = GLOBAL_STEPS[stepIndex];
  const loopStep =
    current.phase === "loop" && current.loopStepIndex !== null
      ? MOCK_RELEVANT_CLOSURE_TRACE[current.loopStepIndex]
      : null;

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const goUp = () => navigate(`/entailment/${algorithm}/relevant-closure`);

  const currentI = loopStep?.i ?? 0;
  const tableRows = loopStep?.rows ?? [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Relevant Closure</CardTitle>
        <p className="text-center text-xs text-muted-foreground">
          Step {stepIndex + 1} / {total}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <BlankCard title="Result" showToggle={false}>
              <div className="h-36 overflow-y-auto pr-1">
                {current.phase === "loop" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>i</TableHead>
                        <TableHead>R' (before)</TableHead>
                        <TableHead>Removed</TableHead>
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
                            className={cn(row.i === currentI && "bg-sky-50")}
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
                ) : (
                  <div className="space-y-3 text-left">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Deciding KB
                      </p>
                      <div className="rounded-lg border border-border bg-muted/40 p-2">
                        {FINAL_DECIDING_KB.length === 0 ? (
                          <span className="text-muted-foreground">∅</span>
                        ) : (
                          <Kb formulas={FINAL_DECIDING_KB} name="\mathcal{D}" set />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <TexFormula>
                        {"\\mathcal{D} \\models " +
                          QUERY_FORMULA.replaceAll("~>", "\\vsim ").replaceAll("!", "\\lnot ")}
                      </TexFormula>
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
                  </div>
                )}
              </div>
            </BlankCard>

            <BlankCard title="Algorithm" showToggle={false}>
              <div className="space-y-4 text-left">
                <span className="inline-block rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-900">
                  i = {currentI}
                </span>
                <div className="h-36 overflow-y-auto overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-sm">
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
              </div>
            </BlankCard>
          </div>

          <BlankCard title="Explanation" showToggle={false}>
            <div className="h-80 overflow-y-auto pr-1">
              <RelevantClosureExplanation
                phase={current.phase}
                loopStep={loopStep}
                currentI={currentI}
              />
            </div>
          </BlankCard>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrev}
          disabled={stepIndex === 0}
          aria-label="Previous step"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <Button variant="outline" size="icon" onClick={goUp} aria-label="Back to relevant closure">
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={stepIndex === total - 1}
          aria-label="Next step"
        >
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </CardFooter>
    </Card>
  );
}
