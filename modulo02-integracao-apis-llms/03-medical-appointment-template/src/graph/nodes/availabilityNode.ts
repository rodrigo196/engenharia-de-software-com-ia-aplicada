import { AppointmentService } from '../../services/appointmentService.ts';
import type { GraphState } from '../graph.ts';

export function createAvailabilityNode(appointmentService: AppointmentService) {
  return async (state: GraphState): Promise<GraphState> => {
    console.log(`🔍 Checking availability...`);

    try {
      if (!state.professionalId || !state.datetime) {
        throw new Error('Informações insuficientes para verificar disponibilidade (médico e data/hora são necessários)');
      }

      const available = appointmentService.checkAvailability(
        state.professionalId,
        new Date(state.datetime)
      );

      console.log(`✅ Availability checked successfully: ${available}`);

      return {
        ...state,
        actionSuccess: true,
        availabilityStatus: available,
      };
    
    } catch (error) {
      console.log(`❌ Checking availability failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        ...state,
        actionSuccess: false,
        actionError: error instanceof Error ? error.message : 'Checking availability failed',
      };
    }
  };
}
