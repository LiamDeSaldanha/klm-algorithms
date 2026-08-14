import { QueryInputs } from "./inputs/QueryInputs";
import { SyncLoader } from "react-spinners";
import { InferenceOperator } from "@/lib/models";
import { useReasonerContext } from "@/state/reasoner.context";
import { EntailmentResultCard } from "./EntailmentResultCard";
import { Summary } from "./main-tabs/Summary";

export function MainContent() {
  const reasoner = useReasonerContext();
  const inferenceOperators = reasoner.entailmentQueryResult?.inferenceOperators;

  return (
    <>
      {(reasoner.resultPending || reasoner.inputPending) && (
        <div className="fixed top-0 left-0 w-screen h-screen z-10 flex items-center justify-center">
          <SyncLoader
            color="#0ea5e9"
            loading={reasoner.inputPending || reasoner.resultPending}
          />
        </div>
      )}
      <div className="flex flex-col gap-6 w-full">
        <QueryInputs
          isLoading={reasoner.inputPending}
          queryInput={reasoner.queryInput}
          submitKnowledgeBase={reasoner.createInputKnowledgeBase}
          uploadKnowledgeBase={reasoner.createFileKnowledgeBase}
          updateFormula={reasoner.updateFormula}
          generateKnowledgeBase={reasoner.generateKnowledgeBase}
        />

        <Summary />

        {inferenceOperators && inferenceOperators.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {inferenceOperators.includes(InferenceOperator.RationalClosure) && (
              <EntailmentResultCard
                title="Rational Closure"
                isLoading={reasoner.resultPending}
                entailment={reasoner.entailmentQueryResult?.rationalEntailment || null}
                to="/entailment/rational-closure"
              />
            )}
            {inferenceOperators.includes(InferenceOperator.LexicographicClosure) && (
              <EntailmentResultCard
                title="Lexicographic Closure"
                isLoading={reasoner.resultPending}
                entailment={reasoner.entailmentQueryResult?.lexicalEntailment || null}
                to="/entailment/lexicographic-closure"
              />
            )}
            {inferenceOperators.includes(InferenceOperator.BasicRelevantClosure) && (
              <EntailmentResultCard
                title="Basic Relevant Closure"
                isLoading={reasoner.resultPending}
                entailment={reasoner.entailmentQueryResult?.basicRelevantEntailment || null}
                to="/entailment/basic-relevant-closure/partition"
              />
            )}
            {inferenceOperators.includes(InferenceOperator.MinimalRelevantClosure) && (
              <EntailmentResultCard
                title="Minimal Relevant Closure"
                isLoading={reasoner.resultPending}
                entailment={reasoner.entailmentQueryResult?.minimalRelevantEntailment || null}
                to="/entailment/minimal-relevant-closure/partition"
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
