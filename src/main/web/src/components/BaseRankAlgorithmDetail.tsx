import { useMemo, useState, type ReactNode } from "react";
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
import { Formula, Kb } from "@/components/main-tabs/common/formulas";
import { TexFormula } from "@/components/main-tabs/common/TexFormula";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { BaseRankTraceRow, BaseRankTraceStep } from "@/lib/base-rank-trace";
import { ConstantValues, Ranking } from "@/lib/models";
import { RelevantClosureAlgorithm } from "./RelevantClosureStages";
import { useReasonerContext } from "@/state/reasoner.context";
import { NoResults } from "@/components/main-tabs/NoResults";

/**
 * Full BaseRank pseudocode (Algorithm 1). Array index is what drives
 * line-by-line highlighting (see `highlightedLineIndex` below) — every one
 * of these lines (aside from the Input/Output header comments at 0-1) gets
 * its own step in the stepper, not just the four loop-body lines.
 */
const CODE_LINES: { tex: string; indent?: boolean }[] = [
  { tex: "\\text{Input: A knowledge base } \\mathcal{K}" }, // 0
  {
    tex: "\\text{Output: An ordered tuple } (\\mathcal{R}_0, \\dots, \\mathcal{R}_{n-1}, \\mathcal{R}_\\infty, n)",
  }, // 1
  { tex: "i := 0" }, // 2
  { tex: "\\mathcal{E}_0 := \\mathcal{\\overrightarrow{K}}" }, // 3
  { tex: "\\textbf{while}\\ \\mathcal{E}_{i-1} \\neq \\mathcal{E}_i\\ \\textbf{do}" }, // 4
  {
    tex: "\\mathcal{E}_{i+1} := \\{\\alpha \\to \\beta \\in \\mathcal{E}_i \\mid \\mathcal{E}_i \\models \\neg\\alpha\\}",
    indent: true,
  }, // 5
  { tex: "\\mathcal{R}_i := \\mathcal{E}_i \\setminus \\mathcal{E}_{i+1}", indent: true }, // 6
  { tex: "i := i + 1", indent: true }, // 7
  { tex: "\\textbf{end while}" }, // 8
  { tex: "\\mathcal{R}_\\infty := \\mathcal{E}_{i-1}" }, // 9
  { tex: "\\textbf{if}\\ \\mathcal{E}_{i-1} = \\varnothing\\ \\textbf{then}" }, // 10
  { tex: "n := i - 1", indent: true }, // 11
  { tex: "\\textbf{else}" }, // 12
  { tex: "n := i", indent: true }, // 13
  { tex: "\\textbf{end if}" }, // 14
  { tex: "\\textbf{return}\\ (\\mathcal{R}_0, \\dots, \\mathcal{R}_{n-1}, \\mathcal{R}_\\infty, n)" }, // 15
];

/** Compact tex label for a rank number — mirrors rankToTex in ranking-table.tsx. */
function rankLabel(rankNumber: number): string {
  return rankNumber === ConstantValues.INFINITY_RANK_NUMBER
    ? "\\mathcal{R}_{\\infty}"
    : `\\mathcal{R}_{${rankNumber}}`;
}

/**
 * Every stage of the algorithm the stepper now walks through, not just the
 * loop body: initialising i and E_0 before the loop, then the loop itself,
 * then every teardown line (end while / R-infinity / if-check / n-assign /
 * end-if / return) after it terminates.
 */
type StepKind =
  | "init-i"
  | "init-e0"
  | "loop"
  | "end-while"
  | "r-infinity"
  | "if-check"
  | "n-assign"
  | "end-if"
  | "return";

interface GlobalStep {
  kind: StepKind;
  loopStepIndex: number | null;
}

function buildGlobalSteps(trace: BaseRankTraceStep[]): GlobalStep[] {
  return [
    { kind: "init-i", loopStepIndex: null },
    { kind: "init-e0", loopStepIndex: null },
    ...trace.map((_, idx) => ({ kind: "loop" as const, loopStepIndex: idx })),
    { kind: "end-while", loopStepIndex: null },
    { kind: "r-infinity", loopStepIndex: null },
    { kind: "if-check", loopStepIndex: null },
    { kind: "n-assign", loopStepIndex: null },
    { kind: "end-if", loopStepIndex: null },
    { kind: "return", loopStepIndex: null },
  ];
}

/** Renders a "…" placeholder for not-yet-computed, "∅" for empty, or the set itself. */
function FormulaSetInline({ formulas }: { formulas: string[] | null }) {
  if (formulas === null) return <span className="text-muted-foreground">…</span>;
  if (formulas.length === 0) return <span className="text-muted-foreground">∅</span>;
  return <Kb formulas={formulas} />;
}

/**
 * Cumulative i / E_i / E_{i+1} / R_i table — persists every row seen so
 * far (not just the one currently being built), growing as the loop steps
 * forward and staying put through the teardown steps once the loop ends.
 */
function StateTable({ rows, highlightI }: { rows: BaseRankTraceRow[]; highlightI: number | null }) {
  if (rows.length === 0) {
    return (
      <p className="mb-2 text-xs text-muted-foreground">
        No iterations computed yet.
      </p>
    );
  }

  return (
    <div className="mb-2 overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-6 px-2 py-1 text-xs">i</TableHead>
            <TableHead className="h-6 px-2 py-1 text-xs">E_i</TableHead>
            <TableHead className="h-6 px-2 py-1 text-xs">E_i+1</TableHead>
            <TableHead className="h-6 px-2 py-1 text-xs">R_i</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.i} className={cn(row.i === highlightI && "bg-sky-50")}>
              <TableCell className="px-2 py-1 text-xs font-semibold">{row.i}</TableCell>
              <TableCell className="px-2 py-1 text-xs">
                <FormulaSetInline formulas={row.ei} />
              </TableCell>
              <TableCell className="px-2 py-1 text-xs">
                <FormulaSetInline formulas={row.eiNext} />
              </TableCell>
              <TableCell className="px-2 py-1 text-xs">
                <FormulaSetInline formulas={row.ri} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BaseRankExplanation({
  kind,
  loopStep,
  currentI,
  rows,
  rankInfinityFormulas,
  finalN,
}: {
  kind: StepKind;
  loopStep: BaseRankTraceStep | null;
  currentI: number;
  rows: BaseRankTraceRow[];
  rankInfinityFormulas: string[];
  finalN: number;
}) {
  const table = (
    <StateTable
      rows={rows}
      highlightI={loopStep && !loopStep.terminated ? loopStep.i : null}
    />
  );

  let prose: ReactNode;

  switch (kind) {
    case "init-i":
      prose = (
        <p>
          We initialise the iteration counter, <Formula formula="i := 0" />.
          Nothing has been ranked yet.
        </p>
      );
      break;
    case "init-e0":
      prose = (
        <p>
          We initialise <Formula formula="\mathcal{E}_0" /> to the full
          defeasible knowledge base <Formula formula="\mathcal{K}" /> —
          every defeasible statement starts out a candidate for being
          exceptional.
        </p>
      );
      break;
    case "loop": {
      if (!loopStep) {
        prose = null;
        break;
      }
      if (loopStep.terminated) {
        prose = (
          <p>
            We re-check the while condition:{" "}
            <Formula formula={`\\mathcal{E}_{${currentI - 1}} \\neq \\mathcal{E}_{${currentI}}`} />
            . This time it's <strong>false</strong> —{" "}
            <Formula formula={`\\mathcal{E}_{${currentI - 1}} = \\mathcal{E}_{${currentI}}`} />
            — so the sequence has stabilised and the loop terminates.
          </p>
        );
        break;
      }
      switch (loopStep.lineIndex) {
        case 0:
          prose = (
            <p>
              We check whether the exceptional set has changed since the last
              iteration: <Formula formula={`\\mathcal{E}_{${currentI - 1}} \\neq \\mathcal{E}_{${currentI}}`} />
              . It has, so the loop body runs again for{" "}
              <Formula formula={`i = ${currentI}`} />.
            </p>
          );
          break;
        case 1:
          prose = (
            <p>
              We compute <Formula formula={`\\mathcal{E}_{${currentI + 1}}`} />
              : the statements in <Formula formula={`\\mathcal{E}_{${currentI}}`} />{" "}
              whose antecedent is exceptional — i.e. inconsistent with the
              rest of <Formula formula={`\\mathcal{E}_{${currentI}}`} /> —
              stay in, everything else drops out. These carry over into the
              next iteration.
            </p>
          );
          break;
        case 2:
          prose = (
            <p>
              We compute{" "}
              <Formula
                formula={`\\mathcal{R}_{${currentI}} := \\mathcal{E}_{${currentI}} \\setminus \\mathcal{E}_{${currentI + 1}}`}
              />
              : whatever was in <Formula formula={`\\mathcal{E}_{${currentI}}`} />{" "}
              but is <em>not</em> exceptional gets assigned rank{" "}
              <Formula formula={`${currentI}`} />.
            </p>
          );
          break;
        case 3:
          prose = (
            <p>
              <Formula formula="i" /> is incremented so the next iteration
              works on <Formula formula={`\\mathcal{E}_{${currentI}}`} /> and
              checks whether it's still shrinking.
            </p>
          );
          break;
        default:
          prose = null;
      }
      break;
    }
    case "end-while":
      prose = (
        <p>
          The loop body is done running. We fall out of{" "}
          <Formula formula="\textbf{end while}" /> now that the condition has
          checked false.
        </p>
      );
      break;
    case "r-infinity":
      prose = (
        <p>
          Whatever's left in <Formula formula={`\\mathcal{E}_{${currentI - 1}}`} />{" "}
          was never found exceptional again, no matter how many more
          iterations ran — so it can't be assigned a finite rank. It's
          collected into <Formula formula="\mathcal{R}_\infty" />.
        </p>
      );
      break;
    case "if-check":
      prose = (
        <p>
          We check whether <Formula formula="\mathcal{R}_\infty" /> is empty.
          This decides how many <em>finite</em> ranks were produced —{" "}
          {rankInfinityFormulas.length === 0
            ? "here it's empty, so every statement was eventually ranked."
            : "here it's non-empty, so some statements were never ranked."}
        </p>
      );
      break;
    case "n-assign":
      prose = (
        <p>
          {rankInfinityFormulas.length === 0 ? (
            <>
              Since <Formula formula="\mathcal{R}_\infty = \varnothing" />, we
              set <Formula formula={`n := i - 1 = ${finalN}`} /> — the last
              rank produced is the final one.
            </>
          ) : (
            <>
              Since <Formula formula="\mathcal{R}_\infty \neq \varnothing" />,
              we set <Formula formula={`n := i = ${finalN}`} /> — an extra
              slot is reserved to account for the infinite rank.
            </>
          )}
        </p>
      );
      break;
    case "end-if":
      prose = (
        <p>
          The branch is done — <Formula formula={`n = ${finalN}`} /> is now
          fixed.
        </p>
      );
      break;
    case "return":
      prose = (
        <p>
          The algorithm returns the ordered tuple{" "}
          <Formula formula="(\mathcal{R}_0, \dots, \mathcal{R}_{n-1}, \mathcal{R}_\infty, n)" />
          . Ranks with lower numbers hold the most typical statements — the
          ones dropped out of the exceptional set earliest — while{" "}
          <Formula formula="\mathcal{R}_\infty" /> holds the statements that
          were never found exceptional, if any. The full ranking is shown in
          the result table on the left.
        </p>
      );
      break;
  }

  return (
    <div className="space-y-1.5 text-left text-xs">
      {table}
      {prose}
      {loopStep?.note && !loopStep.terminated && (
        <p className="text-muted-foreground">{loopStep.note}</p>
      )}
    </div>
  );
}

/**
 * Drill-in screen reached via the down arrow from the Base Rank stage of
 * RelevantClosureStages. Same 3-panel layout as PartitionJustificationDetail:
 * top-left is the BaseRank algorithm pseudocode (highlighted line-by-line,
 * every line — not just the loop body), bottom-left is a ranking table that
 * starts empty and fills in with each R_i (then R_infinity) as the
 * algorithm iterates, and the right panel explains what the current step is
 * doing alongside a persistent i/E_i/E_i+1/R_i table. Left/right step
 * through the algorithm; up returns to the Base Rank stage screen.
 *
 * Reads reasoner.entailmentQueryResult.baseRankTrace (populated by
 * fetchBaseRankTrace / buildBaseRankTraceFromApi in reasoner.context.tsx)
 * when available. If no trace has loaded yet (or the fetch failed), renders
 * NoResults instead of the stepper.
 */
export function BaseRankAlgorithmDetail({
  algorithm,
}: {
  algorithm: RelevantClosureAlgorithm;
}) {
  const navigate = useNavigate();
  const reasoner = useReasonerContext();
  const realTrace = reasoner.entailmentQueryResult?.baseRankTrace;
  const activeTrace = realTrace ?? [];
  const globalSteps = useMemo(() => buildGlobalSteps(activeTrace), [activeTrace]);
  const lastLoopStep = activeTrace[activeTrace.length - 1];

  const [stepIndex, setStepIndex] = useState(0);
  const total = globalSteps.length;
  const current = globalSteps[Math.min(stepIndex, total - 1)];
  const loopStep =
    current.kind === "loop" && current.loopStepIndex !== null
      ? activeTrace[current.loopStepIndex]
      : null;

  const goNext = () => setStepIndex((s) => Math.min(s + 1, total - 1));
  const goPrev = () => setStepIndex((s) => Math.max(s - 1, 0));
  const goUp = () => navigate(`/entailment/${algorithm}/base-rank`);

  const lastRow = lastLoopStep ? lastLoopStep.rows[lastLoopStep.rows.length - 1] : undefined;

  // lastLoopStep is the terminal entry (terminated=true). Its own `i` is now
  // a sentinel (the backend sets it to Integer.MAX_VALUE) rather than a
  // meaningful value, so the real "i at which the while-condition failed"
  // is derived from the last real row instead — that row's `i` is the last
  // rank number that actually ran, so the condition was checked for i+1.
  const terminalI = lastRow ? lastRow.i + 1 : 0;
  const isPreLoop = current.kind === "init-i" || current.kind === "init-e0";
  const currentI =
    loopStep && !loopStep.terminated ? loopStep.i : isPreLoop ? 0 : terminalI;

  // Pure-defeasible R-infinity (= E_{i-1} from the trace) — this is what the
  // algorithm's own if-check (line 10) and n-assignment (lines 11/13) are
  // actually about, so the explanation prose stays keyed off this.
  const rankInfinityFormulas = lastRow?.eiNext ?? [];
  const finalN = rankInfinityFormulas.length === 0 ? terminalI - 1 : terminalI;

  // The Result table's R-infinity should match the real /api/base-rank
  // result, which folds the classical statements into R-infinity alongside
  // any leftover unranked defeasible ones (see BaseRankService.construct /
  // getBaseRankJson: baseRanking.addRank(INFINITY, combine(classical,
  // currentKnowledgeBase))). The trace only ever tracks defeasible
  // statements, so it can't show classical ones on its own — pull the
  // authoritative version from the already-fetched baseRank instead.
  const realInfinityRank = reasoner.entailmentQueryResult?.baseRank?.ranking?.find(
    (rank) => rank.rankNumber === ConstantValues.INFINITY_RANK_NUMBER
  );
  const rankInfinityForResult = realInfinityRank?.formulas ?? rankInfinityFormulas;

  // Rows to show in the Result table and the Explanation panel's state
  // table: nothing pre-loop, the growing snapshot mid-loop, the full final
  // snapshot for every teardown step once the loop's done.
  const tableRows = isPreLoop ? [] : loopStep?.rows ?? lastLoopStep?.rows ?? [];

  const ranking: Ranking[] = useMemo(() => {
    // A finite rank can only end up empty on the very last iteration (the
    // one where everything remaining turned out exceptional, which is also
    // what triggers termination) — that's not a real rank, so drop it.
    const finite = tableRows
      .filter((row) => row.ri !== null && row.ri.length > 0)
      .map((row) => ({ rankNumber: row.i, formulas: row.ri as string[] }));

    if (!isPreLoop && current.kind !== "loop") {
      return [
        ...finite,
        { rankNumber: ConstantValues.INFINITY_RANK_NUMBER, formulas: rankInfinityForResult },
      ];
    }
    return finite;
  }, [tableRows, current.kind, isPreLoop, rankInfinityForResult]);

  const highlightedLineIndex = useMemo(() => {
    switch (current.kind) {
      case "init-i":
        return 2;
      case "init-e0":
        return 3;
      case "loop":
        return loopStep ? 4 + loopStep.lineIndex : null;
      case "end-while":
        return 8;
      case "r-infinity":
        return 9;
      case "if-check":
        return 10;
      case "n-assign":
        return rankInfinityFormulas.length === 0 ? 11 : 13;
      case "end-if":
        return 14;
      case "return":
        return 15;
      default:
        return null;
    }
  }, [current.kind, loopStep, rankInfinityFormulas]);

  if (activeTrace.length === 0) {
    return <NoResults />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-center text-xl font-bold">Base Rank</CardTitle>
        <p className="text-center text-xs text-muted-foreground">
          Step {stepIndex + 1} / {total}
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <BlankCard title="Result" showToggle={false}>
              <div className="min-h-40 text-left text-xs">
                {ranking.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No ranks computed yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-6 px-2 py-1 text-xs">Rank</TableHead>
                        <TableHead className="h-6 px-2 py-1 text-xs">Statements</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...ranking]
                        .sort((a, b) => b.rankNumber - a.rankNumber)
                        .map((rank) => (
                          <TableRow key={rank.rankNumber}>
                            <TableCell className="px-2 py-1 font-semibold">
                              <TexFormula>{rankLabel(rank.rankNumber)}</TexFormula>
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <Kb formulas={rank.formulas} />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </BlankCard>

            <BlankCard title="Base Rank Algorithm" showToggle={false}>
              <div className="space-y-1.5 text-left">
                <span className="inline-block rounded-md border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-xs font-semibold text-sky-900">
                  i = {currentI}
                </span>
                <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-2 text-xs">
                  {CODE_LINES.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded px-1.5 py-0.5 leading-tight",
                        line.indent && "pl-6",
                        idx === highlightedLineIndex &&
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
            <div className="min-h-56">
              <BaseRankExplanation
                kind={current.kind}
                loopStep={loopStep}
                currentI={currentI}
                rows={tableRows}
                rankInfinityFormulas={rankInfinityFormulas}
                finalN={finalN}
              />
            </div>
          </BlankCard>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center gap-4 p-3 pt-0">
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
