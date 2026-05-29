import type { Runtime } from '@langchain/langgraph';
import { OpenRouterService } from '../../services/openrouterService.ts';
import type { GraphState } from '../graph.ts';
import { ChatResponseSchema, getSystemPrompt, getUserPromptTemplate } from '../../prompts/v1/chatResponse.ts';
import { HumanMessage } from 'langchain';
import { AIMessage, isAIMessage } from '@langchain/core/messages';
import { PreferencesService } from '../../services/preferencesService.ts';
import { config } from '../../config.ts';

export function createChatNode(llmClient: OpenRouterService, preferencesService: PreferencesService) {
  return async (state: GraphState, runtime?: Runtime): Promise<Partial<GraphState>> => {

    const userId = String(runtime?.context?.userId || state.userId || 'default_user');
    const userContext =  state.userContext ?? await preferencesService.getBasicInfo(userId);
    const systemPrompt = getSystemPrompt(userContext);

    

    const conversationHistory = state.messages?.map(
      (message) => `${HumanMessage.isInstance(message) ? 'User' : 'AI'}: ${message.content}`)
      .join('\n') || '';

    const userMessage = state.messages.at(-1)?.text || '';
    const userPrompt = getUserPromptTemplate(userMessage, conversationHistory);

    const result = await llmClient.generateStructured(
      systemPrompt, 
      userPrompt, 
      ChatResponseSchema);

    if (!result.success || !result.data) {
      console.error('Erro ao gerar resposta estruturada:', result);
      return {
        messages: [
          new AIMessage('Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.'),
        ]
      };
    }

    const response = result.data;

    const totalMessages = state.messages ? state.messages.length : 0;
    const needSummarization = totalMessages > config.maxLengthToSummarize;

    return {
      messages: [
        new AIMessage(response.message),
      ],
      extractedPreferences: response.shouldSavePreferences ? response.preferences : undefined,
      needsSummarization: needSummarization,
    };
  };
}
