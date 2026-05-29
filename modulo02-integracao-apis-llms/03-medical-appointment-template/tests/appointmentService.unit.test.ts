import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentService, professionals } from '../src/services/appointmentService.ts';

describe('AppointmentService Unit Tests', () => {
    let service: AppointmentService;

    beforeEach(() => {
        service = new AppointmentService();
    });

    it('should correctly check availability of a slot', () => {
        const professionalId = professionals[0].id;
        
        // A random slot that shouldn't be booked initially
        const date = new Date('2026-06-01T10:00:00.000Z');
        const available = service.checkAvailability(professionalId, date);
        assert.equal(available, true);
    });

    it('should successfully book an appointment when slot is available', () => {
        const professionalId = professionals[0].id;
        const date = new Date('2026-06-01T11:00:00.000Z');
        const patientName = 'Maria Oliveira';
        const reason = 'Check-up';

        const appointment = service.bookAppointment(professionalId, date, patientName, reason);

        assert.equal(appointment.patientName, patientName);
        assert.equal(appointment.professionalId, professionalId);
        assert.equal(appointment.date, date.toISOString());
        assert.equal(appointment.reason, reason);

        // Slot should now be unavailable
        const available = service.checkAvailability(professionalId, date);
        assert.equal(available, false);
    });

    it('should throw an error when booking a slot that is already booked', () => {
        const professionalId = professionals[0].id;
        const date = new Date('2026-06-01T12:00:00.000Z');
        const patientName1 = 'Maria Oliveira';
        const patientName2 = 'Pedro Costa';
        const reason = 'Consultation';

        // Book first appointment
        service.bookAppointment(professionalId, date, patientName1, reason);

        // Try booking the same slot
        assert.throws(() => {
            service.bookAppointment(professionalId, date, patientName2, reason);
        }, /Horário indisponível para este profissional/);
    });

    it('should successfully cancel a booked appointment', () => {
        const professionalId = professionals[0].id;
        const date = new Date('2026-06-01T13:00:00.000Z');
        const patientName = 'João de Souza';
        const reason = 'First Consult';

        // Book
        service.bookAppointment(professionalId, date, patientName, reason);
        assert.equal(service.checkAvailability(professionalId, date), false);

        // Cancel
        service.cancelAppointment(professionalId, patientName, date);
        assert.equal(service.checkAvailability(professionalId, date), true);
    });

    it('should throw an error when trying to cancel a non-existent appointment', () => {
        const professionalId = professionals[0].id;
        const date = new Date('2026-06-01T14:00:00.000Z');
        const patientName = 'Non Existent';

        assert.throws(() => {
            service.cancelAppointment(professionalId, patientName, date);
        }, /Agendamento não encontrado para cancelamento/);
    });

    it('should retrieve appointments for a specific patient', () => {
        const professionalId = professionals[0].id;
        const date = new Date('2026-06-02T10:00:00.000Z');
        const patientName = 'Carlos Santos';
        
        service.bookAppointment(professionalId, date, patientName, 'Rotina');
        const results = service.getAppointmentsForPatient(patientName);
        
        assert.equal(results.length, 1);
        assert.equal(results[0].patientName, patientName);
    });

    it('should retrieve professionals, optionally filtered by specialty', () => {
        const allProfs = service.getProfessionals();
        assert.equal(allProfs.length, professionals.length);

        const cardProfs = service.getProfessionals('Cardiologia');
        assert.equal(cardProfs.length, 1);
        assert.equal(cardProfs[0].specialty, 'Cardiologia');
    });

    it('should successfully reschedule an appointment', () => {
        const professionalId = professionals[0].id;
        const oldDate = new Date('2026-06-03T10:00:00.000Z');
        const newDate = new Date('2026-06-03T11:00:00.000Z');
        const patientName = 'Beatriz Silva';

        service.bookAppointment(professionalId, oldDate, patientName, 'Checkup');
        
        const rescheduled = service.rescheduleAppointment(professionalId, patientName, oldDate, newDate, 'Reagendado');
        assert.equal(rescheduled.date, newDate.toISOString());
        assert.equal(rescheduled.reason, 'Reagendado');

        // Old slot should be available, new slot should be unavailable
        assert.equal(service.checkAvailability(professionalId, oldDate), true);
        assert.equal(service.checkAvailability(professionalId, newDate), false);
    });

    it('should throw an error when rescheduling a non-existent appointment', () => {
        const professionalId = professionals[0].id;
        const oldDate = new Date('2026-06-04T10:00:00.000Z');
        const newDate = new Date('2026-06-04T11:00:00.000Z');

        assert.throws(() => {
            service.rescheduleAppointment(professionalId, 'Ninguem', oldDate, newDate);
        }, /Agendamento original não encontrado para reagendamento/);
    });

    it('should throw an error when rescheduling to an already booked slot', () => {
        const professionalId = professionals[0].id;
        const datePatient1 = new Date('2026-06-05T10:00:00.000Z');
        const datePatient2 = new Date('2026-06-05T11:00:00.000Z');
        
        // Book slot 1 for Patient 1
        service.bookAppointment(professionalId, datePatient1, 'Patient One', 'Consult 1');
        // Book slot 2 for Patient 2
        service.bookAppointment(professionalId, datePatient2, 'Patient Two', 'Consult 2');

        // Try rescheduling Patient 1's appointment to slot 2 (which is occupied by Patient 2)
        assert.throws(() => {
            service.rescheduleAppointment(professionalId, 'Patient One', datePatient1, datePatient2);
        }, /Novo horário indisponível para este profissional/);
    });
});
