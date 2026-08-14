package uct.cs.klm.algorithms.controllers;

import io.javalin.http.Context;
import org.tweetyproject.logics.pl.syntax.PlFormula;
import uct.cs.klm.algorithms.explanation.PowersetJustificationService;
import uct.cs.klm.algorithms.models.KnowledgeBase;
import uct.cs.klm.algorithms.models.ModelErrorResponse;
import uct.cs.klm.algorithms.ranking.BaseRankExplanationService;
import uct.cs.klm.algorithms.ranking.BaseRankService;
import uct.cs.klm.algorithms.ranking.IBaseRankExplanationService;
import uct.cs.klm.algorithms.ranking.IBaseRankService;
import uct.cs.klm.algorithms.utils.DefeasibleParser;

public class JustificationController {
    private static final PowersetJustificationService justificationService = new PowersetJustificationService();

    public static void getJustificationTrace(Context ctx) {

        try {
            String query = ctx.pathParam("queryFormula");
            DefeasibleParser parser = new DefeasibleParser();
            PlFormula queryFormula = parser.parseFormula(query);
            KnowledgeBase kb = ctx.bodyAsClass(KnowledgeBase.class);
            ctx.status(200);
            ctx.json(justificationService.justifications(kb,queryFormula));
        } catch (Exception e) {
            ctx.status(400);
            ctx.json(new ModelErrorResponse(400, "Bad Request", "The knowledge base is invalid"));
        }
    }

}
