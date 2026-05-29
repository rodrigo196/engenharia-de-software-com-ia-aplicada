import { ChatOpenAI } from '@langchain/openai';
import { config, prompts, type ModelConfig } from '../config.ts';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { getMCPTools } from './mcpServie.ts';
import { PromptTemplate } from '@langchain/core/prompts';

export type GuardrailResult = {
    safe: boolean;
    reason?: string;
    score?: number;
    analysis?: string;
};

export class OpenRouterService {
    private config: ModelConfig;
    private llmClient: ChatOpenAI;
    private safeGuardModel: ChatOpenAI;
    private fsAgent: ReturnType<typeof createAgent> | null = null;
    private fallbackLlmClient: ChatOpenAI | null = null;
    private fallbackFsAgent: ReturnType<typeof createAgent> | null = null;

    constructor(configOverride?: ModelConfig) {
        this.config = configOverride ?? config;
        this.llmClient = this.#createChatModel(this.config.models[0]);
        this.safeGuardModel = this.#createChatModel(this.config.guardrailsModel);
    }

    #createChatModel(modelName: string): ChatOpenAI {
        return new ChatOpenAI({
            apiKey: this.config.apiKey,
            modelName: modelName,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
                defaultHeaders: {
                    'HTTP-Referer': this.config.httpReferer,
                    'X-Title': this.config.xTitle,
                },
            },
            modelKwargs: {
                models: this.config.models,
                provider: this.config.provider,
            },
        });
    }

    #createFallbackChatModel(): ChatOpenAI {
        const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL ?? 'openai/gpt-4o-mini';
        return new ChatOpenAI({
            apiKey: this.config.apiKey,
            modelName: fallbackModel,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
                defaultHeaders: {
                    'HTTP-Referer': this.config.httpReferer,
                    'X-Title': this.config.xTitle,
                },
            },
        });
    }

    #isRetriableProviderError(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const maybeError = error as {
            status?: number;
            message?: string;
            error?: {
                message?: string;
            };
        };

        const topMessage = maybeError.message ?? '';
        const nestedMessage = maybeError.error?.message ?? '';
        const providerError = topMessage.includes('Provider returned error') || nestedMessage.includes('Provider returned error');

        return maybeError.status === 400 && providerError;
    }

    async generate(
        systemPrompt: string,
        userPrompt: string,
    ): Promise<string> {

        const tools = await getMCPTools();

        if (!this.fsAgent) {
            this.fsAgent = createAgent({
                model: this.llmClient,
                tools: tools,
            });
        }

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
        ];

        try {
            const response = await this.fsAgent.invoke({ messages });
            return String(response.messages.at(-1)?.text ?? '');
        } catch (error) {
            if (!this.#isRetriableProviderError(error)) {
                throw error;
            }

            console.warn('Primary provider failed with 400. Retrying with fallback model...');

            if (!this.fallbackLlmClient) {
                this.fallbackLlmClient = this.#createFallbackChatModel();
            }

            if (!this.fallbackFsAgent) {
                this.fallbackFsAgent = createAgent({
                    model: this.fallbackLlmClient,
                    tools,
                });
            }

            const fallbackResponse = await this.fallbackFsAgent.invoke({ messages });
            return String(fallbackResponse.messages.at(-1)?.text ?? '');
        }
    }

    async checkGuardrails(
        userInput: string,
        enabled: boolean = true,
    )  {
       if (!enabled) {
            return {
                safe: true,
                reason: 'Guardrails check is disabled.',
            };
        }

        const template = PromptTemplate.fromTemplate(prompts.guardrails);
        const input = await template.format({
            USER_INPUT: userInput,
        });

        const response = await this.safeGuardModel.invoke([
            new HumanMessage(input),
        ]);

        const result = response.text.trim()
        const isUnsafe = result.toLowerCase().startsWith('unsafe');

        if (isUnsafe) {
            return {
                safe: false,
                reason: 'Prompt injection detected. The content of the message violates the safety guidelines.',
                analysis: result,
            };
        }

        return {
            safe: true,
            analysis: result,
        };

    }
}
