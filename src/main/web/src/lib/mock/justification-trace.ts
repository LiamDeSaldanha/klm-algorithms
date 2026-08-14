/**
 * MOCK DATA — there is no endpoint yet exposing a per-candidate trace of the
 * justification search (only the final justification list is returned by
 * the API, via EntailmentModel.justification). This file hardcodes a
 * plausible powerset walk so the debugger/stepper UI can be built and
 * demoed. Swap MOCK_JUSTIFICATION_TRACE for real API data (or wire it up to
 * a real trace endpoint) once one exists.
 *
 * Algorithm being traced: for a defeasible knowledge base D, enumerate the
 * powerset of its defeasible statements (smallest subsets first). For each
 * candidate subset, combine it with the classical background statements and
 * check whether it entails the negation of the query's antecedent, ¬α. Any
 * entailing subset that is not a strict superset of an already-found
 * justification is itself a justification.
 */

export const CLASSICAL_KB = ["p=>b"];
export const DEFEASIBLE_KB = ["b~>f", "b~>w", "p~>!f"];
export const ANTECEDENT = "p";
export const NEGATED_ANTECEDENT = "!p";

export interface JustificationTraceStep {
  /** 1-based index of this candidate subset in the powerset enumeration. */
  candidateNumber: number;
  /** The candidate subset of defeasible statements being tested. */
  candidate: string[];
  /** candidate combined with the classical background statements. */
  combinedKb: string[];
  /** Whether combinedKb entails the negation of the antecedent. */
  entailed: boolean;
  /** Only meaningful when entailed — is this candidate a minimal justification? */
  isMinimal: boolean | null;
  /** Justifications confirmed so far, in the order they were found. */
  justificationsSoFar: string[][];
  note: string;
}

// Powerset of DEFEASIBLE_KB, smallest subsets first.
const POWERSET: string[][] = [
  [],
  [DEFEASIBLE_KB[0]],
  [DEFEASIBLE_KB[1]],
  [DEFEASIBLE_KB[2]],
  [DEFEASIBLE_KB[0], DEFEASIBLE_KB[1]],
  [DEFEASIBLE_KB[0], DEFEASIBLE_KB[2]],
  [DEFEASIBLE_KB[1], DEFEASIBLE_KB[2]],
  [DEFEASIBLE_KB[0], DEFEASIBLE_KB[1], DEFEASIBLE_KB[2]],
];

// Mock entailment rule: a candidate entails ¬p iff it contains "p~>!f" on
// its own, or contains both "b~>f" and "b~>w" together.
function mockEntails(candidate: string[]): boolean {
  const has = (f: string) => candidate.includes(f);
  return has("p~>!f") || (has("b~>f") && has("b~>w"));
}

function isSupersetOfAny(candidate: string[], justifications: string[][]): boolean {
  return justifications.some((just) =>
    just.every((f) => candidate.includes(f))
  );
}

function buildTrace(): JustificationTraceStep[] {
  const justifications: string[][] = [];

  return POWERSET.map((candidate, idx) => {
    const combinedKb = [...CLASSICAL_KB, ...candidate];
    const entailed = mockEntails(candidate);
    let isMinimal: boolean | null = null;
    let note: string;

    if (!entailed) {
      note = `D = {${candidate.join(", ") || "∅"}} does not entail ${NEGATED_ANTECEDENT}. Skip.`;
    } else {
      const superset = isSupersetOfAny(candidate, justifications);
      isMinimal = !superset;
      if (isMinimal) {
        justifications.push(candidate);
        note = `D = {${candidate.join(", ")}} entails ${NEGATED_ANTECEDENT} and is minimal. Add as J${justifications.length}.`;
      } else {
        note = `D = {${candidate.join(", ")}} entails ${NEGATED_ANTECEDENT} but contains an existing justification. Not minimal — skip.`;
      }
    }

    return {
      candidateNumber: idx + 1,
      candidate,
      combinedKb,
      entailed,
      isMinimal,
      justificationsSoFar: justifications.map((j) => [...j]),
      note,
    };
  });
}

export const MOCK_JUSTIFICATION_TRACE: JustificationTraceStep[] = buildTrace();
