import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DeprecatedBaseRankDebugger } from "./DeprecatedBaseRankDebugger";
import { ResultSkeleton } from "@/components/main-tabs/ResultSkeleton";
import { NoResults } from "@/components/main-tabs/NoResults";
import { IBaseRankExplanation, ConstantValues } from "@/lib/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RankingTable } from "@/components/main-tabs/tables/ranking-table";
import { BaseRankTraceStep } from "@/lib/mock/base-rank-trace";

interface DeprecatedBaseRankCardProps {
  isLoading: boolean;
  baseRankExplanation: IBaseRankExplanation | null;
  baseRankTrace?: BaseRankTraceStep[] | null;
}

/**
 * @deprecated Not routed anywhere anymore — superseded by
 * EntailmentResultCard.tsx (the summary grid) plus BaseRankAlgorithmDetail.tsx
 * (the drill-in). Kept around for reference only.
 */
export function DeprecatedBaseRankCard({
  isLoading,
  baseRankExplanation,
  baseRankTrace,
}: DeprecatedBaseRankCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return <ResultSkeleton />;
  if (!baseRankExplanation) return <NoResults />;

  const { ranks } = baseRankExplanation;

  const rankInfinity = ranks.find(
    (rank) => rank.rankNumber === ConstantValues.INFINITY_RANK_NUMBER
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-2xl font-bold">Base Rank</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1.5 size-3.5" aria-hidden /> Hide debugger
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 size-3.5" aria-hidden /> Show debugger
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {expanded ? (
          <DeprecatedBaseRankDebugger
            rankInfinity={rankInfinity}
            ranks={ranks}
            trace={baseRankTrace}
          />
        ) : (
          <RankingTable ranking={ranks} />
        )}
      </CardContent>
    </Card>
  );
}
