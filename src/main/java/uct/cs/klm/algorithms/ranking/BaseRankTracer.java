package uct.cs.klm.algorithms.ranking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class BaseRankTracer {

    Integer i;
    Integer lineIndex;
    String note;
    BaseRankResults rows;
    Boolean terminated;

    public void set(Integer i,Integer lineIndex,String note,BaseRankResults rows,Boolean terminated){

        this.i = i;
        this.lineIndex = lineIndex;
        this.note = note;
        this.rows = rows;
        this.terminated = terminated;
    }

    /** Independent snapshot of the current state — needed because the same
     * BaseRankTracer instance is mutated across multiple pseudocode-line
     * steps within a rank; each pushed step needs its own copy (including
     * its own copy of rows), not a shared reference. */
    public BaseRankTracer copy() {
        BaseRankTracer snapshot = new BaseRankTracer();
        snapshot.i = this.i;
        snapshot.lineIndex = this.lineIndex;
        snapshot.note = this.note;
        snapshot.rows = this.rows == null ? null : this.rows.copy();
        snapshot.terminated = this.terminated;
        return snapshot;
    }

    public Integer getI() {
        return i;
    }

    public Integer getLineIndex() {
        return lineIndex;
    }

    public String getNote() {
        return note;
    }

    public BaseRankResults getRows() {
        return rows;
    }

    public Boolean getTerminated() {
        return terminated;
    }

    public String toJson() throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();
        return mapper.writeValueAsString(this);
    }

}
