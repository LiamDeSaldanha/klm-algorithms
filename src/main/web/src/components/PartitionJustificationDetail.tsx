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
import { JustificationTraceStep } from "@/lib/justification-trace";
import { RelevantClosureAlgorithm } from "./RelevantClosureStages";
import { useReasonerContext } from "@/state/reasoner.context";
import { NoResults } from "@/components/main-tabs/NoResults";

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
    <div className="space-y-1.5 text-left text-xs">
      <p>
        We check whether the candidate subset{" "}
        <Formula formula={`\\mathcal{D} = ${kbLabel}`} />, combined with the
        classical background statements, entails the negation of the query's
        antecedent, <Formula formula={`\\lnot ${antecedent}`} />.
      </p>

      {!step.entailed && (
        <p>
          Since <Formula formula={"\\mathcal{D} \\not\\models \\lnot " + antecedent} />
          , this candidate is <strong>not</strong> a justification.
        </p>
      )}

      {step.entailed && step.isMinimal && (
        <p>
          Since <Formula formula={"\\mathcal{D} \\models \\lnot " + antecedent} /> and
          there is no possible subset of this candidate set where the antecendent is exceptional.
          This <strong>is</strong> a justification.
        </p>
      )}

      {step.entailed && !step.isMinimal && (
        <p>
          <strong>Although</strong > <Formula formula={"\\mathcal{D} \\models \\lnot " + antecedent} />
          , there exists a subset of this candidate set where the antecedent is exceptional therefore, this candidate set
          is <strong>not</strong> a justification.
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
 * reasoner.context.tsx) when available. If no trace has loaded yet (or the
 * fetch failed), renders NoResults instead of the stepper.
 */
export function PartitionJustificationDetail({
  algorithm,
}: {
  algorithm: RelevantClosureAlgorithm;
}) {
  const navigate = useNavigate();
  const reasoner = useReasonerContext();
  const [stepIndex, setStepIndex] = useState(0);
  const steps = reasoner.entailmentQueryResult?.justificationTrace ?? [];

  if (steps.length === 0) {
    return <NoResults />;
  }



  const total = steps.length+1;
  const getStep = (index: number) => {
      const clamped = Math.min(Math.max(index, 0), total - 1);
      // clamped can be steps.length (the extra virtual step) — return undefined for that
      return steps[clamped];
    };
  const step = getStep(stepIndex);
  // queryFormula comes back parenthesised, e.g. "(p~>f)" — strip the
  // parens before splitting on "~>" (same approach as EntailmentModelBase's
  // own `antecedent` getter in lib/models/index.ts), otherwise this ends up
  // as "(p" instead of "p".
  const antecedent =
    reasoner.queryInput?.queryFormula
      ?.replaceAll("(", "")
      .replaceAll(")", "")
      .split("~>")[0]
      ?.trim() || "";

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const goToStep = (index: number) => {
    setStepIndex(Math.min(Math.max(index, 0), total - 1));
  };

  const goUp = () => navigate(`/entailment/${algorithm}/partition`);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-0.5 p-4 pb-2">
        <CardTitle className="text-center text-xl font-bold">Partition</CardTitle>
        {stepIndex !== total-1?(<p className="text-center text-xs ">
          Candidate { step.candidateNumber} / {total}
        </p>):(

            <p className="text-center text-xs ">
            Creating the relevant partition
            </p>)

        }
        <p className="text-center text-xs ">
        We will iterate all combinations of the defeasible knowledge base to find justifications w.r.t to the query. Using these justifications
        we can construct the relevant partition.
        </p>

      </CardHeader>

      {stepIndex !== total-1?(<CardContent className="p-4 pt-0">
        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <BlankCard title="Justifications Found" showToggle={false}>
              <div className="min-h-32 text-left">
                {step.justificationsSoFar.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No justifications found yet.
                  </p>
                ) : (
                  <ol className="space-y-1 text-left text-xs">
                    {step.justificationsSoFar.map((just, idx) => (
                      <li key={idx} className="rounded-lg border border-border p-1.5">
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
              <div className="min-h-32 space-y-2 text-left text-xs">
                <div className="rounded-lg border border-border bg-muted/40 p-1.5">
                  {step.candidate.length === 0 ? (
                    <span className="text-muted-foreground">∅</span>
                  ) : (
                    <Kb formulas={step.candidate} name="\mathcal{D}" set />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
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
            <div className="min-h-56">

              <JustificationExplanation step={step} antecedent={antecedent} />


            </div>
          </BlankCard>
        </div>
      </CardContent>):
      (
          <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
                    <div className="flex flex-col gap-3">
                      <BlankCard title="Relevant Partition" showToggle={false}>
                        <div className="min-h-32 text-left">
                          {getStep(stepIndex-1).justificationsSoFar.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No justifications found yet.
                            </p>
                          ) : (
                            <ol className="space-y-1 text-left text-xs">
                              {getStep(stepIndex-1).justificationsSoFar.map((just, idx) => (
                                <li key={idx} className="rounded-lg border border-border p-1.5">
                                  <Kb formulas={just} name={`\\mathcal{J}_{${idx + 1}}`} set />
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </BlankCard>


                    </div>

                    <BlankCard title="Explanation" showToggle={false}>
                      <div className="min-h-56">

                        <div className="space-y-1.5 text-left text-xs">
                              <p>
                                After traversing all the subsets of our defeasible knowledge base we create the relevant partition.
                                This involves simply taking the union of all the justifications we have found. To create the irrelevant partition
                                we take all the defeasible statements not in the relevant partition but are in the defeasible knowledge base.
                    </p>

                            </div>


                      </div>
                    </BlankCard>
                  </div>
                </CardContent>
          )
      }
      <CardFooter className="flex items-center justify-center gap-4 p-3 pt-0">
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
