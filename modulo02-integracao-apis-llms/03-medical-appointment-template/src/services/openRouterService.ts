import {ChatOpenAI} from "@langchain/openai";
import { config } from "../config.ts";
import type { ModelConfig } from "../config.ts";
import { z } from "zod/v3";
import { createAgent, HumanMessage, providerStrategy, SystemMessage } from "langchain";

export class OpenRouterService {
    private config: ModelConfig;
    private llmClient: ChatOpenAI;

    constructor(configOverride?: ModelConfig) {
        this.config = configOverride ?? config;

        this.llmClient = new ChatOpenAI({
            modelName: this.config.models[0],
            apiKey: this.config.apiKey,
            temperature: this.config.temperature,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
                defaultHeaders: {
                    'Referer': this.config.httpReferer,
                    'X-Title': this.config.xTitle,
                },
            },

            modelKwargs: {
                models: this.config.models,
                provider: this.config.provider,
            },

        });
    }

    async generateStructured<T>(
        systemPrompt: string,
        userPrompt: string,
        schema: z.ZodSchema<T>
    ) {
        if (process.env.MOCK_LLM === 'true') {
            console.log('🤖 Using Mock LLM fallback (env MOCK_LLM=true)');
            return this.getMockResponse(systemPrompt, userPrompt) as { success: boolean; data?: T; error?: string };
        }

        try {
            const agent = createAgent({
            model: this.llmClient,
            tools: [],
            responseFormat: providerStrategy(schema),
            });

            const messages = [
                new SystemMessage(systemPrompt),
                new HumanMessage(userPrompt),
            ];

            const data = await agent.invoke({messages});

            
            return {
                success: true,
                data: data.structuredResponse,
            }

        } catch (error) {
            console.warn('⚠️ OpenRouterService call failed, falling back to mock. Error:', error instanceof Error ? error.message : error);
            return this.getMockResponse(systemPrompt, userPrompt) as { success: boolean; data?: T; error?: string };
        }
    }

    private getMockResponse(systemPrompt: string, userPrompt: string) {
        if (systemPrompt.includes('Intent Classifier')) {
            const q = userPrompt.toLowerCase();
            let data: any = { intent: 'unknown' };

            if (q.includes('maria santos') && q.includes('agendar')) {
                data = {
                    intent: 'schedule',
                    professionalId: 1,
                    professionalName: 'Dr. Alicio da Silva',
                    datetime: '2026-05-25T16:00:00.000Z',
                    patientName: 'Maria Santos',
                    reason: 'check-up regular'
                };
            } else if (q.includes('joao da silva') && q.includes('agendar')) {
                data = {
                    intent: 'schedule',
                    professionalId: 2,
                    professionalName: 'Dra. Ana Pereira',
                    datetime: '2026-05-24T14:00:00.000Z',
                    patientName: 'Joao da Silva'
                };
            } else if (q.includes('cancele') && q.includes('joao da silva')) {
                data = {
                    intent: 'cancel',
                    professionalId: 2,
                    professionalName: 'Dra. Ana Pereira',
                    datetime: '2026-05-24T14:00:00.000Z',
                    patientName: 'Joao da Silva'
                };
            } else if (q.includes('carlos silva') && q.includes('agendar')) {
                data = {
                    intent: 'schedule',
                    professionalId: 1,
                    professionalName: 'Dr. Alicio da Silva',
                    datetime: '2026-05-25T10:00:00.000Z',
                    patientName: 'Carlos Silva',
                    reason: 'exames'
                };
            } else if (q.includes('pedro oliveira') && q.includes('agendar')) {
                data = {
                    intent: 'schedule',
                    professionalId: 1,
                    professionalName: 'Dr. Alicio da Silva',
                    datetime: '2026-05-25T10:00:00.000Z',
                    patientName: 'Pedro Oliveira',
                    reason: 'rotina'
                };
            } else if (q.includes('lucas souza') && q.includes('cancele')) {
                data = {
                    intent: 'cancel',
                    professionalId: 3,
                    professionalName: 'Dra. Carol Gomes',
                    datetime: '2026-05-25T11:00:00.000Z',
                    patientName: 'Lucas Souza'
                };
            } else if (q.includes('remarcar') && q.includes('joao da silva')) {
                data = {
                    intent: 'reschedule',
                    professionalId: 1,
                    professionalName: 'Dr. Alicio da Silva',
                    patientName: 'Joao da Silva',
                    originalDatetime: '2026-05-24T11:00:00.000Z',
                    newDatetime: '2026-05-25T15:00:00.000Z'
                };
            } else if (q.includes('consultas') && q.includes('joao da silva')) {
                data = {
                    intent: 'list_appointments',
                    patientName: 'Joao da Silva'
                };
            } else if (q.includes('cardiologia') || q.includes('médicos')) {
                data = {
                    intent: 'list_professionals',
                    specialty: 'Cardiologia'
                };
            } else if (q.includes('horário livre') || q.includes('disponível') || q.includes('tem horário')) {
                data = {
                    intent: 'check_availability',
                    professionalId: 1,
                    professionalName: 'Dr. Alicio da Silva',
                    datetime: '2026-05-25T17:00:00.000Z'
                };
            }

            return { success: true, data };
        }

        if (systemPrompt.includes('Friendly Medical Receptionist')) {
            try {
                const parsed = JSON.parse(userPrompt);
                return { success: true, data: { message: `Mocked response for scenario: ${parsed.scenario}` } };
            } catch {
                return { success: true, data: { message: 'Mocked response message' } };
            }
        }

        return { success: false, error: 'Unknown mock prompt scenario' };
    }
}
