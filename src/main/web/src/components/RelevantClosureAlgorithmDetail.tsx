import { useEffect, useMemo, useState } from "react";
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
import { RelevantClosureTraceStep } from "@/lib/relevant-closure-trace";
import { ConstantValues } from "@/lib/models";
import { RelevantClosureAlgorithm } from "./RelevantClosureStages";
import { useReasonerContext } from "@/state/reasoner.context";
import { NoResults } from "@/components/main-tabs/NoResults";

/** Full RelC pseudocode (Algorithm 3.6). */
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

function buildGlobalSteps(trace: RelevantClosureTraceStep[]): GlobalStep[] {
  return [
    ...trace.map((_, idx) => ({
      phase: "loop" as const,
      loopStepIndex: idx,
    })),
    { phase: "entailment" as const, loopStepIndex: null },
  ];
}

function RelevantClosureExplanation({
  phase,
  loopStep,
  currentI,
  antecedent,
  queryFormula,
  finalEntailed,
}: {
  phase: Phase;
  loopStep: RelevantClosureTraceStep | null;
  currentI: number;
  antecedent: string;
  queryFormula: string;
  finalEntailed: boolean;
}) {
  if (phase === "loop" && loopStep) {
    switch (loopStep.lineIndex) {
      case 0:
        return (
          <div className="space-y-1.5 text-left text-xs">
            <p>
              We check whether the union{" "}
              <Formula formula="\mathcal{\overrightarrow{R}}_\infty \cup \mathcal{\overrightarrow{R}}^- \cup \mathcal{\overrightarrow{R}}'" />{" "}
              still entails <Formula formula={`\\lnot ${antecedent}`} />, and
              whether <Formula formula="\mathcal{R}'" /> still has statements
              left in it.
            </p>

          </div>
        );
      case 1:
        return (
          <div className="space-y-1.5 text-left text-xs">
            <p>
              We remove from <Formula formula="\mathcal{R}'" /> the
              statements assigned to rank{" "}
              <Formula formula={`${currentI}`} /> that are still in it:{" "}
              <Formula formula={`\\mathcal{R}' := \\mathcal{R}' \\setminus \\{\\mathcal{R}_{${currentI}} \\cap \\mathcal{R}'\\}`} />
              .
            </p>

          </div>
        );
      case 2:
        return (
          <div className="space-y-1.5 text-left text-xs">
            <p>
              <Formula formula="i" /> is incremented so the next iteration.
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-1.5 text-left text-xs">
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
        <Formula formula={`${queryFormula.replaceAll("~>", "=>")}`} />.
      </p>
      <p>
        {finalEntailed
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
 * Reads reasoner.entailmentQueryResult.{basic,minimal}RelevantClosureTrace
 * (populated by fetchRelevantClosureDetailedTrace /
 * buildRelevantClosureTraceFromApi in reasoner.context.tsx, hitting
 * POST /api/relevant/basic/trace/detailed) when available. If no matching
 * *RelevantEntailment result has loaded yet, renders NoResults instead of
 * the stepper. The deciding-KB / entailed / query formula values are
 * derived from that entailment result already in context rather than from
 * the trace endpoint itself (that endpoint's own final-line entailment
 * check is dropped by the converter — see relevant-closure-trace.ts).
 */
export function RelevantClosureAlgorithmDetail({
  algorithm,
}: {
  algorithm: RelevantClosureAlgorithm;
}) {
  const navigate = useNavigate();
  const reasoner = useReasonerContext();

  const entailment =
    algorithm === "basic-relevant-closure"
      ? reasoner.entailmentQueryResult?.basicRelevantEntailment
      : reasoner.entailmentQueryResult?.minimalRelevantEntailment;

  const realTrace =
    algorithm === "basic-relevant-closure"
      ? reasoner.entailmentQueryResult?.basicRelevantClosureTrace
      : reasoner.entailmentQueryResult?.minimalRelevantClosureTrace;

  const activeTrace = realTrace ?? [];
  const globalSteps = useMemo(() => buildGlobalSteps(activeTrace), [activeTrace]);

  useEffect(() => {
    console.log(
      `[DEBUG] RelevantClosureAlgorithmDetail (${algorithm}) — entailment:`,
      entailment,
      `realTrace: ${realTrace ? realTrace.length + " step(s)" : "null"}`,
      realTrace,
      `globalSteps: ${globalSteps.length}`
    );
  }, [algorithm, entailment, realTrace, globalSteps]);

  const [stepIndex, setStepIndex] = useState(0);
  const total = globalSteps.length;
  const current = globalSteps[Math.min(stepIndex, total - 1)];
  const loopStep =
    current.phase === "loop" && current.loopStepIndex !== null
      ? activeTrace[current.loopStepIndex]
      : null;

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const goUp = () => navigate(`/entailment/${algorithm}/relevant-closure`);

  const currentI = loopStep?.i ?? 0;
  const tableRows = loopStep?.rows ?? [];

  const queryFormula = entailment?.queryFormula ?? "";
  const antecedent = entailment?.antecedent ?? "";
  const finalEntailed = entailment ? entailment.entailed : false;

  // Deciding KB = R-infinity ∪ R- (irrelevant) ∪ the final R' the loop
  // stopped with — mirrors RelevantClosureEntailmentBase.getDetailedRelevantJson's
  // own finalKb computation, rebuilt here from data already in context
  // (real entailment + trace) rather than duplicating it over the wire.
  const finalDecidingKb = useMemo(() => {
    if (!entailment) {
      return [];
    }

    const infinityRank = entailment.baseRanking.find(
      (rank) => rank.rankNumber === ConstantValues.INFINITY_RANK_NUMBER
    );
    const irrelevant = entailment.irrelevantRanking.flatMap(
      (rank) => rank.formulas
    );

    const lastLoopStep = activeTrace[activeTrace.length - 1];
    const lastRow = lastLoopStep?.rows[lastLoopStep.rows.length - 1];
    const finalRPrime =
      lastRow?.rPrimeAfter ??
      lastRow?.rPrimeBefore ??
      entailment.relevantRanking.flatMap((rank) => rank.formulas);

    return [...(infinityRank?.formulas ?? []), ...irrelevant, ...finalRPrime];
  }, [entailment, activeTrace]);

  if (!entailment) {
    return <NoResults />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-center text-xl font-bold">Relevant Closure</CardTitle>
        <p className="text-center text-xs text-muted-foreground">
          Step {stepIndex + 1} / {total}
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <BlankCard title="Result" showToggle={false}>
              <div className="min-h-40 text-left text-xs">
                {current.phase === "loop" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-6 px-2 py-1 text-xs">i</TableHead>
                        <TableHead className="h-6 px-2 py-1 text-xs">R' (before)</TableHead>
                        <TableHead className="h-6 px-2 py-1 text-xs">Removed</TableHead>
                        <TableHead className="h-6 px-2 py-1 text-xs">R' (after)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="px-2 py-1 text-center text-muted-foreground">
                            No rows yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        tableRows.map((row) => (
                          <TableRow
                            key={row.i}
                            className={cn(row.i === currentI && "bg-sky-50")}
                          >
                            <TableCell className="px-2 py-1 font-semibold">{row.i}</TableCell>
                            <TableCell className="px-2 py-1">
                              <FormulaSet formulas={row.rPrimeBefore} />
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <FormulaSet formulas={row.removed} />
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <FormulaSet formulas={row.rPrimeAfter} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="space-y-1.5 text-left">
                    <div>
                      <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                        Deciding KB
                      </p>
                      <div className="rounded-lg border border-border bg-muted/40 p-1.5">
                        {finalDecidingKb.length === 0 ? (
                          <span className="text-muted-foreground">∅</span>
                        ) : (
                          <Kb formulas={finalDecidingKb} name="\mathcal{D}" set />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <TexFormula>
                        {"\\mathcal{D} \\models " +
                          queryFormula.replaceAll("~>", "\\vsim ").replaceAll("!", "\\lnot ")}
                      </TexFormula>
                      {finalEntailed ? (
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
              <div className="space-y-1.5 text-left">
                <span className="inline-block rounded-md border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-xs font-semibold text-sky-900">
                  i = {currentI}
                </span>
                <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-2 text-xs">
                  {CODE_LINES.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded px-1.5 py-0.5 leading-tight",
                        line.indent && "pl-6",
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
            <div className="min-h-56">
              <RelevantClosureExplanation
                phase={current.phase}
                loopStep={loopStep}
                currentI={currentI}
                antecedent={antecedent}
                queryFormula={queryFormula}
                finalEntailed={finalEntailed}
              />
            </div>
          </BlankCard>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center gap-4 p-3 pt-0">
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
