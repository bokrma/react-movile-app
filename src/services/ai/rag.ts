import { getPinnedChunks, searchChunks } from '@/services/db/knowledge';
import { embedText, isEmbedModelLoaded } from './llm';
import { KBChunk } from '@/types/knowledge';

export interface RAGResult {
  contextBlock: string;
  sourceIds: number[];
  chunks: KBChunk[];
}

export async function buildRAGContext(userQuery: string): Promise<RAGResult> {
  const pinned = await getPinnedChunks();
  let searchResults: KBChunk[] = [];

  if (isEmbedModelLoaded()) {
    try {
      const queryEmbedding = await embedText(userQuery);
      if (queryEmbedding.length > 0) {
        searchResults = await searchChunks(queryEmbedding, 5);
        // filter results with low similarity
        searchResults = searchResults.filter((_, i) => i < 3);
      }
    } catch {
      // embedding failed, proceed without semantic search
    }
  }

  // deduplicate: don't show pinned chunks also in search results
  const pinnedIds = new Set(pinned.map((c) => c.id));
  const uniqueSearch = searchResults.filter((c) => !pinnedIds.has(c.id));
  const allChunks = [...pinned, ...uniqueSearch];

  if (allChunks.length === 0) {
    return { contextBlock: '', sourceIds: [], chunks: [] };
  }

  const contextBlock = allChunks
    .map((c) => `[${c.source_name}]\n${c.content}`)
    .join('\n\n---\n\n');

  return {
    contextBlock,
    sourceIds: allChunks.map((c) => c.id),
    chunks: allChunks,
  };
}
