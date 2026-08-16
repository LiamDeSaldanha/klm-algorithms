package uct.cs.klm.algorithms.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.tweetyproject.logics.pl.syntax.PlFormula;

/**
 * This record models the request payload for the basic relevant closure
 * trace endpoint (getBasicRelevantJson), carrying exactly the four
 * parameters that method needs.
 *
 * @author Chipo Hamayobe (chipo@cs.uct.ac.za)
 * @version 1.0.1
 * @since 2024-01-01
 */
public record RelevantJsonRequest(
        @JsonProperty(required = true)
        KnowledgeBase knowledgeBase,

        @JsonProperty(required = true)
        PlFormula query,

        @JsonProperty(required = true)
        KnowledgeBase relevant,

        @JsonProperty(required = true)
        KnowledgeBase irrelevant
) {
}
