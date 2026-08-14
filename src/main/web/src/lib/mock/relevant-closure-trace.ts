/**
 * MOCK DATA — there is no endpoint yet exposing a per-iteration trace of the
 * Relevant Closure while-loop (the API only returns the final relevant /
 * irrelevant partitions and the entailment result). This file hardcodes a
 * plausible trace, consistent with the example KB used in the BaseRank and
 * Justification mock traces, so the debugger/stepper UI can be built and
 * demoed. Swap MOCK_RELEVANT_CLOSURE_TRACE for real API data once a trace
 * endpoint exists.
 *
 * Algorithm being traced:
 *   i := 0
 *   R' := R
 *   while (R0 ∪ R- ∪ R' ⊨ ¬α) and R' ≠ ∅ do
 *       R' := R' \ (R_i ∩ R)
 *       i := i + 1
 */

export const R_ZERO: string[] = [];
export const R_MINUS = ["p=>b"];
export const R_SET = ["b~>f", "b~>w", "p~>!f"];
export const ANTECEDENT = "p";

const RANKS: { rankNumber: number; formulas: string[] }[] = [
  { rankNumber: 0, formulas: ["p=>b", "b~>f", "b~>w"] },
  { rankNumber: 1, formulas: ["p~>!f"] },
];

export interface RelevantClosureTraceRow {
  i: number;
  rPrimeBefore: string[];
  removed: string[] | null;
  rPrimeAfter: string[] | null;
}

export interface RelevantClosureTraceStep {
  i: number;
  /** 0 = while-check line, 1 = R' update line, 2 = i increment line. */
  lineIndex: number;
  note: string;
  rows: RelevantClosureTraceRow[];
  terminated?: boolean;
}

function intersect(a: string[], b: string[]) {
  return a.filter((f) => b.includes(f));
}

function subtract(a: string[], b: string[]) {
  return a.filter((f) => !b.includes(f));
}

// Same mock entailment rule used by the justification trace: a KB entails
// ¬p if it contains "p~>!f", or contains both "b~>f" and "b~>w".
function mockEntailsNegation(kb: string[]): boolean {
  const has = (f: string) => kb.includes(f);
  return has("p~>!f") || (has("b~>f") && has("b~>w"));
}

function buildTrace(): RelevantClosureTraceStep[] {
  const steps: RelevantClosureTraceStep[] = [];
  const rows: RelevantClosureTraceRow[] = [];
  let rPrime = [...R_SET];
  let i = 0;

  while (true) {
    const combined = [...R_ZERO, ...R_MINUS, ...rPrime];
    const conditionHolds = mockEntailsNegation(combined) && rPrime.length > 0;

    if (!conditionHolds) {
      steps.push({
        i,
        lineIndex: 0,
        note: `Check (R0 ∪ R- ∪ R') ⊨ ¬${ANTECEDENT} and R' ≠ ∅ — false. Loop terminates.`,
        rows: rows.map((r) => ({ ...r })),
        terminated: true,
      });
      break;
    }

    // Line 0: while condition — true, enter the loop body.
    rows.push({ i, rPrimeBefore: [...rPrime], removed: null, rPrimeAfter: null });
    steps.push({
      i,
      lineIndex: 0,
      note: `Check (R0 ∪ R- ∪ R') ⊨ ¬${ANTECEDENT} and R' ≠ ∅ — true, entering loop body.`,
      rows: rows.map((r) => ({ ...r })),
    });

    // Line 1: R' := R' \ (R_i ∩ R).
    const rankI = RANKS.find((r) => r.rankNumber === i)?.formulas ?? [];
    const removed = intersect(rankI, R_SET);
    const rPrimeAfter = subtract(rPrime, removed);
    rows[rows.length - 1] = { ...rows[rows.length - 1], removed, rPrimeAfter };
    steps.push({
      i,
      lineIndex: 1,
      note: `R' := R' \\ (R_${i} ∩ R) — removing {${removed.join(", ") || "∅"}}.`,
      rows: rows.map((r) => ({ ...r })),
    });

    // Line 2: i := i + 1.
    rPrime = rPrimeAfter;
    steps.push({
      i: i + 1,
      lineIndex: 2,
      note: `i incremented to ${i + 1}.`,
      rows: rows.map((r) => ({ ...r })),
    });

    i += 1;
    if (i > 10) break; // safety net
  }

  return steps;
}

export const MOCK_RELEVANT_CLOSURE_TRACE: RelevantClosureTraceStep[] = buildTrace();

/**
 * The query being decided: does K defeasibly entail "penguins don't fly"?
 * Once the while loop terminates, the deciding KB is R0 ∪ R- ∪ R' (using
 * whatever R' was left when the loop stopped), and the entailment result
 * for the actual query is checked against that deciding KB — a separate
 * check from the ¬α consistency check the loop itself was running.
 */
export const QUERY_FORMULA = "p~>!f";

function finalRPrime(): string[] {
  const lastStep = MOCK_RELEVANT_CLOSURE_TRACE[MOCK_RELEVANT_CLOSURE_TRACE.length - 1];
  const lastRow = lastStep?.rows[lastStep.rows.length - 1];
  return lastRow?.rPrimeAfter ?? lastRow?.rPrimeBefore ?? [...R_SET];
}

export const FINAL_DECIDING_KB = [...R_ZERO, ...R_MINUS, ...finalRPrime()];

// Mock result: with R' stripped down to ∅, the deciding KB reduces to just
// the classical background {p=>b}, which doesn't classically entail
// p=>!f (nothing forces !f from b) — so the query is not entailed.
export const FINAL_ENTAILED = false;
