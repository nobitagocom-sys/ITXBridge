export default {
  id: "fpt-ai",
  priority: 260,
  alias: "fptai",
  display: {
    name: "FPT AI",
    icon: "cloud",
    color: "#F7941E",
    textIcon: "FA",
    website: "https://marketplace.fptcloud.com",
    notice: {
      apiKeyUrl: "https://marketplace.fptcloud.com/en/api-key",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://mkp-api.fptcloud.com/chat/completions",
    format: "openai",
  },
  models: [
    // LLMs & reasoning
    { id: "DeepSeek-R1", name: "DeepSeek R1" },
    { id: "DeepSeek-R1-Distill-Llama-70B", name: "DeepSeek R1 Distill Llama 70B" },
    { id: "DeepSeek-R1-Distill-Llama-8B", name: "DeepSeek R1 Distill Llama 8B" },
    { id: "DeepSeek-R1-Distill-Qwen-1.5B", name: "DeepSeek R1 Distill Qwen 1.5B" },
    { id: "DeepSeek-R1-Distill-Qwen-32B", name: "DeepSeek R1 Distill Qwen 32B" },
    { id: "Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct" },
    { id: "Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct" },
    { id: "Llama-3.3-Swallow-70B-Instruct-v0.4", name: "Llama 3.3 Swallow 70B Instruct" },
    { id: "Llama-Guard-3-8B", name: "Llama Guard 3 8B" },
    { id: "QwQ-32B", name: "QwQ 32B" },
    { id: "Qwen2.5-7B-instruct", name: "Qwen 2.5 7B Instruct" },
    { id: "Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B Instruct" },
    { id: "SaoLa3.1-medium", name: "SaoLa 3.1 Medium" },
    { id: "SaoLa-Llama3.1-planner", name: "SaoLa Llama 3.1 Planner" },
    { id: "Llama-4-Scout-17B-16E", name: "Llama 4 Scout 17B" },
    { id: "gpt-3.5-turbo-instruct", name: "GPT 3.5 Turbo Instruct" },
    // Vision
    { id: "Qwen2.5-VL-7B-Instruct", name: "Qwen 2.5 VL 7B Instruct", kind: "imageToText" },
    // Embedding
    { id: "Vietnamese_Embedding", name: "Vietnamese Embedding", kind: "embedding" },
    { id: "FPT.AI-e5-large", name: "FPT AI e5 Large", kind: "embedding" },
    { id: "FPT.AI-gte-base", name: "FPT AI gte Base", kind: "embedding" },
  ],
  serviceKinds: ["llm", "embedding", "stt", "imageToText"],
  embeddingConfig: {
    baseUrl: "https://mkp-api.fptcloud.com/embeddings",
    authType: "apikey",
    authHeader: "bearer",
  },
  sttConfig: {
    baseUrl: "https://mkp-api.fptcloud.com/v1/audio/transcriptions",
    authType: "apikey",
    authHeader: "bearer",
    format: "openai",
  },
};
