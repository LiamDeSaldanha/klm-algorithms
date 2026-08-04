package uct.cs.klm.algorithms;

import io.javalin.Javalin;
import io.javalin.json.JavalinJackson;
import org.slf4j.LoggerFactory;
import uct.cs.klm.algorithms.config.ObjectMapperConfig;
import uct.cs.klm.algorithms.controllers.*;

/**
 * This class represents the main application for a given query.
 * 
 * @author Chipo Hamayobe (chipo@cs.uct.ac.za)
 * @version 1.0.1
 * @since 2024-01-01
 */

public class App {
  
  private static final org.slf4j.Logger _logger = LoggerFactory.getLogger(App.class);
 
  public static void main(String[] args) {
   
    _logger.info("Application started.");
    _logger.debug("Debugging application.");
    _logger.error("An error occurred.");

    Javalin app = Javalin.create(config -> {
      config.jsonMapper(new JavalinJackson(ObjectMapperConfig.createObjectMapper(), true));
      config.staticFiles.add("/web");
      // config.staticFiles.add("/"); // Other static assets, external to the ReactJS
      config.spaRoot.addFile("/", "/web/index.html"); // Catch-all route for the single-page application

      // In Javalin 7 routing and lifecycle handlers are configured upfront in the config block.
      config.routes.before(ctx -> ctx.header("Access-Control-Allow-Credentials", "true"));

      // query
      config.routes.get("/api/queries/get-formula", FormulaController::getQueryFormula);
      config.routes.post("/api/queries/create-formula/{queryFormula}", FormulaController::createQueryFormula);

      // knowledge-base
      config.routes.get("/api/knowledge-base/get-default", KnowledgeBaseController::getDefaultKnowledgeBase);
      config.routes.post("/api/knowledge-base/generate", KnowledgeBaseController::generateKnowledgeBase);
      config.routes.post("/api/knowledge-base/get-signature", KnowledgeBaseController::getKnowledgeBaseSignature);
      config.routes.post("/api/knowledge-base/create-from-input", KnowledgeBaseController::createInputKnowledgeBase);
      config.routes.post("/api/knowledge-base/create-from-file", KnowledgeBaseController::createFileKnowledgeBase);

      // base-rank
      config.routes.post("/api/base-rank", BaseRankController::getBaseRank);
      config.routes.post("/api/base-rank-explanation", BaseRankController::generateBaseRankExplanation);

      // entailment
      config.routes.post("/api/entailment/{reasoner}/{queryFormula}", ReasonerController::getEntailment);

      // explanation
      config.routes.post("/api/explanation/{reasoner}", ReasonerController::getExplanation);

      // Evaluation
      config.routes.post("/api/evaluation", EvaluationController::getEvaluation);
      config.routes.post("/api/evaluation/import", EvaluationController::importEvaluation);
      config.routes.post("/api/evaluation/export", EvaluationController::exportEvaluation);
    });
    app.start(8080);
  }
}
