import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlankCard } from "./BlankCard";
import { Kb } from "@/components/main-tabs/common/formulas";

interface RelevancePartitionProps {
  relevant: string[];
  irrelevant: string[];
}

/**
 * The relevant/irrelevant partition grid on its own, with no outer Card —
 * shared by RelevancePartitionCard below and the Partition stage of
 * RelevantClosureStages so both render the exact same thing.
 */
export function RelevancePartitionBody({
  relevant,
  irrelevant,
}: RelevancePartitionProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-6">
      <BlankCard title="Relevant" showToggle={false}>
        {relevant.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No relevant statements.
          </p>
        ) : (
          <Kb formulas={relevant} name="\mathcal{R}^{+}" set />
        )}
      </BlankCard>

      <BlankCard title="Irrelevant" showToggle={false}>
        {irrelevant.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No irrelevant statements.
          </p>
        ) : (
          <Kb formulas={irrelevant} name="\mathcal{R}^{-}" set />
        )}
      </BlankCard>
    </div>
  );
}

/**
 * Shows the relevance partition, R+ and R-, computed by (Basic/Minimal)
 * Relevant Closure: the statements in K relevant to the query's antecedent
 * (left) versus everything else (right). `relevant`/`irrelevant` are plain
 * flattened formula lists (not grouped by rank).
 */
export function RelevancePartitionCard({
  relevant,
  irrelevant,
}: RelevancePartitionProps) {
  return (
    <Card className="w-full" >
      <CardHeader>

        <CardTitle className="text-2xl font-bold">Relevance Partition</CardTitle>
      </CardHeader>
      <CardContent>

        <RelevancePartitionBody relevant={relevant} irrelevant={irrelevant} />
      </CardContent>
    </Card>
  );
}
