import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EntailResult } from "@/components/main-tabs/common/formulas";
import { cn } from "@/lib/utils";

interface EntailmentResultCardEntailment {
  queryFormula: string;
  entailed: boolean;
}

interface EntailmentResultCardProps {
  /** Algorithm name shown as the (centered) card title. */
  title: string;
  isLoading: boolean;
  /** Only `queryFormula`/`entailed` are needed to render the defeasible entailment result. */
  entailment: EntailmentResultCardEntailment | null;
  /** Route to navigate to when the card is clicked. */
  to: string;
}

/**
 * Compact, clickable summary card for a single defeasible entailment
 * algorithm. Shows just the algorithm name and the final entailment result
 * (K ⊫ φ / K ⊭ φ, rendered with KaTeX) — no explanation. Clicking the card
 * navigates to a detail screen for that algorithm.
 */
export function EntailmentResultCard({
  title,
  isLoading,
  entailment,
  to,
}: EntailmentResultCardProps) {
  const navigate = useNavigate();

  const goToDetail = () => navigate(to);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToDetail();
        }
      }}
      className={cn(
        "w-full cursor-pointer transition-colors hover:border-app-4 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-4"
      )}
    >
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-24 flex-col items-center justify-center text-center">
        {isLoading && (
          <div className="w-full space-y-2">
            <Skeleton className="mx-auto h-6 w-2/3" />
          </div>
        )}
        {!isLoading && !entailment && (
          <p className="text-sm text-muted-foreground">No results yet</p>
        )}
        {!isLoading && entailment && (
          <EntailResult
            formula={entailment.queryFormula}
            entailed={entailment.entailed}
          />
        )}
      </CardContent>
    </Card>
  );
}
