import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentService, professionals } from '../src/services/appointmentService.ts';
import { createSchedulerNode } from '../src/graph/nodes/schedulerNode.ts';
import { createCancellerNode } from '../src/graph/nodes/cancellerNode.ts';
import { createReschedulerNode } from '../src/graph/nodes/reschedulerNode.ts';
import { createAvailabilityNode } from '../src/graph/nodes/availabilityNode.ts';
import { createListAppointmentsNode } from '../src/graph/nodes/listAppointmentsNode.ts';
import { createListProfessionalsNode } from '../src/graph/nodes/listProfessionalsNode.ts';
import type { GraphState } from '../src/graph/graph.ts';

describe('Graph Nodes Unit Tests', () => {
  const service = new AppointmentService();

  it('reschedulerNode - Success', async () => {
    const professionalId = professionals[0].id;
    const oldDate = new Date('2026-07-01T10:00:00.000Z');
    const newDate = new Date('2026-07-01T11:00:00.000Z');
    const patientName = 'Rita Santos';

    // Book first
    service.bookAppointment(professionalId, oldDate, patientName, 'Initial consult');

    const node = createReschedulerNode(service);
    const mockState: GraphState = {
      messages: [],
      patientName,
      professionalId,
      originalDatetime: oldDate.toISOString(),
      newDatetime: newDate.toISOString(),
      reason: 'Need new time',
    };

    const result = await node(mockState);
    assert.equal(result.actionSuccess, true);
    assert.ok(result.appointmentData);
    assert.equal(result.appointmentData.date, newDate.toISOString());
    assert.equal(result.appointmentData.reason, 'Need new time');
  });

  it('reschedulerNode - Missing details failure', async () => {
    const node = createReschedulerNode(service);
    const mockState: GraphState = {
      messages: [],
      patientName: 'Rita Santos',
      // professionalId is missing
    };

    const result = await node(mockState);
    assert.equal(result.actionSuccess, false);
    assert.ok(result.actionError);
    assert.match(result.actionError, /Informações insuficientes/);
  });

  it('availabilityNode - Available Success', async () => {
    const professionalId = professionals[0].id;
    const date = new Date('2026-07-02T10:00:00.000Z');

    const node = createAvailabilityNode(service);
    const mockState: GraphState = {
      messages: [],
      professionalId,
      datetime: date.toISOString(),
    };

    const result = await node(mockState);
    assert.equal(result.actionSuccess, true);
    assert.equal(result.availabilityStatus, true);
  });

  it('availabilityNode - Missing professional failure', async () => {
    const node = createAvailabilityNode(service);
    const mockState: GraphState = {
      messages: [],
      datetime: new Date().toISOString(),
    };

    const result = await node(mockState);
    assert.equal(result.actionSuccess, false);
    assert.ok(result.actionError);
  });

  it('listAppointmentsNode - Success', async () => {
    const patientName = 'Rita Santos';
    const node = createListAppointmentsNode(service);
    const mockState: GraphState = {
      messages: [],
      patientName,
    };

    const result = await node(mockState);
    assert.equal(result.actionSuccess, true);
    assert.ok(Array.isArray(result.appointmentsList));
    // Should find the rescheduled appointment from the first test
    assert.ok(result.appointmentsList.length >= 1);
    assert.equal(result.appointmentsList[0].patientName, patientName);
  });

  it('listAppointmentsNode - Missing patient name failure', async () => {
    const node = createListAppointmentsNode(service);
    const mockState: GraphState = {
      messages: [],
    };

    const result = await node(mockState);
    assert.equal(result.actionSuccess, false);
    assert.ok(result.actionError);
  });

  it('listProfessionalsNode - Success', async () => {
    const node = createListProfessionalsNode(service);
    const mockState: GraphState = {
      messages: [],
      specialty: 'Neurologia',
    };

    const result = await node(mockState);
    assert.equal(result.actionSuccess, true);
    assert.ok(Array.isArray(result.professionalsList));
    assert.equal(result.professionalsList.length, 1);
    assert.equal(result.professionalsList[0].specialty, 'Neurologia');
  });
});
