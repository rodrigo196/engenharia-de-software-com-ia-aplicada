import config from '../../config.ts';
import { Neo4jService } from '../../services/neo4jService.ts';
import type { GraphState } from '../graph.ts';

async function executeCypherQuery(neo4jService: Neo4jService, query: string) {
  try {
    const isValid = await neo4jService.validateQuery(query);
    if (!isValid) {
      return {
        results: null,
        error: 'Invalid Cypher query',
      };
    }

    const results = await neo4jService.query(query);
    if(!results) {
      return {
        results: [],
        error: 'No results returned from query',
      };
    }

    console.log('Cypher query results:', results.length);
    
    return {
      results,
      error: null,
    };
  } catch (error: any) {
    console.error('Error executing Cypher query:', error instanceof Error ? error.message : error);
    return {
        results: null,
        error: error?.message ?? 'Invalid Cypher query',
      };
  }
}

function hasMoreSteps(state: GraphState): boolean {
 if (!state.isMultiStep || !state.subQuestions?.length || state.currentStep === undefined)  {
  return false;
 }

 return state.currentStep < state.subQuestions.length;
}

function handleMultiStepProgression(state: GraphState, results: any[]) {
  const updatedSubResults = [
    ...state.subResults ?? [],
    results,
  ]

  const nextStep = (state.currentStep ?? 0) + 1;
  const multiStepState = {
    dbResults: results,
    subResults: updatedSubResults,
    currentStep: nextStep,
    needsCorrection: false, 
  }

  const totalSteps = state.subQuestions?.length ?? 0;
  console.log(`Progressing to step ${nextStep} of ${totalSteps}`);
  if (hasMoreSteps({...state, ...multiStepState})) {
    console.log(`More steps remaining. Awaiting next sub-question...`);
    return multiStepState;
  }

  console.log(`All steps completed. Finalizing multi-step process.`);
  return multiStepState;
 }

export function createCypherExecutorNode(neo4jService: Neo4jService) {

  return async (state: GraphState): Promise<Partial<GraphState>> => {
    try {
      const { results, error } = await executeCypherQuery(neo4jService, state.query!);
      
      if (error && results === null) {
        
        if ((state.correctionAttempts ?? 0) < config.maxCorrectionAttempts) {
          console.warn(`Cypher query execution failed: ${error}. Attempting correction... (Attempt ${state.correctionAttempts ?? 0 + 1})`);
          return {
            validationError: error,
            originalQuery: state.query,
            needsCorrection: true,
          };


        }

        return {
          ...state,
          error: "Invalid Cypher query - execution failed",
        };
      }

      if (state.isMultiStep && state.subQuestions?.length && state.currentStep !== undefined) {
        const multiStepState = handleMultiStepProgression(state, results!);
        return {
          ...multiStepState
        };
      }
      
      if (!results?.length) {
        return {
          dbResults: [],
          error: 'Query executed successfully but returned no results',
        };
      }

      return {
        dbResults: results,
        needsCorrection: false,
      };
    } catch (error) {
      console.error('Error executing Cypher query:', error instanceof Error ? error.message : error);

      return {
        error: 'Invalid Cypher query - correction failed',
      };
    }
    }
  };
