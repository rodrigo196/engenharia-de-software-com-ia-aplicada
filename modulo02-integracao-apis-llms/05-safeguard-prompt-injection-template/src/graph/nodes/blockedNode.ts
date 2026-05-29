import { PromptTemplate } from '@langchain/core/prompts';
import type { GraphState } from '../state.ts';
import { prompts } from '../../config.ts';
import { AIMessage } from 'langchain';

export async function blockedNode(state: GraphState): Promise<Partial<GraphState>> {
  const guardrailCheck = state.guardrailCheck!;
  const analysis = guardrailCheck.analysis ? `Analysis: ${guardrailCheck.analysis}` : '';

  const permissions = state.user.permissions.length ? 
    state.user.permissions.join(', ') :
    'None';

  const template = PromptTemplate.fromTemplate(prompts.blocked);
  const message = await template.format({
    USER_ROLE: state.user.role,
    PERMISSIONS: permissions,
    REASON: guardrailCheck.reason || 'No specific reason provided.',
    ANALYSIS: analysis || 'No analysis provided.',
  });

  return {
    messages: [new AIMessage(message)],
  };
}
