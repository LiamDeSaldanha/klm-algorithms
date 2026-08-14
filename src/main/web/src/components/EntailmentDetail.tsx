import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelevantClosureStages } from "./RelevantClosureStages";

const ALGORITHM_TITLES: Record<string, string> = {
  "rational-closure": "Rational Closure",
  "lexicographic-closure": "Lexicographic Closure",
  "basic-relevant-closure": "Basic Relevant Closure",
  "minimal-relevant-closure": "Minimal Relevant Closure",
};

/**
 * Detail screen for a single entailment algorithm, reached by clicking its
 * EntailmentResultCard on the entailment tab. Basic/Minimal Relevant
 * Closure get the Partition -> Base Rank -> Relevant Closure stage stepper
 * (RelevantClosureStages); Rational/Lexicographic Closure are still a
 * blank placeholder for now.
 */
export function EntailmentDetail() {
  const { algorithm } = useParams<{ algorithm: string }>();

  if (algorithm === "basic-relevant-closure" || algorithm === "minimal-relevant-closure") {
    return <RelevantClosureStages algorithm={algorithm} />;
  }

  const title = (algorithm && ALGORITHM_TITLES[algorithm]) || "Algorithm Detail";

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
