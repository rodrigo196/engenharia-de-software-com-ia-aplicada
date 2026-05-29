import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';
import { professionals } from '../src/services/appointmentService.ts';

const app = createServer();

async function makeARequest(question: string) {
    return await app.inject({
        method: 'POST',
        url: '/chat',
        payload: {
            question,
        },
    });
}

describe('Medical Appointment System - E2E Tests', async () => {

    it('Schedule appointment - Success', async () => {
        const response = await makeARequest(
            `Olá, sou Maria Santos e quero agendar uma consulta com ${professionals.at(0)?.name} Dr. Alicio da Silva para amanhã às 16h para um check-up regular`
        )

        console.log('Schedule Success Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'schedule');
        assert.equal(body.actionSuccess, true);
    });


    it('Cancel appointment - Success', async () => {

         await makeARequest(
            `Sou Joao da Silva e quero agendar uma consulta com ${professionals.at(1)?.name} para hoje às 14h`
        )

        const response = await makeARequest(
            `Cancele minha consulta com ${professionals.at(1)?.name} que tenho hoje às 14h, me chamo Joao da Silva`
        );

        console.log('Cancel Success Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'cancel');
        assert.equal(body.actionSuccess, true);
    });

    it('Schedule appointment - Conflict (Slot already booked)', async () => {
        // Book a slot
        await makeARequest(
            `Olá, sou Carlos Silva e quero agendar uma consulta com ${professionals.at(0)?.name} para amanhã às 10h para exames`
        );

        // Try to book the same slot
        const response = await makeARequest(
            `Olá, sou Pedro Oliveira e quero agendar uma consulta com ${professionals.at(0)?.name} para amanhã às 10h para rotina`
        );

        console.log('Schedule Conflict Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'schedule');
        assert.equal(body.actionSuccess, false);
        assert.ok(body.actionError && body.actionError.includes('indisponível'));
    });

    it('Cancel appointment - Non-existent appointment', async () => {
        const response = await makeARequest(
            `Cancele minha consulta com ${professionals.at(2)?.name} que tenho amanhã às 11h, me chamo Lucas Souza`
        );

        console.log('Cancel Non-existent Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'cancel');
        assert.equal(body.actionSuccess, false);
        assert.ok(body.actionError && body.actionError.includes('não encontrado'));
    });

    it('Unknown intent - General conversation', async () => {
        const response = await makeARequest(
            `Olá, gostaria de saber se vocês atendem convênio ou qual é o endereço da clínica?`
        );

        console.log('Unknown Intent Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'unknown');
        assert.ok(body.messages && body.messages.length > 0);
    });

    it('Reschedule appointment - Success', async () => {
        const response = await makeARequest(
            `Olá, sou Joao da Silva e quero remarcar minha consulta com o Dr. Alicio da Silva de hoje às 11h para amanhã às 15h`
        );

        console.log('Reschedule Success Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'reschedule');
        assert.equal(body.actionSuccess, true);
    });

    it('List appointments - Success', async () => {
        const response = await makeARequest(
            `Quais consultas eu, Joao da Silva, tenho agendadas na clínica?`
        );

        console.log('List Appointments Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'list_appointments');
        assert.equal(body.actionSuccess, true);
        assert.ok(Array.isArray(body.appointmentsList));
    });

    it('List professionals - Success', async () => {
        const response = await makeARequest(
            `Quais médicos de Cardiologia trabalham na clínica?`
        );

        console.log('List Professionals Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'list_professionals');
        assert.equal(body.actionSuccess, true);
        assert.ok(Array.isArray(body.professionalsList));
    });

    it('Check availability - Success', async () => {
        const response = await makeARequest(
            `O Dr. Alicio da Silva tem horário livre amanhã às 17h?`
        );

        console.log('Check Availability Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'check_availability');
        assert.equal(body.actionSuccess, true);
        assert.equal(body.availabilityStatus, true);
    });
});

