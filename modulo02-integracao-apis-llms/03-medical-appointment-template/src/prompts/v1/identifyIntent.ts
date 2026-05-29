import { z } from 'zod';

export const IntentSchema = z.object({
  intent: z.enum(['schedule', 'cancel', 'reschedule', 'list_appointments', 'list_professionals', 'check_availability', 'unknown']).describe('The user intent'),
  professionalId: z.number().optional().describe('ID of the medical professional'),
  professionalName: z.string().optional().describe('Name of the medical professional'),
  datetime: z.string().optional().describe('Appointment date and time in ISO format'),
  originalDatetime: z.string().optional().describe('Original appointment date and time in ISO format (for rescheduling)'),
  newDatetime: z.string().optional().describe('New appointment date and time in ISO format (for rescheduling)'),
  patientName: z.string().optional().describe('Patient name extracted from question'),
  reason: z.string().optional().describe('Reason for appointment (for scheduling)'),
  specialty: z.string().optional().describe('Specialty of the medical professional (for listing/searching professionals)'),
});

export type IntentData = z.infer<typeof IntentSchema>;

export const getSystemPrompt = (professionals: any[]) => {
  return JSON.stringify({
    role: 'Intent Classifier for Medical Appointments',
    task: 'Identify user intent and extract all appointment-related details',
    professionals: professionals.map(p => ({ id: p.id, name: p.name, specialty: p.specialty })),
    current_date: new Date().toISOString(),
    rules: {
      schedule: {
        description: 'User wants to book/schedule a new appointment',
        keywords: ['schedule', 'book', 'appointment', 'I want to', 'make an appointment'],
        required_fields: ['professionalId', 'datetime', 'patientName'],
        optional_fields: ['reason']
      },
      cancel: {
        description: 'User wants to cancel an existing appointment',
        keywords: ['cancel', 'remove', 'delete', 'cancel my appointment'],
        required_fields: ['professionalId', 'datetime', 'patientName']
      },
      reschedule: {
        description: 'User wants to reschedule or change the date/time of an existing appointment to a new date/time',
        keywords: ['reschedule', 'change', 'move', 'reagendar', 'alterar', 'mudar o horario'],
        required_fields: ['professionalId', 'patientName', 'originalDatetime', 'newDatetime']
      },
      list_appointments: {
        description: 'User wants to list, view, or check their existing appointments',
        keywords: ['list', 'my appointments', 'what are my appointments', 'minhas consultas', 'listar consultas'],
        required_fields: ['patientName'],
        optional_fields: ['professionalId']
      },
      list_professionals: {
        description: 'User wants to see which medical professionals or specialties are available',
        keywords: ['professionals', 'doctors', 'specialties', 'who works here', 'medicos', 'especialidades'],
        optional_fields: ['specialty']
      },
      check_availability: {
        description: 'User wants to check if a specific doctor is available at a specific date/time',
        keywords: ['available', 'availability', 'is there a slot', 'disponivel', 'tem horario'],
        required_fields: ['professionalId', 'datetime']
      },
      unknown: {
        description: 'Anything not related to medical appointments, doctors, scheduling, or cancellation',
        examples: ['weather questions', 'general info', 'unrelated queries']
      }
    },
    extraction_instructions: {
      professionalId: 'Match the professional name mentioned in the question to the ID from the professionals list. Use fuzzy matching.',
      professionalName: 'Extract the professional name as mentioned by the user',
      datetime: 'Parse relative dates (today, tomorrow) and times. Convert to ISO format. Use current_date as reference.',
      originalDatetime: 'For rescheduling, parse the original or current date and time of the appointment. Convert to ISO format. Use current_date as reference.',
      newDatetime: 'For rescheduling, parse the new requested date and time. Convert to ISO format. Use current_date as reference.',
      patientName: 'Extract the patient name from the question or context',
      reason: 'Extract the reason/purpose for the appointment (only for scheduling)',
      specialty: 'Extract the medical specialty mentioned by the user (e.g. Cardiologia, Dermatologia, Neurologia)'
    },
    examples: [
      {
        input: 'I want to schedule with Dr. Alicio da Silva for tomorrow at 4pm for a check-up',
        output: { intent: 'schedule', professionalId: 1, professionalName: 'Dr. Alicio da Silva', datetime: '2026-02-12T16:00:00.000Z', reason: 'check-up' }
      },
      {
        input: 'Cancel my appointment with Dr. Ana Pereira today at 11am',
        output: { intent: 'cancel', professionalId: 2, professionalName: 'Dra. Ana Pereira', datetime: '2026-02-11T11:00:00.000Z' }
      },
      {
        input: 'Quero reagendar minha consulta com o Dr. Alicio de hoje às 11h para amanhã às 14h, me chamo Joao da Silva',
        output: { intent: 'reschedule', professionalId: 1, professionalName: 'Dr. Alicio da Silva', patientName: 'Joao da Silva', originalDatetime: '2026-02-11T11:00:00.000Z', newDatetime: '2026-02-12T14:00:00.000Z' }
      },
      {
        input: 'Quais consultas eu, Maria Santos, tenho agendadas?',
        output: { intent: 'list_appointments', patientName: 'Maria Santos' }
      },
      {
        input: 'Quais especialistas em Dermatologia atendem na clínica?',
        output: { intent: 'list_professionals', specialty: 'Dermatologia' }
      },
      {
        input: 'O Dr. Alicio tem horário livre amanhã às 11h?',
        output: { intent: 'check_availability', professionalId: 1, professionalName: 'Dr. Alicio da Silva', datetime: '2026-02-12T11:00:00.000Z' }
      },
      {
        input: 'What is the weather today?',
        output: { intent: 'unknown' }
      }
    ]
  });
};

export const getUserPromptTemplate = (question: string) => {
  return JSON.stringify({
    question,
    instructions: [
      'Carefully analyze the question to determine the user intent',
      'Extract all relevant appointment details',
      'Convert dates and times to ISO format',
      'Match professional names to their IDs',
      'Return only the fields that are present in the question'
    ]
  });
};
