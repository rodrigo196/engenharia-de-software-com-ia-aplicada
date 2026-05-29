import {
  StateGraph,
  START,
  END,
  MessagesZodMeta,
} from "@langchain/langgraph";
import { withLangGraph } from "@langchain/langgraph/zod";
import type { BaseMessage } from '@langchain/core/messages';

import { createSchedulerNode } from './nodes/schedulerNode.ts';
import { createCancellerNode } from './nodes/cancellerNode.ts';
import { createReschedulerNode } from './nodes/reschedulerNode.ts';
import { createAvailabilityNode } from './nodes/availabilityNode.ts';
import { createListAppointmentsNode } from './nodes/listAppointmentsNode.ts';
import { createListProfessionalsNode } from './nodes/listProfessionalsNode.ts';
import { createIdentifyIntentNode} from "./nodes/identifyIntentNode.ts";
import { createMessageGeneratorNode } from "./nodes/messageGeneratorNode.ts";

import { z } from "zod/v3";
import { OpenRouterService } from "../services/openRouterService.ts";
import { AppointmentService } from "../services/appointmentService.ts";

const AppointmentStateAnnotation = z.object({
  messages: withLangGraph(
    z.custom<BaseMessage[]>(),
    MessagesZodMeta),

  patientName: z.string().optional(),

  intent: z.enum(['schedule', 'cancel', 'reschedule', 'list_appointments', 'list_professionals', 'check_availability', 'unknown']).optional(),
  professionalId: z.number().optional(),
  professionalName: z.string().optional(),
  datetime: z.string().optional(),
  originalDatetime: z.string().optional(),
  newDatetime: z.string().optional(),
  reason: z.string().optional(),
  specialty: z.string().optional(),

  actionSuccess: z.boolean().optional(),
  actionError: z.string().optional(),
  appointmentData: z.any().optional(),
  appointmentsList: z.any().optional(),
  professionalsList: z.any().optional(),
  availabilityStatus: z.boolean().optional(),

  error: z.string().optional(),
});

export type GraphState = z.infer<typeof AppointmentStateAnnotation>;

export function buildAppointmentGraph(llmClient: OpenRouterService,
   appointmentService: AppointmentService) {


  // Build workflow graph
  const workflow = new StateGraph({
    stateSchema: AppointmentStateAnnotation,
  })
    .addNode('identifyIntent', createIdentifyIntentNode(llmClient))
    .addNode('schedule', createSchedulerNode(appointmentService))
    .addNode('cancel', createCancellerNode(appointmentService))
    .addNode('reschedule', createReschedulerNode(appointmentService))
    .addNode('check_availability', createAvailabilityNode(appointmentService))
    .addNode('list_appointments', createListAppointmentsNode(appointmentService))
    .addNode('list_professionals', createListProfessionalsNode(appointmentService))
    .addNode('message', createMessageGeneratorNode(llmClient))

    // Flow
    .addEdge(START, 'identifyIntent')

    // Route based on intent
    .addConditionalEdges(
      'identifyIntent',
      (state: GraphState): string => {
        if (state.error || !state.intent || state.intent === 'unknown') {
          return 'message';
        }

        console.log(`➡️  Routing based on intent: ${state.intent}`);
        return state.intent
      },
      {
        schedule: 'schedule',
        cancel: 'cancel',
        reschedule: 'reschedule',
        check_availability: 'check_availability',
        list_appointments: 'list_appointments',
        list_professionals: 'list_professionals',
        message: 'message',
      }
    )

    .addEdge('schedule', 'message')
    .addEdge('cancel', 'message')
    .addEdge('reschedule', 'message')
    .addEdge('check_availability', 'message')
    .addEdge('list_appointments', 'message')
    .addEdge('list_professionals', 'message')
    .addEdge('message', END);

  return workflow.compile();
}
