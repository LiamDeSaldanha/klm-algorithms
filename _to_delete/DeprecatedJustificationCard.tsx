import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeprecatedJustificationDebugger } from "./DeprecatedJustificationDebugger";

/**
 * @deprecated Not routed anywhere anymore — superseded by
 * PartitionJustificationDetail.tsx. Kept around for reference only.
 */
export function DeprecatedJustificationCard() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Justification</CardTitle>
      </CardHeader>
      <CardContent>
        <DeprecatedJustificationDebugger />
      </CardContent>
    </Card>
  );
}
