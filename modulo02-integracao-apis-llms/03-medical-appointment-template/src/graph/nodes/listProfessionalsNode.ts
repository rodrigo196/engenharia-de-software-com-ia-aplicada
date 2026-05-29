import { AppointmentService } from '../../services/appointmentService.ts';
import type { GraphState } from '../graph.ts';

export function createListProfessionalsNode(appointmentService: AppointmentService) {
  return async (state: GraphState): Promise<GraphState> => {
    console.log(`🩺 Listing medical professionals...`);

    try {
      const list = appointmentService.getProfessionals(state.specialty);

      console.log(`✅ Professionals listed successfully, count: ${list.length}`);

      return {
        ...state,
        actionSuccess: true,
        professionalsList: list,
      };
    
    } catch (error) {
      console.log(`❌ Listing professionals failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        ...state,
        actionSuccess: false,
        actionError: error instanceof Error ? error.message : 'Listing professionals failed',
      };
    }
  };
}
