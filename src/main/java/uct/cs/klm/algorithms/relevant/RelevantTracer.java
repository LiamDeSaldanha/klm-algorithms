package uct.cs.klm.algorithms.relevant;

import java.util.ArrayList;
import java.util.List;

/**
 * Captures one pseudocode-line step of the relevant closure algorithm so the
 * full trace can be replayed line-by-line by the frontend, mirroring
 * uct.cs.klm.algorithms.ranking.BaseRankTracer's lineIndex/terminated/copy
 * pattern for base rank.
 */
public class RelevantTracer {
    int i;
    Integer lineIndex;
    Boolean terminated;

    List<String> before;
    List<String> current;
    List<String> intersection;
    String note;

    public void setNote(String note) {
        this.note = note;
    }

    public void setIntersection(List<String> intersection) {
        this.intersection = intersection;
    }

    public List<String> getIntersection() {
        return intersection;
    }

    public void setBefore(List<String> before) {
        this.before = before;
    }

    public void setCurrent(List<String> current) {
        this.current = current;
    }

    public void setI(int i) {
        this.i = i;
    }

    public void setLineIndex(Integer lineIndex) {
        this.lineIndex = lineIndex;
    }

    public void setTerminated(Boolean terminated) {
        this.terminated = terminated;
    }

    public String getNote() {
        return note;
    }

    public int getI() {
        return i;
    }

    public Integer getLineIndex() {
        return lineIndex;
    }

    public Boolean getTerminated() {
        return terminated;
    }

    public List<String> getBefore() {
        return before;
    }

    public List<String> getCurrent() {
        return current;
    }

    /** Independent snapshot of the current state — needed because the same
     * RelevantTracer instance is mutated across multiple pseudocode-line
     * steps within a rank; each pushed step needs its own copy (including
     * its own copies of the formula lists), not a shared reference. */
    public RelevantTracer copy() {
        RelevantTracer snapshot = new RelevantTracer();
        snapshot.i = this.i;
        snapshot.lineIndex = this.lineIndex;
        snapshot.terminated = this.terminated;
        snapshot.before = this.before == null ? null : new ArrayList<>(this.before);
        snapshot.current = this.current == null ? null : new ArrayList<>(this.current);
        snapshot.intersection = this.intersection == null ? null : new ArrayList<>(this.intersection);
        snapshot.note = this.note;
        return snapshot;
    }
}
