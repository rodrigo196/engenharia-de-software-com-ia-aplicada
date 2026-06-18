import { AIMessage } from 'langchain';
import { OpenRouterService } from '../../services/openrouterService.ts';
import type { GraphState } from '../graph.ts';
import { AnalyticalResponseSchema, getErrorResponsePrompt, getMultiStepSynthesisPrompt, getSystemPrompt, getUserPromptTemplate } from '../../prompts/v1/analyticalResponse.ts';

async function handleErrorResponse(state: GraphState, llmClient: OpenRouterService): Promise<Partial<GraphState>> {
  // Implement your error handling logic here, e.g., log the error, attempt to correct it, etc.
  console.error('Handling error response:', state.error);
  // For demonstration, we will just return a message indicating an error occurred.
  const systemPrompt = getSystemPrompt();
  const userPrompt = getErrorResponsePrompt(state.error!, state.question!);

  const { data, error} = await llmClient.generateStructured(
    systemPrompt, 
    userPrompt, 
    AnalyticalResponseSchema
  );

  if (error) {
    return {
      messages: [new AIMessage(`An error occurred while handling the previous error: ${error}`)],
      error,
      answer: `An error occurred while handling the previous error: ${error}`,
      followUpQuestions: []
    }
  }

  return {
    messages: [new AIMessage(data!.answer)],
    answer: data!.answer,
    followUpQuestions: data!.followUpQuestions
  };

}

async function generateAnalyticalResponse(state: GraphState, llmClient: OpenRouterService): Promise<Partial<GraphState>> {
  const systemPrompt = getSystemPrompt();
  let userPrompt: string

  if (
    Boolean(state.isMultiStep) && 
    Boolean(state.subResults?.length) && 
    Boolean(state.subQuestions?.length) &&
    Boolean(state.subQueries?.length)) {
      console.log('Generating response for multi-step question with sub-questions and sub-results...');
      const stepData = state.subResults!.map((result, index) => ({
        stepNumber: index + 1,
        question: state.subQuestions![index],
        query: state.subQueries![index],
        results: JSON.stringify(result),
      }))

      userPrompt = getMultiStepSynthesisPrompt(state.question!, stepData);
      
    } else {
      console.log('Generating response for single-step question...');
      userPrompt = getUserPromptTemplate(state.question!, state.query!, JSON.stringify(state.dbResults!));
    }

  const { data, error} = await llmClient.generateStructured(
    systemPrompt, 
    userPrompt, 
    AnalyticalResponseSchema
  );

  if (error) {
    return {
      messages: [new AIMessage(`An error occurred while generating the response: ${error}`)],
      error,
      answer: `An error occurred while generating the response: ${error}`,
      followUpQuestions: []
    }
  }

  return {
    messages: [new AIMessage(data!.answer)],
    answer: data!.answer,
    followUpQuestions: data!.followUpQuestions
  };
}

export function createAnalyticalResponseNode(llmClient: OpenRouterService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    try {

      if (state.error) {
        return await handleErrorResponse(state, llmClient);
      }

      return await generateAnalyticalResponse(state, llmClient);

    } catch (error: any) {
      console.error('Error generating analytical response:', error.message);
      return {
        ...state,
        error: `Response generation failed: ${error.message}`,
      };
    }
  }; 
}
