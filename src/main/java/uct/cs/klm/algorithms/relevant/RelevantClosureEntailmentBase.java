package uct.cs.klm.algorithms.relevant;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.tweetyproject.logics.pl.reasoner.SatReasoner;
import org.tweetyproject.logics.pl.sat.Sat4jSolver;
import org.tweetyproject.logics.pl.sat.SatSolver;
import org.tweetyproject.logics.pl.syntax.Implication;
import org.tweetyproject.logics.pl.syntax.Negation;
import org.tweetyproject.logics.pl.syntax.PlFormula;
import uct.cs.klm.algorithms.enums.ReasonerType;
import uct.cs.klm.algorithms.explanation.IJustificationService;

import uct.cs.klm.algorithms.ranking.BaseRankService;
import uct.cs.klm.algorithms.ranking.ModelBaseRank;
import uct.cs.klm.algorithms.models.ModelEntailment;
import uct.cs.klm.algorithms.models.KnowledgeBase;
import uct.cs.klm.algorithms.models.ModelRankResponse;
import uct.cs.klm.algorithms.models.ModelRelevantClosureEntailment;
import uct.cs.klm.algorithms.ranking.ModelRankCollection;
import uct.cs.klm.algorithms.ranking.ModelRank;
import uct.cs.klm.algorithms.services.KlmReasonerBase;
import uct.cs.klm.algorithms.utils.DisplayUtils;
import uct.cs.klm.algorithms.utils.ReasonerFactory;
import uct.cs.klm.algorithms.utils.ReasonerUtils;
import uct.cs.klm.algorithms.utils.Symbols;

/**
 * This class represents a relevant closure entailment base for a given query.
 *
 * @author Chipo Hamayobe (chipo@cs.uct.ac.za)
 * @version 1.0.1
 * @since 2024-01-01
 */
public abstract class RelevantClosureEntailmentBase extends KlmReasonerBase {

    private static final Logger _logger = LoggerFactory.getLogger(RelevantClosureEntailmentBase.class);

    public RelevantClosureEntailmentBase() {
        super();
    }

    protected ModelEntailment determineEntailment(
            ReasonerType reasonerType,
            ModelBaseRank baseRank,
            PlFormula queryFormula) {

        long startTime = System.nanoTime();

        PlFormula negationOfAntecedent = new Negation(((Implication) queryFormula).getFirstFormula());
        PlFormula materialisedQueryFormula = ReasonerUtils.toMaterialisedFormula(queryFormula);

        ModelRankCollection baseRankCollection = new ModelRankCollection(baseRank.getRanking().clone());
        Collections.sort(baseRankCollection, (o1, o2) -> Integer.compare(o1.getRankNumber(), o2.getRankNumber()));

        _logger.debug(String.format("->Query: %s", queryFormula));
        _logger.debug(String.format("->Query Antecedent Negation: %s", negationOfAntecedent));

        int consistentRank = 1;
        ModelRelevanceResult relevanceResult = GetRelevantRanks(reasonerType, baseRankCollection, negationOfAntecedent);
        ModelRankCollection relevantRanking = relevanceResult.getCorrectRelevantRanking();
        ModelRankCollection relevantRankingAll = relevanceResult.getRelevantRanking();
        ModelRankCollection irrelevantRanking = relevanceResult.getCorrectIrrelevantRanking();
        ModelRankCollection irrelevantRankingAll = relevanceResult.getIrrelevantRanking();

        ModelRankCollection nonRelevantRanking = ReasonerUtils.toRanksFromKnowledgeBase(baseRank, relevantRanking.getKnowledgeBase(), true);
        List<KnowledgeBase> powersets = ReasonerUtils.toPowerSetOrdered(relevantRanking);

        List<KnowledgeBase> relevantPowersets = new ArrayList<>();

        for (KnowledgeBase powerKb : powersets) {
            var combinedKb = ReasonerUtils.toCombinedKnowledgeBases(nonRelevantRanking.getKnowledgeBase(), powerKb);
            relevantPowersets.add(combinedKb);
        }
        relevantPowersets.add(nonRelevantRanking.getKnowledgeBase());
        relevantPowersets.add(baseRank.getRanking().getInfinityRank().getFormulas());

        _logger.debug("R+All: {}", relevantRankingAll.getKnowledgeBase());
        _logger.debug("R+: {}", relevantRanking.getKnowledgeBase());

        _logger.debug("->R+ Ranking");
        for (ModelRank rank : relevantRanking) {
            _logger.debug(String.format("   %s:%s", DisplayUtils.toRankNumberString(rank.getRankNumber()), rank.getFormulas()));
        }

        _logger.debug("R-All: {}", irrelevantRankingAll.getKnowledgeBase());
        _logger.debug("R-: {}", irrelevantRanking.getKnowledgeBase());

        _logger.debug("->R- Ranking");
        for (ModelRank rank : irrelevantRanking) {
            _logger.debug(String.format("   %s:%s", DisplayUtils.toRankNumberString(rank.getRankNumber()), rank.getFormulas()));
        }

        _logger.debug("->Non RelevantRanking All");
        for (ModelRank rank : nonRelevantRanking) {
            _logger.debug(String.format("   %s:%s", DisplayUtils.toRankNumberString(rank.getRankNumber()), rank.getFormulas()));
        }

        var materialisedKb = ReasonerUtils.toMaterialisedKnowledgeBase(baseRankCollection);

        _logger.debug(String.format("-> Checking if full KB is consistent with query %s", materialisedKb));

        boolean continueProcessing = true;
        boolean isQueryEntailed = false;
        boolean isNegationEntailed = _reasoner.query(materialisedKb, negationOfAntecedent);

        if (isNegationEntailed) {
            DisplayUtils.LogDebug(_logger, String.format("=> YES - NegationOfAntecedent:Entailed; We skip and consider the relevant subsets"));
        } else {
             continueProcessing = false;
            _logger.debug("  NOT - NegationOfAntecedent:Entailed; We checking if materialisedKB entails query");
            isQueryEntailed = _reasoner.query(materialisedKb, materialisedQueryFormula);
        }

        if (!continueProcessing) {

            return CreateResponse(
                    baseRank,
                    queryFormula,
                    materialisedKb,
                    relevantRanking,
                    baseRankCollection,
                    relevantPowersets,
                    consistentRank,
                    relevanceResult.getRelevantKnowledgeBase(),
                    relevanceResult.getJustification(),
                    isQueryEntailed,
                    startTime);
        }

        consistentRank = 0;
        int nonEntailmentRank = -1;
        for (KnowledgeBase powerKb : relevantPowersets) {

            consistentRank++;

            if (!continueProcessing) {
                break;
            }

            DisplayUtils.LogDebug(_logger, String.format("=> Powerset %s := %s", consistentRank, powerKb));

            materialisedKb = ReasonerUtils.toMaterialisedKnowledgeBase(powerKb);

            DisplayUtils.LogDebug(_logger, String.format("=> Materialised KB: %s := %s", consistentRank, materialisedKb));

            isNegationEntailed = _reasoner.query(materialisedKb, negationOfAntecedent);

            if (isNegationEntailed) {
                DisplayUtils.LogDebug(_logger, String.format("=> YES - NegationOfAntecedent:Entailed; We skip and move next subset: %s := %s", consistentRank, powerKb));
            } else {
                   continueProcessing = false;
                _logger.debug("  NOT - NegationOfAntecedent:Entailed; We checking if materialisedKB entails query");
                isQueryEntailed = _reasoner.query(materialisedKb, materialisedQueryFormula);
                if (isQueryEntailed) {
                    continueProcessing = false;
                } else {
                    _logger.debug("  But the query is not entailed by the remaining statements");
                }
            }

             if (!continueProcessing) {
                break;
            }

            DisplayUtils.LogDebug(_logger, String.format(""));
        }

        if (nonEntailmentRank != -1 && !isQueryEntailed) {
            consistentRank = nonEntailmentRank;
        }

        return CreateResponse(
                baseRank,
                queryFormula,
                materialisedKb,
                relevantRanking,
                irrelevantRankingAll,
                relevantPowersets,
                consistentRank,
                relevanceResult.getRelevantKnowledgeBase(),
                relevanceResult.getJustification(),
                isQueryEntailed,
                startTime);

    }

    private ModelEntailment CreateResponse(
            ModelBaseRank baseRank,
            PlFormula queryFormula,
            KnowledgeBase materialisedKb,
            ModelRankCollection relevantRanking,
            ModelRankCollection irrelevantRanking,
            List<KnowledgeBase> powersets,
            int consistentRank,
            KnowledgeBase relevantKnowledgeBase,
            ArrayList<KnowledgeBase> relevantJustification,
            boolean isQueryEntailed,
            long startTime) {

        ModelRankCollection remainingRanking = ReasonerUtils.toRanksFromKnowledgeBase(baseRank, materialisedKb, false);
        ModelRankCollection removedRanking = ReasonerUtils.toRanksFromKnowledgeBase(baseRank, remainingRanking.getKnowledgeBase(), true);

        if (!isQueryEntailed) {
            var infinityRank = baseRank.getRanking().clone().getInfinityRank();
            isQueryEntailed = doesInfinityRankEntailQuery(infinityRank, queryFormula);

            DisplayUtils.LogDebug(_logger, String.format("=> Checking the Infinity Rank entails the query"));
            DisplayUtils.LogDebug(_logger, String.format("=> Infinity KB := %s", infinityRank.getFormulas()));

            if (isQueryEntailed) {
                consistentRank = powersets.size();
                remainingRanking = new ModelRankCollection(infinityRank);
                removedRanking = baseRank.getRanking().getRankingCollectonExcept(Symbols.INFINITY_RANK_NUMBER);

                materialisedKb = infinityRank.getFormulas();

                DisplayUtils.LogDebug(_logger, String.format("=> Yes, Infinity KB: %s entails %s", materialisedKb, queryFormula));
                DisplayUtils.LogDebug(_logger, String.format("=> RemainingRanking := %s", remainingRanking.getKnowledgeBase()));
                DisplayUtils.LogDebug(_logger, String.format("=> RemovedRanking := %s", removedRanking.getKnowledgeBase()));
            } 
        }

        if (isQueryEntailed) {
            _logger.debug(String.format("-> Entailment:YES : %s entails %s", materialisedKb, queryFormula));
        } else {
            _logger.debug(String.format("-> Entailment:NO : %s does not entail %s", materialisedKb, queryFormula));
        }

        ArrayList<ModelRankResponse> powersetRanking1 = ReasonerUtils.toResponseRanks(baseRank, powersets, false);
       // ArrayList<ModelRankResponse> powersetRanking = ReasonerUtils.toResponseRanks(baseRank, irrelevantRanking, powersets);

        ArrayList<ModelRankResponse> powersetRanking = new ArrayList<>();
    
        for (var k : powersetRanking1) {         
            boolean addSet = true;

            for (PlFormula formula : irrelevantRanking.getKnowledgeBase()) {              
                if (!k.formulas() .contains(formula.toString())) {
                    addSet = false;
                }
            }

            if(addSet)
            {
                powersetRanking.add(k);
            }
          
        }

        _logger.debug(String.format("-> Powerset Ranking"));
        for (var k : powersetRanking) {
            _logger.debug(String.format("=> %s: %s", k.rankNumber(), k.formulas()));
        }

        /*
        var finalRemovedRanking = new ModelRankCollection();
        var relevantKb = ReasonerUtils.toMaterialisedKnowledgeBase(relevantRanking.getKnowledgeBase());
        // _logger.debug(String.format("=> %REL: %s", relevantKb));
        //  _logger.debug(String.format("=> %REM: %s", removedRanking.getKnowledgeBase()));

        for (var removeRank : removedRanking) {
            ModelRank rank = new ModelRank(removeRank.getRankNumber());
            boolean addRank = false;

            for (var removeStatement : removeRank.getFormulas()) {

                if (relevantKb.contains(ReasonerUtils.toMaterialisedFormula(removeStatement))) {
                    rank.addFormula(removeStatement);
                    addRank = true;
                } else {
                    var remainRank = remainingRanking.getRank(removeRank.getRankNumber());
                    if (remainRank == null) {
                        ModelRank newRank = new ModelRank(removeRank.getRankNumber());
                        newRank.addFormula(removeStatement);
                        remainingRanking.add(newRank);
                    } else {
                        remainingRanking.getRank(removeRank.getRankNumber()).addFormula(removeStatement);
                    }
                }
            }

            if (addRank) {
                finalRemovedRanking.add(rank);
            }
        }*/
        var finalTime = ReasonerUtils.ToTimeDifference(startTime, System.nanoTime());

        return new ModelRelevantClosureEntailment.ModelRelevantClosureEntailmentBuilder()
                .withKnowledgeBase(baseRank.getKnowledgeBaseKb())
                .withQueryFormula(queryFormula)
                .withBaseRanking(baseRank.getRanking())
                .withRemovedRanking(removedRanking)
                .withRemainingRanking(remainingRanking)
                .withRelevantRankCollection(relevantRanking)
                .withIrrelevantRankCollection(irrelevantRanking)
                .withConsistentRank(consistentRank)
                .withPowersetRanking(powersetRanking)
                .withEntailmentKnowledgeBase(remainingRanking.getKnowledgeBase())
                .withRelevantJustification(relevantJustification)
                .withRelevantKnowledgeBase(relevantKnowledgeBase)
                .withEntailed(isQueryEntailed)
                .withTimeTaken(finalTime)
                .build();
    }

    private ModelRelevanceResult GetRelevantRanks(
            ReasonerType reasonerType,
            ModelRankCollection baseRankCollection,
            PlFormula negationOfAntecedent) {

        var originalKb = baseRankCollection.getKnowledgeBase();

        IJustificationService justificationService = ReasonerFactory.createJustification(reasonerType);
        var justificationCollection = justificationService.computeAllJustifications(
                baseRankCollection.getInfinityRank(),
                originalKb,
                negationOfAntecedent,
                false);

        KnowledgeBase incosistentKb = new KnowledgeBase();

        KnowledgeBase relevantKb = new KnowledgeBase();

        for (var justificationEntry : justificationCollection) {

            relevantKb.addKnowledgeBase(justificationEntry);

            for (var formula : justificationEntry) {

                var formulaMaterialised = ReasonerUtils.toMaterialisedFormula(formula);

                if (!incosistentKb.contains(formulaMaterialised)) {
                    incosistentKb.add(formulaMaterialised);
                }
            }
        }

        KnowledgeBase miniKb = new KnowledgeBase();

        if (reasonerType == ReasonerType.MinimalRelevantClosure) {

            var allRanks = baseRankCollection.getRankingCollectonExceptInfinity();
            List<Integer> justList = new ArrayList<>();

            for (ModelRank rank : allRanks) {

                var rankFomulas = rank.getFormulas();

                _logger.debug(String.format("=> Rel Rank %s: %s", rank.getRankNumber(), rankFomulas));

                int justCounter = 0;
                for (var just : justificationCollection) {

                    if (justList.contains(justCounter)) {
                        continue;
                    }

                    var rankNumber = -1;
                    _logger.debug(String.format("=> Rel Just %s: %s", justCounter, just.getFormulas()));

                    for (var formula : just.getFormulas()) {

                        var deMaterialised = ReasonerUtils.toDematerialisedFormula(formula);
                        _logger.debug(String.format("=> Rel Formula %s: %s IN %s", justCounter, deMaterialised, rankFomulas));

                        if (rankFomulas.contains(deMaterialised)) {
                            if (rankNumber == -1) {
                                rankNumber = rank.getRankNumber();
                                justList.add(justCounter);
                            }

                            if (rank.getRankNumber() == rankNumber) {
                                miniKb.add(formula);
                            }
                        }
                    }

                    justCounter++;
                }
            }

            _logger.debug(String.format("   Mini := %s", miniKb.getFormulas()));


        }

        ModelRankCollection resultIncosistentRank = new ModelRankCollection();
        ModelRankCollection resultRelevantRank = new ModelRankCollection();
        ModelRankCollection resultIrrelevantRank = new ModelRankCollection();

        for (var currentRank : baseRankCollection) {

            var rankNumber = currentRank.getRankNumber();

            var incosistentRank = new ModelRank(rankNumber);
            var addIncosistentRank = false;

            var irrelevantRank = new ModelRank(rankNumber);
            boolean addIrrelevantRank = false;

            var relevantRank = new ModelRank(rankNumber);
            boolean addRelevantRank = false;

            for (var formula : currentRank.getFormulas()) {

                var formulaMaterialised = ReasonerUtils.toMaterialisedFormula(formula);

                if (incosistentKb.contains(formulaMaterialised)) {
                    addIncosistentRank = true;
                    incosistentRank.addFormula(formula);
                }

                if (reasonerType == ReasonerType.MinimalRelevantClosure) {
                    if (ReasonerUtils.toMaterialisedKnowledgeBase(miniKb).contains(formulaMaterialised)) {
                        addRelevantRank = true;
                        relevantRank.addFormula(formula);
                    } else {
                        addIrrelevantRank = true;
                        irrelevantRank.addFormula(formula);
                    }

                } else {
                    if (incosistentKb.contains(formulaMaterialised)) {
                        addRelevantRank = true;
                        relevantRank.addFormula(formula);
                    } else {
                        addIrrelevantRank = true;
                        irrelevantRank.addFormula(formula);
                    }
                }

            }

            if (addIncosistentRank) {
                resultIncosistentRank.add(incosistentRank);
            }

            if (addRelevantRank) {
                resultRelevantRank.add(relevantRank);
            }

            if (addIrrelevantRank) {
                resultIrrelevantRank.add(irrelevantRank);
            }
        }

        _logger.debug(String.format("   I := %s", resultIncosistentRank.getKnowledgeBase().getFormulas()));
        _logger.debug(String.format("   R := %s", resultRelevantRank.getKnowledgeBase().getFormulas()));
        _logger.debug(String.format("   R- := %s", resultIrrelevantRank.getKnowledgeBase().getFormulas()));

        return new ModelRelevanceResult(
                resultIncosistentRank,
                resultRelevantRank,
                resultIrrelevantRank,
                relevantKb,
                justificationCollection);
    }

    public ModelRelevant getBasicRelevantJson(KnowledgeBase kb,PlFormula query, KnowledgeBase relevant,KnowledgeBase irrelevant){
        BaseRankService service = new BaseRankService();
        ModelBaseRank baseRank= service.construct(kb);
        SatSolver.setDefaultSolver(new Sat4jSolver());
        SatReasoner reasoner = new SatReasoner();

        ModelRelevant mr = new ModelRelevant();
        List<RelevantTracer> listRelevantTracer = new ArrayList<>();

        int i =0;
        KnowledgeBase relevantInf = baseRank.getRanking().getRank(Symbols.INFINITY_RANK_NUMBER).getFormulas();
        KnowledgeBase relevantPrime = new KnowledgeBase(relevant);
        // System.out.println("mat: "+relevantInf.materialise());
        //System.out.println("not mat: "+relevantInf);
        System.out.println("Entailment check");
        System.out.println("query negation: "+new Negation(((Implication)query).getFirstFormula()));
        while(reasoner.query((relevantInf).union(relevantPrime).union(irrelevant),new Negation(((Implication)query).getFirstFormula())) && relevantPrime.size()!=0){
            RelevantTracer rt = new RelevantTracer();
            rt.setI(i);
            rt.setBefore(relevantPrime.getStringFormulas());
            System.out.println("before: "+relevantPrime);
            KnowledgeBase intersection = relevant.intersection(baseRank.getRanking().getRank(i).getFormulas());
            rt.setIntersection(intersection.getStringFormulas());
            System.out.println("intersection: "+"at "+i+" set: "+intersection);
            relevantPrime = relevantPrime.difference(intersection);
            rt.setCurrent(relevantPrime.getStringFormulas());
            System.out.println("after: "+relevantPrime);
            listRelevantTracer.add(rt);
            i+=1;
        }
        mr.setSteps(listRelevantTracer);

        System.out.println("final KB: "+(relevantInf).union(relevantPrime).union(irrelevant));
        boolean entailment = reasoner.query((relevantInf).union(relevantPrime).union(irrelevant),query);
        mr.setEntailment(entailment);
        return mr;


    }

    /**
     * Same computation as getBasicRelevantJson, but every pseudocode line is
     * pushed as its own RelevantTracer step (lineIndex 0-4), so the frontend
     * can step through the algorithm line-by-line instead of just seeing one
     * snapshot per rank. Line numbering:
     *   0: evaluate the while-condition for the current rank i
     *   1: intersection := R+ ∩ Rank(i)
     *   2: R' := R' \ intersection
     *   3: i := i + 1
     *   4: terminal — final entailment check
     */
    public ModelRelevant getDetailedRelevantJson(
            KnowledgeBase kb,
            PlFormula query,
            KnowledgeBase relevant,
            KnowledgeBase irrelevant) {

        BaseRankService service = new BaseRankService();
        ModelBaseRank baseRank = service.construct(kb);
        SatSolver.setDefaultSolver(new Sat4jSolver());
        SatReasoner reasoner = new SatReasoner();

        ModelRelevant mr = new ModelRelevant();
        List<RelevantTracer> listRelevantTracer = new ArrayList<>();

        int i = 0;
        KnowledgeBase relevantInf = baseRank.getRanking().getRank(Symbols.INFINITY_RANK_NUMBER).getFormulas();
        KnowledgeBase relevantPrime = new KnowledgeBase(relevant);
        PlFormula negationOfAntecedent = new Negation(((Implication) query).getFirstFormula());

        System.out.println("[DEBUG] getDetailedRelevantJson: kb=" + kb + " query=" + query);
        System.out.println("[DEBUG] getDetailedRelevantJson: relevant (R+) input = " + relevant
                + " (size=" + relevant.size() + ")");
        System.out.println("[DEBUG] getDetailedRelevantJson: irrelevant (R-) input = " + irrelevant);
        System.out.println("[DEBUG] getDetailedRelevantJson: relevantInf (R_infinity) = " + relevantInf);
        System.out.println("[DEBUG] getDetailedRelevantJson: negationOfAntecedent = " + negationOfAntecedent);

        RelevantTracer rt = new RelevantTracer();

        while (true) {

            boolean entailsNegation = reasoner.query(relevantInf.union(relevantPrime).union(irrelevant), negationOfAntecedent);
            boolean loopCondition = entailsNegation && relevantPrime.size() != 0;

            System.out.println(String.format(
                    "[DEBUG] i=%d: entailsNegation=%s, relevantPrime.size()=%d, loopCondition=%s",
                    i, entailsNegation, relevantPrime.size(), loopCondition));

            // Line 0: evaluate the while-condition for this rank.
            rt.setI(i);
            rt.setLineIndex(0);
            rt.setBefore(relevantPrime.getStringFormulas());
            rt.setTerminated(!loopCondition);
            rt.setNote(loopCondition
                    ? String.format("Rank %d: negation of antecedent still entailed and R' is non-empty -> continue.", i)
                    : "Loop condition false (negation of antecedent no longer entailed, or R' is empty) -> terminate.");
            listRelevantTracer.add(rt.copy());

            if (!loopCondition) {
                System.out.println("[DEBUG] i=" + i + ": loop terminating (see loopCondition above).");
                break;
            }

            // Line 1: intersect the original relevant set with the current rank.
            KnowledgeBase intersection = relevant.intersection(baseRank.getRanking().getRank(i).getFormulas());
            System.out.println("[DEBUG] i=" + i + ": Rank(" + i + ") = "
                    + baseRank.getRanking().getRank(i).getFormulas() + ", intersection with R+ = " + intersection);
            rt.setLineIndex(1);
            rt.setIntersection(intersection.getStringFormulas());
            rt.setNote(String.format("Rank %d ^ R+ = %s", i, intersection));
            listRelevantTracer.add(rt.copy());

            // Line 2: remove that intersection from R'.
            relevantPrime = relevantPrime.difference(intersection);
            System.out.println("[DEBUG] i=" + i + ": R' after removal = " + relevantPrime);
            rt.setLineIndex(2);
            rt.setCurrent(relevantPrime.getStringFormulas());
            rt.setNote(String.format("R' := R' \\ (Rank %d ^ R+) = %s", i, relevantPrime));
            listRelevantTracer.add(rt.copy());

            // Line 3: advance to the next rank. The tracer still carries the
            // OLD i here, matching BaseRankService.getBaseRankJson's
            // convention (rankNumber++ happens after that method's four
            // line-pushes too) — the new i only becomes "current" once the
            // next while-condition check (line 0) actually runs. Stamping
            // the tracer with the incremented value here would make the
            // Algorithm badge jump to i+1 one step before the Result table
            // has any row for it.
            rt.setLineIndex(3);
            rt.setNote(String.format("i := %d", i + 1));
            listRelevantTracer.add(rt.copy());
            i += 1;
        }

        // Line 4 (terminal): entailment check on the full remaining knowledge base.
        KnowledgeBase finalKb = relevantInf.union(relevantPrime).union(irrelevant);
        boolean entailment = reasoner.query(finalKb, query);

        rt.setLineIndex(4);
        rt.setTerminated(true);
        rt.setCurrent(relevantPrime.getStringFormulas());
        rt.setNote(String.format("Final KB := %s -> entailed(%s) = %s", finalKb, query, entailment));
        listRelevantTracer.add(rt.copy());

        mr.setSteps(listRelevantTracer);
        mr.setRelevant(relevant.getStringFormulas());
        mr.setIrrelevant(irrelevant.getStringFormulas());
        mr.setEntailment(entailment);

        System.out.println("[DEBUG] getDetailedRelevantJson: finished, " + listRelevantTracer.size()
                + " total step(s), final i=" + i + ", entailed=" + entailment);

        return mr;
    }
}
