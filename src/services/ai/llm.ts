import { initLlama, LlamaContext, type NativeCompletionResult } from 'llama.rn';
import * as FileSystem from 'expo-file-system';

export const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

let chatContext: LlamaContext | null = null;
let embedContext: LlamaContext | null = null;
let currentChatPath: string | null = null;

export async function ensureModelsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }
}

export async function loadChatModel(modelFilename: string): Promise<void> {
  const path = `${MODELS_DIR}${modelFilename}`;
  if (currentChatPath === path && chatContext) return;

  if (chatContext) {
    await chatContext.release();
    chatContext = null;
  }

  chatContext = await initLlama({
    model: path,
    use_mlock: true,
    n_ctx: 4096,
    n_gpu_layers: 99, // Metal GPU on iOS
  });
  currentChatPath = path;
}

export async function loadEmbedModel(modelFilename: string): Promise<void> {
  const path = `${MODELS_DIR}${modelFilename}`;
  if (embedContext) return;

  embedContext = await initLlama({
    model: path,
    embedding: true,
    n_ctx: 512,
    n_gpu_layers: 0,
  });
}

export async function embedText(text: string): Promise<number[]> {
  if (!embedContext) return [];
  const result = await embedContext.embedding(text);
  return result.embedding;
}

export async function generateCompletion(
  messages: { role: string; content: string }[],
  knowledgeContext: string,
  onToken?: (token: string) => void,
): Promise<string> {
  if (!chatContext) throw new Error('Chat model not loaded');

  const systemContent = knowledgeContext
    ? `You are a personal AI assistant. You have access to the user's knowledge base — use it to give personalized, accurate answers. You can use these tools by including them in your response:\n- [TOOL:web_search(query)] to search the internet\n- [TOOL:fetch_url(url)] to read a web page\n\n## Knowledge Base\n${knowledgeContext}`
    : `You are a personal AI assistant. You can use these tools by including them in your response:\n- [TOOL:web_search(query)] to search the internet\n- [TOOL:fetch_url(url)] to read a web page`;

  const fullMessages = [
    { role: 'system', content: systemContent },
    ...messages,
  ];

  const result: NativeCompletionResult = await chatContext.completion(
    {
      messages: fullMessages,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
      n_predict: 1024,
    },
    onToken ? (data) => onToken(data.token) : undefined,
  );

  return result.text;
}

export async function releaseChatModel(): Promise<void> {
  if (chatContext) {
    await chatContext.release();
    chatContext = null;
    currentChatPath = null;
  }
}

export function isChatModelLoaded(): boolean {
  return chatContext !== null;
}

export function isEmbedModelLoaded(): boolean {
  return embedContext !== null;
}
