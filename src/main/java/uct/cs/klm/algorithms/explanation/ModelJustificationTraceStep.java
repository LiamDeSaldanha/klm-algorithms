package uct.cs.klm.algorithms.explanation;

import java.util.List;


public class ModelJustificationTraceStep {
    int candidateNumber;
    List<String> candidate;
    List<String> combinedKb;
    boolean entailed;
    boolean isMinimal;
    List<List<String>> justificationSoFar;
    String note;

    public int getCandidateNumber() {
        return candidateNumber;
    }

    public List<List<String>> getJustificationSoFar() {
        return justificationSoFar;
    }

    public List<String> getCandidate() {
        return candidate;
    }

    public List<String> getCombinedKb() {
        return combinedKb;
    }

    public String getNote() {
        return note;
    }

    public void setCandidate(List<String> candidate) {
        this.candidate = candidate;
    }

    public void setCandidateNumber(int candidateNumber) {
        this.candidateNumber = candidateNumber;
    }

    public void setCombinedKb(List<String> combinedKb) {
        this.combinedKb = combinedKb;
    }

    public void setEntailed(boolean entailed) {
        this.entailed = entailed;
    }

    public void setJustificationSoFar(List<List<String>> justificationSoFar) {
        this.justificationSoFar = justificationSoFar;
    }

    public void setMinimal(boolean minimal) {
        isMinimal = minimal;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public boolean isEntailed() {
        return entailed;
    }

    public boolean isMinimal() {
        return isMinimal;
    }

}
