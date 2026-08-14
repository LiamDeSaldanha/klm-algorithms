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
import { cn } from "@/lib/utils";
import {
  ANTECEDENT,
  MOCK_JUSTIFICATION_TRACE,
  JustificationTraceStep,
} from "@/lib/mock/justification-trace";
import { RelevantClosureAlgorithm } from "./RelevantClosureStages";
import { useReasonerContext } from "@/state/reasoner.context";

/**
 * Explains, in prose, why the current candidate subset is or isn't a
 * justification — expands on JustificationTraceStep.note with the actual
 * reasoning (entailment + minimality) rather than just the summary line.
 */
function JustificationExplanation({
  step,
  antecedent,
}: {
  step: JustificationTraceStep;
  antecedent: string;
}) {
  const kbLabel =
    step.candidate.length === 0 ? "\\varnothing" : `\\{${step.candidate.join(", ")}\\}`;

  return (
    <div className="space-y-3 text-left text-sm">
      <p>
        We check whether the candidate subset{" "}
        <Formula formula={`\\mathcal{D} = ${kbLabel}`} />, combined with the
        classical background statements, entails the negation of the query's
        antecedent, <Formula formula={`\\lnot ${antecedent}`} />.
      </p>

      {!step.entailed && (
        <p>
          Since <Formula formula={"\\mathcal{D} \\not\\models \\lnot " + antecedent} />
          , this candidate is <strong>not</strong> a justification — it isn't
          even inconsistent with the antecedent, so it can't be responsible
          for the entailment.
        </p>
      )}

      {step.entailed && step.isMinimal && (
        <p>
          Since <Formula formula={"\\mathcal{D} \\models \\lnot " + antecedent} /> and
          no previously found justification is a subset of this candidate,
          this is a <strong>minimal</strong> entailing subset — it is added
          as a new justification.
        </p>
      )}

      {step.entailed && !step.isMinimal && (
        <p>
          Although <Formula formula={"\\mathcal{D} \\models \\lnot " + antecedent} />
          , this candidate contains an already-found justification as a
          subset. It is therefore <strong>not minimal</strong>: the smaller
          justification alone is already sufficient, so this larger set is
          redundant and isn't itself counted as a justification.
        </p>
      )}

      {step.note && <p className="text-muted-foreground">{step.note}</p>}
    </div>
  );
}

/**
 * Drill-in screen reached via the down arrow from the Partition stage of
 * RelevantClosureStages. Three panels: top-left accumulates the
 * justifications found so far, bottom-left shows the current powerset
 * candidate subset and its entailed/minimal check, and the right panel
 * explains why (or why not) that candidate is a justification. Left/right
 * step through the powerset candidate-by-candidate; up returns to the
 * Partition stage screen.
 *
 * Reads reasoner.entailmentQueryResult.justificationTrace (populated by
 * fetchJustificationTrace / buildJustificationTraceFromApi in
 * reasoner.context.tsx) when available, falling back to
 * MOCK_JUSTIFICATION_TRACE — see lib/mock/justification-trace.ts — if the
 * trace hasn't loaded yet or the fetch failed.
 */
export function PartitionJustificationDetail({
  algorithm,
}: {
  algorithm: RelevantClosureAlgorithm;
}) {
  const navigate = useNavigate();
  const reasoner = useReasonerContext();
  const [stepIndex, setStepIndex] = useState(0);
  const steps =
    reasoner.entailmentQueryResult?.justificationTrace ??
    MOCK_JUSTIFICATION_TRACE;
  const step = steps[stepIndex];
  const total = steps.length;
  const antecedent =
    reasoner.queryInput?.queryFormula?.split("~>")[0]?.trim() || ANTECEDENT;

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const goUp = () => navigate(`/entailment/${algorithm}/partition`);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Partition</CardTitle>
        <p className="text-center text-xs text-muted-foreground">
          Candidate {step.candidateNumber} / {total}
        </p>
        <p className="text-center text-sm">
        We will iterate all combinations of the defeasible knowledge base to find the justifications w.r.t to the query
        </p>

      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <BlankCard title="Justifications Found" showToggle={false}>
              <div className="h-36 overflow-y-auto pr-1">
                {step.justificationsSoFar.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No justifications found yet.
                  </p>
                ) : (
                  <ol className="space-y-2 text-left">
                    {step.justificationsSoFar.map((just, idx) => (
                      <li key={idx} className="rounded-lg border border-border p-2">
                        <Kb formulas={just} name={`\\mathcal{J}_{${idx + 1}}`} set />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </BlankCard>

            <BlankCard
              title="Candidate Subset"
              highlighted={step.entailed && !!step.isMinimal}
              showToggle={false}
            >
              <div className="h-36 space-y-4 overflow-y-auto pr-1 text-left">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  {step.candidate.length === 0 ? (
                    <span className="text-muted-foreground">∅</span>
                  ) : (
                    <Kb formulas={step.candidate} name="\mathcal{D}" set />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <TexFormula>{"\\mathcal{D} \\models \\lnot " + antecedent}</TexFormula>
                  {step.entailed ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                      <Check className="size-3.5" aria-hidden /> entailed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <X className="size-3.5" aria-hidden /> not entailed
                    </span>
                  )}
                  {step.entailed && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        step.isMinimal
                          ? "border border-sky-300 bg-sky-50 text-sky-900"
                          : "border border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {step.isMinimal ? "minimal" : "not minimal"}
                    </span>
                  )}
                </div>
              </div>
            </BlankCard>
          </div>

          <BlankCard title="Explanation" showToggle={false}>
            <div className="h-80 overflow-y-auto pr-1">
              <JustificationExplanation step={step} antecedent={antecedent} />
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
          aria-label="Previous candidate"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <Button variant="outline" size="icon" onClick={goUp} aria-label="Back to partition">
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={stepIndex === total - 1}
          aria-label="Next candidate"
        >
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </CardFooter>
    </Card>
  );
}
