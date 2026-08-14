import { useState } from "react";
import { Check, X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlankCard } from "./BlankCard";
import { Kb } from "@/components/main-tabs/common/formulas";
import { TexFormula } from "@/components/main-tabs/common/TexFormula";
import { cn } from "@/lib/utils";
import {
  ANTECEDENT,
  MOCK_JUSTIFICATION_TRACE,
} from "@/lib/mock/justification-trace";

/**
 * @deprecated Not routed anywhere anymore — superseded by
 * PartitionJustificationDetail.tsx (the 3-panel drill-in reached from
 * RelevantClosureStages' Partition stage). Kept around for reference only.
 *
 * Step-through debugger for the (brute-force) justification search: walk
 * the powerset of the defeasible knowledge base smallest-subset-first,
 * check whether each candidate entails the negation of the query's
 * antecedent, and keep the minimal entailing subsets as justifications.
 *
 * The candidate-by-candidate trace is mock data — see
 * lib/mock/justification-trace.ts — until a real per-candidate trace
 * endpoint exists.
 */
export function DeprecatedJustificationDebugger() {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = MOCK_JUSTIFICATION_TRACE;
  const step = steps[stepIndex];
  const total = steps.length;

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const restart = () => setStepIndex(0);

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
          aria-label="Previous candidate"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span className="text-xs text-muted-foreground">
          Candidate {step.candidateNumber} / {total}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={stepIndex === total - 1}
          onClick={goNext}
          aria-label="Next candidate"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <BlankCard
          title="Candidate Subset"
          highlighted={step.entailed && !!step.isMinimal}
          showToggle={false}
        >
          <div className="space-y-4 text-left">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              {step.candidate.length === 0 ? (
                <span className="text-muted-foreground">∅</span>
              ) : (
                <Kb formulas={step.candidate} name="\mathcal{D}" set />
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <TexFormula>{"\\mathcal{D} \\models \\lnot " + ANTECEDENT}</TexFormula>
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

            <p className="text-sm text-muted-foreground">{step.note}</p>
          </div>
        </BlankCard>

        <BlankCard title="Justifications Found" showToggle={false}>
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
        </BlankCard>
      </div>
    </div>
  );
}
