import { AppointmentService } from '../../services/appointmentService.ts';
import type { GraphState } from '../graph.ts';

export function createListAppointmentsNode(appointmentService: AppointmentService) {
  return async (state: GraphState): Promise<GraphState> => {
    console.log(`📋 Listing appointments...`);

    try {
      if (!state.patientName) {
        throw new Error('Nome do paciente é necessário para buscar consultas');
      }

      const list = appointmentService.getAppointmentsForPatient(
        state.patientName,
        state.professionalId
      );

      console.log(`✅ Appointments listed successfully, count: ${list.length}`);

      return {
        ...state,
        actionSuccess: true,
        appointmentsList: list,
      };
    
    } catch (error) {
      console.log(`❌ Listing appointments failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        ...state,
        actionSuccess: false,
        actionError: error instanceof Error ? error.message : 'Listing appointments failed',
      };
    }
  };
}
