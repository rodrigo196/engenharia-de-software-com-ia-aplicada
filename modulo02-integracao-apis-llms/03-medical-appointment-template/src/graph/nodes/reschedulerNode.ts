import { AppointmentService } from '../../services/appointmentService.ts';
import type { GraphState } from '../graph.ts';

export function createReschedulerNode(appointmentService: AppointmentService) {
  return async (state: GraphState): Promise<GraphState> => {
    console.log(`🔄 Rescheduling appointment...`);

    try {
      if (!state.professionalId || !state.patientName || !state.originalDatetime || !state.newDatetime) {
        throw new Error('Informações insuficientes para o reagendamento (médico, paciente, data original e nova data são necessários)');
      }

      const appointment = appointmentService.rescheduleAppointment(
        state.professionalId,
        state.patientName,
        new Date(state.originalDatetime),
        new Date(state.newDatetime),
        state.reason
      );

      console.log(`✅ Appointment rescheduled successfully`);

      return {
        ...state,
        actionSuccess: true,
        appointmentData: appointment,
      };
    
    } catch (error) {
      console.log(`❌ Rescheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        ...state,
        actionSuccess: false,
        actionError: error instanceof Error ? error.message : 'Rescheduling failed',
      };
    }
  };
}
