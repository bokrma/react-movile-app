export interface ModelDef {
  id: string;
  name: string;
  description: string;
  sizeBytes: number;
  downloadUrl: string;
  filename: string;
  contextLength: number;
}

export const AVAILABLE_MODELS: ModelDef[] = [
  {
    id: 'gemma-3-1b',
    name: 'Gemma 3 1B',
    description: '~800 MB · Fastest · Great for simple tasks',
    sizeBytes: 800_000_000,
    downloadUrl:
      'https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF/resolve/main/google_gemma-3-1b-it-Q4_K_M.gguf',
    filename: 'gemma-3-1b-q4.gguf',
    contextLength: 8192,
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    description: '~2 GB · Balanced quality & speed',
    sizeBytes: 2_000_000_000,
    downloadUrl:
      'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'llama-3.2-3b-q4.gguf',
    contextLength: 8192,
  },
  {
    id: 'phi-4-mini',
    name: 'Phi 4 Mini',
    description: '~2.5 GB · Microsoft · Excellent reasoning',
    sizeBytes: 2_500_000_000,
    downloadUrl:
      'https://huggingface.co/bartowski/phi-4-mini-instruct-GGUF/resolve/main/phi-4-mini-instruct-Q4_K_M.gguf',
    filename: 'phi-4-mini-q4.gguf',
    contextLength: 16384,
  },
];

export const EMBEDDING_MODEL: ModelDef = {
  id: 'nomic-embed',
  name: 'Nomic Embed',
  description: '~90 MB · For knowledge base search',
  sizeBytes: 90_000_000,
  downloadUrl:
    'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf',
  filename: 'nomic-embed-v1.5-q4.gguf',
  contextLength: 8192,
};

export const DEFAULT_MODEL_ID = 'gemma-3-1b';
