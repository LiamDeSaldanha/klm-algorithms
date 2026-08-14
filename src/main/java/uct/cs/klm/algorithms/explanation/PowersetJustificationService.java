package uct.cs.klm.algorithms.explanation;

import org.tweetyproject.logics.pl.reasoner.SatReasoner;
import org.tweetyproject.logics.pl.sat.Sat4jSolver;
import org.tweetyproject.logics.pl.sat.SatSolver;
import org.tweetyproject.logics.pl.syntax.Implication;
import org.tweetyproject.logics.pl.syntax.Negation;
import org.tweetyproject.logics.pl.syntax.PlFormula;
import uct.cs.klm.algorithms.models.DefeasibleImplication;
import uct.cs.klm.algorithms.models.KnowledgeBase;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class PowersetJustificationService {

    public static List<KnowledgeBase> getPowerSets(KnowledgeBase kb){

        List<KnowledgeBase> res = new ArrayList<>();
        res.add(new KnowledgeBase());
        kb = kb.separate()[0];
        List<PlFormula> plFormulas = new ArrayList<>(kb);

        for(PlFormula pl:plFormulas){
            List<KnowledgeBase> snapshot = new ArrayList<>(res);
            for(KnowledgeBase list: snapshot){
                KnowledgeBase tmp = new KnowledgeBase(list);
                tmp.add(pl);
                res.add(tmp);
            }
        }
        System.out.println("powerset: "+res);
        System.out.println("count: "+res.size());
        return res;

    }

    public static List<ModelJustificationTraceStep> justifications(KnowledgeBase kb,PlFormula query){
        List<KnowledgeBase> list = getPowerSets(kb);
        int min = Integer.MAX_VALUE;
        List<KnowledgeBase> resList = new ArrayList<>();
        KnowledgeBase res = new KnowledgeBase();
        SatSolver.setDefaultSolver(new Sat4jSolver());
        SatReasoner reasoner = new SatReasoner();
        System.out.println("query: "+query.toString());
        List<ModelJustificationTraceStep> result = new ArrayList<>();
        int count =1;

        KnowledgeBase classicalKnowledgeBase = kb.separate()[1];

        for(KnowledgeBase combination:list){

            ModelJustificationTraceStep step = new ModelJustificationTraceStep();
            step.setCandidateNumber(count);
            step.setCandidate(combination.getStringFormulas());
            for(PlFormula pl:classicalKnowledgeBase){
                combination.add(pl);
            }
            if(step.getCandidateNumber()!=1){
                step.setJustificationSoFar(new ArrayList<>((result.get(step.getCandidateNumber()-2)).getJustificationSoFar()));
            }else{
                step.setJustificationSoFar(new ArrayList<>());
            }

            System.out.println("subset: "+combination+" entailemnt: "+reasoner.query(combination,new Negation(((Implication) query).getFirstFormula())));
            //System.out.println(new Negation(((Implication) query).getFirstFormula()));
            if(reasoner.query(combination,new Negation(((Implication) query).getFirstFormula()))){
                boolean minimal = true;
                step.setEntailed(true);
                for(int i =0;i<resList.size();i++){
                    if(combination.containsAll(resList.get(i)) ){
                       // System.out.println("Relevant: "+combination +" i: "+i);

                        minimal = false;
                    }
                }

                //System.out.println("Relevant: "+combination);

                if(minimal){
                    step.setMinimal(true);
                    System.out.println("Relevant: "+combination);
                    resList.add(combination);

                }


            }
            if(step.isEntailed() && step.isMinimal()){




                step.getJustificationSoFar().add(step.getCandidate());


            }
            result.add(step);
            count++;
        }




        System.out.println("Possible relevant sets: "+resList);

        return result;

    }







}
