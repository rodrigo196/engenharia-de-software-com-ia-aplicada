import { getSystemPrompt, getUserPromptTemplate, IntentSchema } from '../../prompts/v1/identifyIntent.ts';
import { professionals } from '../../services/appointmentService.ts';
import { OpenRouterService } from '../../services/openRouterService.ts';
import type { GraphState } from '../graph.ts';

export function createIdentifyIntentNode(llmClient: OpenRouterService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    console.log(`🔍 Identifying intent...`);
   const input = state.messages.at(-1)!.text;

    try {
      const systemPrompt = getSystemPrompt(professionals);
      const userPrompt = getUserPromptTemplate(input);

      const result = await llmClient.generateStructured(
        systemPrompt,
        userPrompt,
        IntentSchema
      );

      if (!result.success) {
        console.error('❌ Failed to identify intent:', result.error);
        return { 
          intent: 'unknown',
          error: result.error,
          ...state,
        }
      }

      const intentData = result.data!;
      console.log(`✅ Intent identified: ${intentData.intent}`);
      console.log(`State parameters extracted:`, JSON.stringify(intentData));

      // 1. Fuzzy match professional ID if name is present but ID is missing
      if (!intentData.professionalId && intentData.professionalName) {
        const matched = professionals.find(p =>
          p.name.toLowerCase().includes(intentData.professionalName!.toLowerCase()) ||
          intentData.professionalName!.toLowerCase().includes(p.name.toLowerCase())
        );
        if (matched) {
          intentData.professionalId = matched.id;
          console.log(`ℹ️ Professional ID resolved from name: ${matched.id} (${matched.name})`);
        }
      }

      // 2. Rescheduling datetime mapping fallbacks
      if (intentData.intent === 'reschedule') {
        // If originalDatetime is missing, try datetime
        if (!intentData.originalDatetime && intentData.datetime) {
          intentData.originalDatetime = intentData.datetime;
          console.log(`ℹ️ Reschedule: originalDatetime resolved from datetime: ${intentData.originalDatetime}`);
        }
        // If newDatetime is missing, try datetime (only if it wasn't already mapped to originalDatetime)
        if (!intentData.newDatetime && intentData.datetime && intentData.datetime !== intentData.originalDatetime) {
          intentData.newDatetime = intentData.datetime;
          console.log(`ℹ️ Reschedule: newDatetime resolved from datetime: ${intentData.newDatetime}`);
        }
      }

      // 3. Scheduling/cancelling/checking availability datetime mapping fallbacks
      if (['schedule', 'cancel', 'check_availability'].includes(intentData.intent || '')) {
        if (!intentData.datetime) {
          if (intentData.newDatetime) {
            intentData.datetime = intentData.newDatetime;
            console.log(`ℹ️ Resolved datetime from newDatetime: ${intentData.datetime}`);
          } else if (intentData.originalDatetime) {
            intentData.datetime = intentData.originalDatetime;
            console.log(`ℹ️ Resolved datetime from originalDatetime: ${intentData.datetime}`);
          }
        }
      }

      return {
        ...intentData      
      };
      
    } catch (error) {
      console.error('❌ Error in identifyIntent node:', error);
      return {
        ...state,
        intent: 'unknown',
        error: error instanceof Error ? error.message : 'Intent identification failed',
      };
    }
  };
}
