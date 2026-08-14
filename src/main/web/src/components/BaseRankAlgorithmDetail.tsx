import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUp, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlankCard } from "./BlankCard";
import { Formula } from "@/components/main-tabs/common/formulas";
import { TexFormula } from "@/components/main-tabs/common/TexFormula";
import { RankingTable } from "@/components/main-tabs/tables/ranking-table";
import { cn } from "@/lib/utils";
import {
  BaseRankTraceStep,
  MOCK_BASE_RANK_TRACE,
} from "@/lib/mock/base-rank-trace";
import { ConstantValues, Ranking } from "@/lib/models";
import { RelevantClosureAlgorithm } from "./RelevantClosureStages";

/** Full BaseRank pseudocode (Algorithm 1) — same as DeprecatedBaseRankDebugger. */
const CODE_LINES: { tex: string; indent?: boolean; step?: number }[] = [
  { tex: "\\text{Input: A knowledge base } \\mathcal{K}" },
  {
    tex: "\\text{Output: An ordered tuple } (\\mathcal{R}_0, \\dots, \\mathcal{R}_{n-1}, \\mathcal{R}_\\infty, n)",
  },
  { tex: "i := 0" },
  { tex: "\\mathcal{E}_0 := \\mathcal{\\overrightarrow{K}}" },
  { tex: "\\textbf{while}\\ \\mathcal{E}_{i-1} \\neq \\mathcal{E}_i\\ \\textbf{do}", step: 0 },
  {
    tex: "\\mathcal{E}_{i+1} := \\{\\alpha \\to \\beta \\in \\mathcal{E}_i \\mid \\mathcal{E}_i \\models \\neg\\alpha\\}",
    indent: true,
    step: 1,
  },
  { tex: "\\mathcal{R}_i := \\mathcal{E}_i \\setminus \\mathcal{E}_{i+1}", indent: true, step: 2 },
  { tex: "i := i + 1", indent: true, step: 3 },
  { tex: "\\textbf{end while}" },
  { tex: "\\mathcal{R}_\\infty := \\mathcal{E}_{i-1}" },
  { tex: "\\textbf{if}\\ \\mathcal{E}_{i-1} = \\varnothing\\ \\textbf{then}" },
  { tex: "n := i - 1", indent: true },
  { tex: "\\textbf{else}" },
  { tex: "n := i", indent: true },
  { tex: "\\textbf{end if}" },
  { tex: "\\textbf{return}\\ (\\mathcal{R}_0, \\dots, \\mathcal{R}_{n-1}, \\mathcal{R}_\\infty, n)" },
];

type Phase = "loop" | "infinity" | "final";

interface GlobalStep {
  phase: Phase;
  loopStepIndex: number | null;
}

function buildGlobalSteps(trace: BaseRankTraceStep[]): GlobalStep[] {
  return [
    ...trace.map((_, idx) => ({ phase: "loop" as const, loopStepIndex: idx })),
    { phase: "infinity", loopStepIndex: null },
    { phase: "final", loopStepIndex: null },
  ];
}

function BaseRankExplanation({
  phase,
  loopStep,
  currentI,
  rankInfinityFormulas,
}: {
  phase: Phase;
  loopStep: BaseRankTraceStep | null;
  currentI: number;
  rankInfinityFormulas: string[];
}) {
  if (phase === "loop" && loopStep) {
    switch (loopStep.lineIndex) {
      case 0:
        return (
          <div className="space-y-3 text-left text-sm">
            <p>
              We check whether the exceptional set has changed since the last
              iteration: <Formula formula={`\\mathcal{E}_{${currentI - 1}} \\neq \\mathcal{E}_{${currentI}}`} />.
            </p>
            <p>
              If it has, there's more exceptionality to peel off and the loop
              body runs again for <Formula formula={`i = ${currentI}`} />. If
              it hasn't, the sequence has stabilised and the loop terminates —
              whatever's left in <Formula formula={`\\mathcal{E}_{${currentI}}`} />{" "}
              is never found exceptional again, so it becomes{" "}
              <Formula formula="\mathcal{R}_\infty" />.
            </p>
            <p className="text-muted-foreground">{loopStep.note}</p>
          </div>
        );
      case 1:
        return (
          <div className="space-y-3 text-left text-sm">
            <p>
              We compute <Formula formula={`\\mathcal{E}_{${currentI + 1}}`} />
              : the statements in <Formula formula={`\\mathcal{E}_{${currentI}}`} />{" "}
              whose antecedent is exceptional — i.e. inconsistent with the
              rest of <Formula formula={`\\mathcal{E}_{${currentI}}`} /> —
              stay in, everything else drops out.
            </p>
            <p>
              These are the statements too atypical to be ranked yet; they
              carry over into the next iteration.
            </p>
            <p className="text-muted-foreground">{loopStep.note}</p>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3 text-left text-sm">
            <p>
              We compute{" "}
              <Formula
                formula={`\\mathcal{R}_{${currentI}} := \\mathcal{E}_{${currentI}} \\setminus \\mathcal{E}_{${currentI + 1}}`}
              />
              : whatever was in <Formula formula={`\\mathcal{E}_{${currentI}}`} />{" "}
              but is <em>not</em> exceptional gets assigned rank{" "}
              <Formula formula={`${currentI}`} /> — this is the newly
              discovered row in the ranking table.
            </p>
            <p className="text-muted-foreground">{loopStep.note}</p>
          </div>
        );
      case 3:
        return (
          <div className="space-y-3 text-left text-sm">
            <p>
              <Formula formula="i" /> is incremented so the next iteration
              works on <Formula formula={`\\mathcal{E}_{${currentI}}`} /> and
              checks whether it's still shrinking.
            </p>
            <p className="text-muted-foreground">{loopStep.note}</p>
          </div>
        );
      default:
        return null;
    }
  }

  if (phase === "infinity") {
    return (
      <div className="space-y-3 text-left text-sm">
        <p>
          The loop has terminated because{" "}
          <Formula formula={`\\mathcal{E}_{${currentI - 1}} = \\mathcal{E}_{${currentI}}`} />
          . Whatever statements remain are never found exceptional again, no
          matter how many more iterations we ran — so they can't be assigned
          a finite rank.
        </p>
        <p>
          These statements are collected into{" "}
          <Formula formula="\mathcal{R}_\infty" />, the infinite rank —
          {rankInfinityFormulas.length === 0
            ? " which is empty here, since every statement was eventually ranked."
            : " shown below."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left text-sm">
      <p>
        The algorithm returns the ordered tuple{" "}
        <Formula formula="(\mathcal{R}_0, \dots, \mathcal{R}_{n-1}, \mathcal{R}_\infty, n)" />
        . Ranks with lower numbers hold the most typical statements — the
        ones dropped out of the exceptional set earliest — while{" "}
        <Formula formula="\mathcal{R}_\infty" /> holds the statements that
        were never found exceptional, if any.
      </p>
      <p>The full ranking is shown in the result table on the left.</p>
    </div>
  );
}

/**
 * Drill-in screen reached via the down arrow from the Base Rank stage of
 * RelevantClosureStages. Same 3-panel layout as PartitionJustificationDetail:
 * top-left is the BaseRank algorithm pseudocode (highlighted line-by-line),
 * bottom-left is a ranking table that starts empty and fills in with each
 * R_i (then R_infinity) as the algorithm iterates, and the right panel
 * explains what the current step is doing. Left/right step through the
 * algorithm; up returns to the Base Rank stage screen.
 *
 * The trace is mock data — see lib/mock/base-rank-trace.ts — until a real
 * per-iteration trace endpoint exists.
 */
export function BaseRankAlgorithmDetail({
  algorithm,
}: {
  algorithm: RelevantClosureAlgorithm;
}) {
  const navigate = useNavigate();
  const activeTrace = MOCK_BASE_RANK_TRACE;
  const globalSteps = useMemo(() => buildGlobalSteps(activeTrace), [activeTrace]);
  const lastLoopStep = activeTrace[activeTrace.length - 1];

  const [stepIndex, setStepIndex] = useState(0);
  const total = globalSteps.length;
  const current = globalSteps[Math.min(stepIndex, total - 1)];
  const loopStep =
    current.phase === "loop" && current.loopStepIndex !== null
      ? activeTrace[current.loopStepIndex]
      : null;

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const goUp = () => navigate(`/entailment/${algorithm}/base-rank`);

  const currentI = loopStep ? loopStep.i : lastLoopStep.i + 1;
  const tableRows = loopStep?.rows ?? lastLoopStep.rows;

  const lastRow = lastLoopStep.rows[lastLoopStep.rows.length - 1];
  const rankInfinityFormulas = lastRow?.eiNext ?? [];

  const ranking: Ranking[] = useMemo(() => {
    const finite = tableRows
      .filter((row) => row.ri !== null)
      .map((row) => ({ rankNumber: row.i, formulas: row.ri as string[] }));

    if (current.phase === "infinity" || current.phase === "final") {
      return [
        ...finite,
        { rankNumber: ConstantValues.INFINITY_RANK_NUMBER, formulas: rankInfinityFormulas },
      ];
    }
    return finite;
  }, [tableRows, current.phase, rankInfinityFormulas]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Base Rank</CardTitle>
        <p className="text-center text-xs text-muted-foreground">
          Step {stepIndex + 1} / {total}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <BlankCard title="Result" showToggle={false}>
              <div className="h-36 overflow-y-auto pr-1">
                {ranking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No ranks computed yet.
                  </p>
                ) : (
                  <RankingTable ranking={ranking} />
                )}
              </div>
            </BlankCard>

            <BlankCard title="Base Rank Algorithm" showToggle={false}>
              <div className="space-y-4 text-left">
                <span className="inline-block rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-900">
                  i = {currentI}
                </span>
                <div className="h-36 overflow-y-auto overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  {CODE_LINES.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded px-2 py-1",
                        line.indent && "pl-8",
                        current.phase === "loop" &&
                          line.step === loopStep?.lineIndex &&
                          "bg-sky-100 text-sky-900 ring-1 ring-sky-300"
                      )}
                    >
                      <TexFormula>{line.tex}</TexFormula>
                    </div>
                  ))}
                </div>
              </div>
            </BlankCard>
          </div>

          <BlankCard title="Explanation" showToggle={false}>
            <div className="h-80 overflow-y-auto pr-1">
              <BaseRankExplanation
                phase={current.phase}
                loopStep={loopStep}
                currentI={currentI}
                rankInfinityFormulas={rankInfinityFormulas}
              />
            </div>
          </BlankCard>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrev}
          disabled={stepIndex === 0}
          aria-label="Previous step"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <Button variant="outline" size="icon" onClick={goUp} aria-label="Back to base rank">
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={stepIndex === total - 1}
          aria-label="Next step"
        >
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </CardFooter>
    </Card>
  );
}
