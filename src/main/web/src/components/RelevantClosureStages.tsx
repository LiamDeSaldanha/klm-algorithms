import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowDown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RelevancePartitionBody } from "./RelevancePartitionCard";
import { RankingTable } from "@/components/main-tabs/tables/ranking-table";
import { EntailResult } from "@/components/main-tabs/common/formulas";
import { NoResults } from "@/components/main-tabs/NoResults";
import { useReasonerContext } from "@/state/reasoner.context";
import { Formula, Kb } from "@/components/main-tabs/common/formulas";
const STAGES = ["partition", "base-rank", "relevant-closure"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_TITLES: Record<Stage, string> = {
  "partition": "Partition",
  "base-rank": "Base Rank",
  "relevant-closure": "Relevant Closure",
};

export type RelevantClosureAlgorithm =
  | "basic-relevant-closure"
  | "minimal-relevant-closure";

/**
 * Stage-by-stage screen for Basic/Minimal Relevant Closure, reached from
 * their EntailmentResultCard on the entailment tab. Left/right arrows move
 * between the three high-level stages of the algorithm (Partition -> Base
 * Rank -> Relevant Closure); the down arrow will eventually drill into a
 * detailed 3-panel view of the current stage (blank for now).
 */
export function RelevantClosureStages({
  algorithm,
}: {
  algorithm: RelevantClosureAlgorithm;
}) {
  const { stage } = useParams<{ stage?: string }>();
  const navigate = useNavigate();
  const reasoner = useReasonerContext();

  const entailment =
    algorithm === "basic-relevant-closure"
      ? reasoner.entailmentQueryResult?.basicRelevantEntailment
      : reasoner.entailmentQueryResult?.minimalRelevantEntailment;

  const requestedIndex = STAGES.indexOf((stage as Stage) ?? "partition");
  const currentIndex = requestedIndex === -1 ? 0 : requestedIndex;
  const currentStage = STAGES[currentIndex];

  const goToStage = (index: number) => {
    const clamped = Math.max(0, Math.min(STAGES.length - 1, index));
    navigate(`/entailment/${algorithm}/${STAGES[clamped]}`);
  };

  const goDown = () => navigate(`/entailment/${algorithm}/${currentStage}/detail`);

  return (
    <Card className="w-full">
      <CardHeader className="text-center text-l">
        <CardTitle className="text-center text-2xl font-bold">
          {STAGE_TITLES[currentStage]}
        </CardTitle>


      </CardHeader>
      <CardContent className="text-center h-72 overflow-y-auto">
       {entailment && currentStage === "partition" && (
                <div>
                <p className="text-sm">
                                 Relevant Closure splits a defeasible knowledge base into relevant and irrelevant statment's
                                 in relation to the query. The relevant partition is defined as the union of all Justifications and the
                                 irrelevant partition is the remaining defeasible statements in the knowledge base. A Justification is the smallest set
                                 where the antecedent of a query is exceptional. A justification is mathematically defined as:</p>
                                 <Formula formula={`\\text{Given knwoledge base }\\mathcal{K} \\text{ and a propositional statement } \\alpha\\text{. Let }\\mathcal{J}\\subset\\mathcal{K}`} />
                                 <Formula formula={`\\mathcal{J}\\text{ is a }\\alpha \\text{ justification wrt }\\mathcal{K}\\text{ if }\\alpha \\text{ is exceptional in } \\mathcal{J} \\text{ and for any } \\mathcal{J}'\\subset \\mathcal{J} \\text{ }\\alpha \\text{ is not exceptional}`} />

                                 <p className="text-sm"> For basic relevant closure the partition is defined mathematically as:
                                 </p>
                                 <Formula formula={`\\mathcal{J}^{\\mathcal{K}}_{\\text{basic}}(\\alpha) = \\{\\mathcal{J} | \\mathcal{J} \\text{ is an }\\alpha \\text{ justification w.r.t }\\mathcal{K}\\}`} />

                </div>

                )}

        <div className="flex min-h-full flex-col items-center justify-center">
          {!entailment && <NoResults />}

          {entailment && currentStage === "partition" && (

            <RelevancePartitionBody

              relevant={entailment.relevantRanking.flatMap((rank) => rank.formulas)}
              irrelevant={entailment.irrelevantRanking.flatMap((rank) => rank.formulas)}
            />
          )}

          {entailment && currentStage === "base-rank" && (
            <div className="w-full">
              <RankingTable ranking={entailment.baseRanking} />
            </div>
          )}

          {entailment && currentStage === "relevant-closure" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Checking whether the refined knowledge base entails the query.
              </p>
              <EntailResult
                formula={entailment.queryFormula}
                entailed={entailment.entailed}
              />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToStage(currentIndex - 1)}
          disabled={currentIndex === 0}
          aria-label="Previous stage"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goDown}
          aria-label="Stage detail"
        >
          <ArrowDown className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToStage(currentIndex + 1)}
          disabled={currentIndex === STAGES.length - 1}
          aria-label="Next stage"
        >
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </CardFooter>
    </Card>
  );
}
