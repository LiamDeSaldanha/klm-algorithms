# Trace Endpoints Spec

## Context

The frontend now has three step-through "debugger" cards (BaseRank, Justification, Relevant Closure) built on the main dashboard. Each one currently runs on **hardcoded mock data** in `src/main/web/src/lib/mock/*.ts`, because the backend only returns *final* results for these algorithms today — not the intermediate, step-by-step state needed to drive a stepper UI.

This document specifies the three new endpoints needed to replace that mock data with real algorithm traces, plus notes on what already exists and doesn't need to change.

Each new endpoint should return a **flat array of "steps"**, computed once per request (the algorithm is cheap; there's no need for the server to hold per-session stepper state). The frontend already owns `stepIndex` locally and just needs the full array up front — same shape the mock files already produce, so on the frontend side this is a near drop-in swap of `MOCK_X_TRACE` for `await api.fetchXTrace(...)`.

---

## 1. BaseRank Trace

**Used by:** `BaseRankDebugger.tsx` ("While Loop" + "Result Table" cards)

**Traces:** the BaseRank while-loop —
```
i := 0; E[0] := K
while E[i-1] != E[i] do
    E[i+1] := { a=>b in E[i] | E[i] |= !a }
    R[i] := E[i] \ E[i+1]
    i := i + 1
```

**Suggested route:** `POST /api/base-rank/trace`

**Request body:** same as the existing `POST /api/base-rank` — a `KnowledgeBase` (array of formula strings).

**Response body:**
```ts
interface BaseRankTraceRow {
  i: number;
  ei: string[];
  eiPrev: string[] | null;
  eiNext: string[] | null;   // null until computed this row
  ri: string[] | null;       // null until computed this row
}

interface BaseRankTraceStep {
  i: number;                 // value of i in scope at this step
  lineIndex: number;         // 0=while-check, 1=compute E[i+1], 2=compute R[i], 3=i++
  note: string;               // human-readable description of this step
  rows: BaseRankTraceRow[];   // cumulative table snapshot at this point
  terminated?: boolean;       // true on the final "condition false" step
}

type BaseRankTraceResponse = BaseRankTraceStep[];
```

**Backend notes:** the loop body already exists in `BaseRankService`/wherever `BaseRankController.getBaseRank` delegates to (`IBaseRankService.construct`). That method currently only returns the final `ModelBaseRank` (sequence + ranks). It needs a variant (or an internal flag) that records `E[i]`, `E[i+1]`, `R[i]` at each iteration instead of discarding them — reference `lib/mock/base-rank-trace.ts` for exactly what shape to emit per step (each pseudocode line becomes its own step, matching how the frontend highlights one line at a time).

---

## 2. Justification Trace

**Used by:** `JustificationDebugger.tsx` ("Candidate Subset" + "Justifications Found" cards)

**Traces:** brute-force powerset search over the defeasible knowledge base (smallest subsets first), checking `combinedKb ⊨ ¬antecedent` and minimality against justifications found so far.

**Note:** this is *not* what the real backend algorithm does today. `JustificationServiceBase.computeAllJustifications` uses a hitting-set-tree (expand/contract) approach, not a raw powerset scan — see that class for the real algorithm. Before building this endpoint, decide whether to:
- (a) build a new, separate brute-force powerset trace purely for pedagogical display (matches what's currently mocked, but is a second algorithm implementation to maintain), or
- (b) instrument the real hitting-set-tree algorithm and change the frontend stepper to trace *that* instead (more work on the frontend, but only one algorithm to maintain and it teaches the real implementation).

The spec below assumes (a), since it matches the existing mock/UI. Flag this as an open decision.

**Suggested route:** `POST /api/justification/trace`

**Request body:**
```ts
interface JustificationTraceRequest {
  knowledgeBase: string[];   // full KB (classical + defeasible)
  queryFormula: string;      // used to derive the antecedent / ¬antecedent
}
```

**Response body:**
```ts
interface JustificationTraceStep {
  candidateNumber: number;         // 1-based index in the powerset enumeration
  candidate: string[];             // candidate subset of defeasible statements
  combinedKb: string[];            // candidate + classical background
  entailed: boolean;               // does combinedKb entail ¬antecedent?
  isMinimal: boolean | null;       // null when not entailed; true/false when entailed
  justificationsSoFar: string[][]; // confirmed justifications up to this candidate
  note: string;
}

type JustificationTraceResponse = JustificationTraceStep[];
```

**Backend notes:** powerset size is `2^|defeasible statements|` — needs a sane cap (the abandoned prototype UI capped knowledge bases at a fixed size for this reason; worth reusing that limit here, or rejecting/paginating large KBs with a 4xx).

---

## 3. Relevant Closure Trace

**Used by:** `RelevantClosureDebugger.tsx` ("While Loop" + "R' Trace" cards, plus the "Entailment Check" card)

**Traces:**
```
i := 0
R' := R
while (R0 ∪ R- ∪ R' ⊨ ¬antecedent) and R' != {} do
    R' := R' \ (R_i ∩ R)
    i := i + 1
```
...followed by a final entailment check of the original query against the deciding KB (`R0 ∪ R- ∪ R'` at termination).

**Suggested route:** `POST /api/relevant-closure/trace`

**Request body:** same shape as the existing relevant-closure entailment call — knowledge base + query formula (mirror whatever `POST /api/entailment/{reasoner}/{queryFormula}` expects for `reasoner = BasicRelevantClosure` / `MinimalRelevantClosure`).

**Response body:**
```ts
interface RelevantClosureTraceRow {
  i: number;
  rPrimeBefore: string[];
  removed: string[] | null;     // R_i ∩ R, null until computed this row
  rPrimeAfter: string[] | null; // null until computed this row
}

interface RelevantClosureTraceStep {
  i: number;
  lineIndex: number;   // 0=while-check, 1=R' update, 2=i++
  note: string;
  rows: RelevantClosureTraceRow[];
  terminated?: boolean;
}

interface RelevantClosureTraceResponse {
  steps: RelevantClosureTraceStep[];
  decidingKb: string[];   // R0 ∪ R- ∪ R' once the loop terminates
  queryFormula: string;
  entailed: boolean;      // final entailment check result
}
```

**Backend notes:** this loop lives inside `RelevantClosureEntailmentBase.determineEntailment` (the `for (KnowledgeBase powerKb : relevantPowersets)` loop and the surrounding relevant/irrelevant partition logic in `GetRelevantRanks`). It currently only returns the final `consistentRank`/`isQueryEntailed` — needs to record `R'` before/after each rank's removal instead of just iterating past it. `R`, `R-` (the relevant/irrelevant partition) are already computed via `GetRelevantRanks` and exposed today as `relevantRanking`/`irrelevantRanking` on the entailment response — `R0` isn't currently a named concept in the implementation and needs clarifying with whoever owns the algorithm (see open question below).

---

## Already real — no new endpoint needed

These are already returned by existing endpoints and just need the frontend to consume them instead of mock data where relevant:

| Data | Existing endpoint | Notes |
|---|---|---|
| Final BaseRank sequence + ranks | `POST /api/base-rank` | Used by `BaseRankCard`'s Rank Infinity / Final Ranking cards already. |
| Final justification list | `POST /api/entailment/{reasoner}/{queryFormula}` | `EntailmentModel.justification` — `JustificationCard`'s final numbered list could pull from this instead of the mock powerset's result once the query engine is hooked up. |
| Final relevant/irrelevant partition | `POST /api/entailment/{reasoner}/{queryFormula}` | Already wired into `RelevancePartitionCard` via `relevantRanking`/`irrelevantRanking`. |

---

## Open questions before implementation

1. **Justification algorithm choice (see §2):** brute-force powerset trace vs. instrumenting the real hitting-set-tree algorithm.
2. **What exactly is `R0`** in the Relevant Closure pseudocode (§3) — needs a definition from whoever owns the theory/implementation before the endpoint can be built correctly.
3. **Size limits:** BaseRank and Relevant Closure traces grow linearly with rank count; Justification traces grow exponentially with defeasible-statement count. Each endpoint should reject or cap oversized inputs rather than hang.
4. **Step granularity:** all three traces currently split each loop iteration into 3–4 "line" steps to support line-by-line highlighting in the UI. Confirm this granularity is worth the added response size vs. one step per full iteration.
