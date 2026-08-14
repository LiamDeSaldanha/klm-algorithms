import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartitionJustificationDetail } from "./PartitionJustificationDetail";
import { BaseRankAlgorithmDetail } from "./BaseRankAlgorithmDetail";
import { RelevantClosureAlgorithmDetail } from "./RelevantClosureAlgorithmDetail";
import { RelevantClosureAlgorithm } from "./RelevantClosureStages";

const STAGE_TITLES: Record<string, string> = {
  partition: "Partition",
  "base-rank": "Base Rank",
  "relevant-closure": "Relevant Closure",
};

function isRelevantClosureAlgorithm(
  algorithm?: string
): algorithm is RelevantClosureAlgorithm {
  return algorithm === "basic-relevant-closure" || algorithm === "minimal-relevant-closure";
}

/**
 * Destination for the down arrow on a RelevantClosureStages screen. The
 * Partition stage drills into PartitionJustificationDetail (the powerset /
 * justification-search 3-panel view), the Base Rank stage drills into
 * BaseRankAlgorithmDetail (the algorithm / growing ranking table 3-panel
 * view), and the Relevant Closure stage drills into
 * RelevantClosureAlgorithmDetail (the RelC while-loop 3-panel view).
 */
export function EntailmentStageDetail() {
  const { algorithm, stage } = useParams<{ algorithm: string; stage?: string }>();

  if (stage === "partition" && isRelevantClosureAlgorithm(algorithm)) {
    return <PartitionJustificationDetail algorithm={algorithm} />;
  }

  if (stage === "base-rank" && isRelevantClosureAlgorithm(algorithm)) {
    return <BaseRankAlgorithmDetail algorithm={algorithm} />;
  }

  if (stage === "relevant-closure" && isRelevantClosureAlgorithm(algorithm)) {
    return <RelevantClosureAlgorithmDetail algorithm={algorithm} />;
  }

  const title = (stage && STAGE_TITLES[stage]) || "Detail";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-64 items-center justify-center text-center text-muted-foreground">
        Coming soon.
      </CardContent>
    </Card>
  );
}
