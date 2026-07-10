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
    { id: "DeepSeek-V4-Flash", name: "DeepSeek V4 Flash" },
    { id: "Qwen3.6-27B", name: "Qwen 3.6 27B" },
    { id: "GLM-5.1", name: "GLM 5.1" },
    { id: "Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct" },
    { id: "SaoLa3.1-medium", name: "SaoLa 3.1 Medium" },
    { id: "gemma-3-27b-it", name: "Gemma 3 27B" },
    { id: "gemma-4-26B-A4B-it", name: "Gemma 4 26B (A4B)" },
    { id: "gemma-4-31B-it", name: "Gemma 4 31B" },
    { id: "gpt-oss-120b", name: "GPT OSS 120B" },
    { id: "gpt-oss-20b", name: "GPT OSS 20B" },
    // Vision
    { id: "Qwen2.5-VL-7B-Instruct", name: "Qwen 2.5 VL 7B Instruct", kind: "imageToText" },
    // STT (Speech-to-Text)
    { id: "FPT.AI-whisper-large-v3-turbo", name: "FPT AI Whisper Large v3 Turbo", kind: "stt" },
    { id: "FPT.AI-whisper-medium", name: "FPT AI Whisper Medium", kind: "stt" },
    { id: "whisper-large-v3-turbo", name: "Whisper Large v3 Turbo", kind: "stt" },
    // TTS (Text-to-Speech)
    { id: "FPT.AI-VITs", name: "FPT AI VITs", kind: "tts" },
    // Embedding & Reranker
    { id: "Vietnamese_Embedding", name: "Vietnamese Embedding", kind: "embedding" },
    { id: "bge-reranker-v2-m3", name: "BGE Reranker v2 M3", kind: "reranker" },
    { id: "multilingual-e5-large", name: "Multilingual E5 Large", kind: "embedding" },
  ],
  serviceKinds: ["llm", "embedding", "stt", "tts", "imageToText", "reranker"],
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
