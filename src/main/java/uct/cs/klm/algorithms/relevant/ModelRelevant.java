package uct.cs.klm.algorithms.relevant;

import java.util.List;

public class ModelRelevant {
    List<RelevantTracer> steps;
    boolean entailment;
    List<String> relevant;
    List<String> irrelevant;


    public void setEntailment(boolean entailment) {
        this.entailment = entailment;
    }



    public void setSteps(List<RelevantTracer> steps) {
        this.steps = steps;
    }

    public List<RelevantTracer> getSteps() {
        return steps;
    }

    // Named to match the "entailment" JSON property the frontend's
    // ApiModelRelevant interface expects (an isXxx()-style getter here would
    // decapitalize to "entailed" instead, per Jackson bean-naming rules).
    public boolean getEntailment() {
        return entailment;
    }

    public void setRelevant(List<String> relevant) {
        this.relevant = relevant;
    }

    public List<String> getRelevant() {
        return relevant;
    }

    public void setIrrelevant(List<String> irrelevant) {
        this.irrelevant = irrelevant;
    }

    public List<String> getIrrelevant() {
        return irrelevant;
    }


}
