import { PromptTemplate } from '@langchain/core/prompts';
import { prompts } from '../../config.ts';
import { OpenRouterService } from '../../services/openrouterService.ts';
import type { GraphState } from '../state.ts';

export const createGuardrailsCheckNode = (openRouterService: OpenRouterService) => {
    return async (state: GraphState): Promise<Partial<GraphState>> => {
        try {
            const lastMessage = state.messages ? state.messages[state.messages.length - 1].text : "";
             const systemPrompt = await PromptTemplate.fromTemplate(prompts.system).format({
                            USER_ROLE: state.user.role,
                            USER_NAME: state.user.displayName,
                        });
            
            
            const message = systemPrompt + "\n" + lastMessage;            
            
            const result = await openRouterService.checkGuardrails(
                message,
                state.guardrailsEnabled
            );

    
            return {
                guardrailCheck: result 
            };

        } catch (error) {
            console.error('Guardrails check failed: ', error);

            return {
                guardrailCheck:{
                    safe: false,
                    reason: 'Guardrails check failed due to an error. Please try again later.'
                }
            };
        }
    }
}
