export const config = {
  apiKey: process.env.OPENROUTER_API_KEY!,
  httpReferer: '',
  xTitle: 'IA Devs - Sales Analytics Reporter',
  models: [
  //'meta-llama/llama-3.1-8b-instruct',
  'openai/gpt-oss-20b'
  //'openrouter/owl-alpha',
  //'arcee-ai/trinity-large-preview:free',
  //'openai/gpt-4o-mini-tts-2025-12-15'
  ],
  provider: {
    sort: {
      by: 'throughput', // Route to model with highest throughput (fastest response)
      partition: 'none',
    },
  },
  temperature: 0.7,
  neo4j: {
    uri: "neo4j://localhost:7687",
    username: "neo4j",
    password: "password",
  },
  maxCorrectionAttempts: 3,
  maxSubQuestions: 3,
};


export default config
