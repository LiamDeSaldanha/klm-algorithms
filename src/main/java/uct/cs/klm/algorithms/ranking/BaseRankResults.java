package uct.cs.klm.algorithms.ranking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.tweetyproject.logics.pl.syntax.PlFormula;
import uct.cs.klm.algorithms.models.KnowledgeBase;

import java.util.ArrayList;
import java.util.List;

public class BaseRankResults {
    Integer i;
    List<String> ei;
    List<String> ePrev;
    List<String> eNext;
    List<String> ri;

    public void set(Integer i,KnowledgeBase ei,KnowledgeBase ePrev){
        this.i = i;
        this.ei = toStringList(ei);
        this.ePrev = toStringList(ePrev);

    }
    public void setNext(KnowledgeBase eNext){
        this.eNext = toStringList(eNext);

    }public void setRank(KnowledgeBase ri){

        this.ri = toStringList(ri);
    }

    /** Converts a raw KnowledgeBase (TweetyProject PlFormula objects) into a
     * plain string list Jackson can actually serialize, instead of letting
     * it walk the formula AST directly. */
    private static List<String> toStringList(KnowledgeBase knowledgeBase) {
        List<String> result = new ArrayList<>();
        if (knowledgeBase == null) {
            return result;
        }
        for (PlFormula formula : knowledgeBase) {
            result.add(formula.toString());
        }
        return result;
    }

    /** Independent snapshot of the current state — needed because the same
     * BaseRankResults instance is mutated across multiple trace steps; each
     * pushed step needs its own copy, not a shared reference. */
    public BaseRankResults copy() {
        BaseRankResults snapshot = new BaseRankResults();
        snapshot.i = this.i;
        snapshot.ei = this.ei == null ? null : new ArrayList<>(this.ei);
        snapshot.ePrev = this.ePrev == null ? null : new ArrayList<>(this.ePrev);
        snapshot.eNext = this.eNext == null ? null : new ArrayList<>(this.eNext);
        snapshot.ri = this.ri == null ? null : new ArrayList<>(this.ri);
        return snapshot;
    }

    public Integer getI() {
        return i;
    }

    public List<String> getEi() {
        return ei;
    }

    public List<String> getEprev() {
        return ePrev;
    }

    public List<String> getEnext() {
        return eNext;
    }

    public List<String> getRi() {
        return ri;
    }

    public String toJson() throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();

        String json = mapper.writeValueAsString(this);
        System.out.println("Converted: "+json);

        return json;

    }

    @Override
    public String toString() {
        System.out.println("i: "+i);
        System.out.println("ei: "+ei);
        System.out.println("ePrev: "+ePrev);
        System.out.println("eNext: "+eNext);
        System.out.println("ri: "+ri);
        return "";
    }
}
