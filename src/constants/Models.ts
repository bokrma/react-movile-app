export interface ModelDef {
  id: string;
  name: string;
  description: string;
  sizeBytes: number;
  downloadUrl: string;
  filename: string;
  contextLength: number;
  /** Recommended for health/finance assistant modes */
  recommendedForAssistant?: boolean;
}

export const AVAILABLE_MODELS: ModelDef[] = [
  // ── Gemma 4 (Google, 2026) ─────────────────────────────────────────────
  // To enable: verify the bartowski GGUF URL on HuggingFace and uncomment.
  // {
  //   id: 'gemma-4-4b',
  //   name: 'Gemma 4 4B ⭐',
  //   description: '~2.5 GB · Latest Google · Best quality for assistant tasks',
  //   sizeBytes: 2_500_000_000,
  //   downloadUrl:
  //     'https://huggingface.co/bartowski/gemma-4-4b-it-GGUF/resolve/main/gemma-4-4b-it-Q4_K_M.gguf',
  //   filename: 'gemma-4-4b-q4.gguf',
  //   contextLength: 32768,
  //   recommendedForAssistant: true,
  // },

  // ── Gemma 3 4B — best current choice for health/finance/general ────────
  {
    id: 'gemma-3-4b',
    name: 'Gemma 3 4B ⭐ Recommended',
    description: '~2.5 GB · Best balance of quality & speed · Health & Finance',
    sizeBytes: 2_500_000_000,
    downloadUrl:
      'https://huggingface.co/bartowski/google_gemma-3-4b-it-GGUF/resolve/main/google_gemma-3-4b-it-Q4_K_M.gguf',
    filename: 'gemma-3-4b-q4.gguf',
    contextLength: 131072,
    recommendedForAssistant: true,
  },

  // ── Gemma 3 1B — fast, small, good for quick replies ──────────────────
  {
    id: 'gemma-3-1b',
    name: 'Gemma 3 1B',
    description: '~800 MB · Fastest · Good for simple Q&A',
    sizeBytes: 800_000_000,
    downloadUrl:
      'https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF/resolve/main/google_gemma-3-1b-it-Q4_K_M.gguf',
    filename: 'gemma-3-1b-q4.gguf',
    contextLength: 8192,
  },

  // ── Llama 3.2 3B — Meta, excellent instruction following ──────────────
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    description: '~2 GB · Meta · Excellent instruction following',
    sizeBytes: 2_000_000_000,
    downloadUrl:
      'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'llama-3.2-3b-q4.gguf',
    contextLength: 8192,
  },

  // ── Phi-4 Mini — Microsoft, best math/finance reasoning at this size ──
  {
    id: 'phi-4-mini',
    name: 'Phi 4 Mini',
    description: '~2.5 GB · Microsoft · Best reasoning & finance analysis',
    sizeBytes: 2_500_000_000,
    downloadUrl:
      'https://huggingface.co/bartowski/phi-4-mini-instruct-GGUF/resolve/main/phi-4-mini-instruct-Q4_K_M.gguf',
    filename: 'phi-4-mini-q4.gguf',
    contextLength: 16384,
    recommendedForAssistant: true,
  },
];

export const EMBEDDING_MODEL: ModelDef = {
  id: 'nomic-embed',
  name: 'Nomic Embed Text v1.5',
  description: '~90 MB · Required for smart knowledge base search',
  sizeBytes: 90_000_000,
  downloadUrl:
    'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf',
  filename: 'nomic-embed-v1.5-q4.gguf',
  contextLength: 8192,
};

// Default to 4B — best quality for health/finance assistant tasks
export const DEFAULT_MODEL_ID = 'gemma-3-4b';
