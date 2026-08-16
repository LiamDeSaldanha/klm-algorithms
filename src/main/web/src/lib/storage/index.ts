import {
  BaseRankModel,
  IBaseRankExplanation,
  InferenceOperator,
  IRationalClosureExplanation,
  LexicalEntailmentModel,
  RationalEntailmentModel,
  MinimalRelevantEntailmentModel,
  BasicRelevantEntailmentModel,
} from "@/lib/models";
import { BaseRankTraceStep } from "@/lib/base-rank-trace";
import { JustificationTraceStep } from "@/lib/justification-trace";
import { RelevantClosureTraceStep } from "@/lib/relevant-closure-trace";

export type QueryInput = {
  queryFormula: string;
  knowledgeBase: string[];
  signature: string[];
};

export type QueryResult = {
  baseRank: BaseRankModel;
  baseRankExplanation: IBaseRankExplanation;
  rationalEntailment: RationalEntailmentModel;
  rationalExplanation: IRationalClosureExplanation;
  lexicalEntailment: LexicalEntailmentModel;
  basicRelevantEntailment: BasicRelevantEntailmentModel;
  minimalRelevantEntailment: MinimalRelevantEntailmentModel;
};

export const getQueryInput: () => QueryInput | null = () => {
  const storedValue = localStorage.getItem("queryInput");
  return storedValue ? JSON.parse(storedValue) : null;
};

export const saveQueryInput: (data: QueryInput) => void = (data) => {
  localStorage.setItem("queryInput", JSON.stringify(data));
};

export interface IEntailementQueryResult {
  inferenceOperators: InferenceOperator[];
  baseRank: BaseRankModel;
  baseRankExplanation: IBaseRankExplanation;
  baseRankTrace: BaseRankTraceStep[] | null;
  justificationTrace: JustificationTraceStep[] | null;
  rationalEntailment: RationalEntailmentModel | null;
  rationalExplanation: IRationalClosureExplanation | null;
  lexicalEntailment: LexicalEntailmentModel | null;
  basicRelevantEntailment: BasicRelevantEntailmentModel | null;
  minimalRelevantEntailment: MinimalRelevantEntailmentModel | null;
  basicRelevantClosureTrace: RelevantClosureTraceStep[] | null;
  minimalRelevantClosureTrace: RelevantClosureTraceStep[] | null;
}

export function getEntailmentQueryResult(): IEntailementQueryResult | null {
  const storedValue = localStorage.getItem("entailmentQueryResult");
  const obj = storedValue ? JSON.parse(storedValue) : null;

  console.log(obj);
  if (obj != null) {
    return {
      inferenceOperators: obj.inferenceOperators as InferenceOperator[],
      baseRank: BaseRankModel.create(obj.baseRank),
      baseRankExplanation: obj.baseRankExplanation,
      baseRankTrace: obj.baseRankTrace ?? null,
      justificationTrace: obj.justificationTrace ?? null,
      rationalEntailment:
        obj.rationalEntailment != null
          ? RationalEntailmentModel.create(obj.rationalEntailment)
          : null,
      rationalExplanation: obj.rationalExplanation,
      lexicalEntailment:
        obj.lexicalEntailment != null
          ? LexicalEntailmentModel.create(obj.lexicalEntailment)
          : null,
      basicRelevantEntailment:
        obj.basicRelevantEntailment != null
          ? BasicRelevantEntailmentModel.create(obj.basicRelevantEntailment)
          : null,
      minimalRelevantEntailment:
        obj.minimalRelevantEntailment != null
          ? MinimalRelevantEntailmentModel.create(obj.minimalRelevantEntailment)
          : null,
      basicRelevantClosureTrace: obj.basicRelevantClosureTrace ?? null,
      minimalRelevantClosureTrace: obj.minimalRelevantClosureTrace ?? null,
    };
  }
  return null;
}

export function deleteEntailmentQueryResult(): void {
  localStorage.removeItem("entailmentQueryResult");
}

export function saveEntailmentQueryResult(data: IEntailementQueryResult): void {
  localStorage.setItem(
    "entailmentQueryResult",
    JSON.stringify({
      inferenceOperators: data.inferenceOperators,
      baseRank: data.baseRank.toObject(),
      baseRankExplanation: data.baseRankExplanation,
      baseRankTrace: data.baseRankTrace,
      justificationTrace: data.justificationTrace,
      rationalEntailment: data.rationalEntailment?.toObject(),
      rationalExplanation: data.rationalExplanation,
      lexicalEntailment: data.lexicalEntailment?.toObject(),
      basicRelevantEntailment: data.basicRelevantEntailment?.toObject(),
      minimalRelevantEntailment: data.minimalRelevantEntailment?.toObject(),
      basicRelevantClosureTrace: data.basicRelevantClosureTrace,
      minimalRelevantClosureTrace: data.minimalRelevantClosureTrace,
    })
  );
}

export const deleteQueryInput: () => void = () => {
  localStorage.removeItem("queryInput");
};

export const deleteAllData: () => void = () => {
  deleteQueryInput();
  deleteEntailmentQueryResult();
};

export * from "./evaluation";
