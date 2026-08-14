import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeprecatedRelevantClosureDebugger } from "./DeprecatedRelevantClosureDebugger";

/**
 * @deprecated Not routed anywhere anymore — superseded by
 * RelevantClosureStages.tsx / RelevantClosureAlgorithmDetail.tsx.
 * Kept around for reference only.
 */
export function DeprecatedRelevantClosureCard() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Relevant Closure</CardTitle>
      </CardHeader>
      <CardContent>
        <DeprecatedRelevantClosureDebugger />
      </CardContent>
    </Card>
  );
}
