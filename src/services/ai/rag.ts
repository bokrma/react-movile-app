import { getPinnedChunks, getMemoryFacts, smartSearch } from '@/services/db/knowledge';
import { embedText, isEmbedModelLoaded } from './llm';
import { KBChunk } from '@/types/knowledge';
import { AssistantMode } from './scoring';

export interface RAGResult {
  contextBlock: string;
  sourceIds: number[];
  chunks: KBChunk[];
}

export async function buildRAGContext(
  userQuery: string,
  mode: AssistantMode = 'general',
): Promise<RAGResult> {
  const pinned = await getPinnedChunks();
  const memoryFacts = await getMemoryFacts();
  let searchResults: KBChunk[] = [];

  if (isEmbedModelLoaded()) {
    try {
      const queryEmbedding = await embedText(userQuery);
      if (queryEmbedding.length > 0) {
        const scored = await smartSearch(queryEmbedding, userQuery, mode, 6, 0.15);
        searchResults = scored.map((s) => s.chunk);
      }
    } catch {
      // embedding failed, proceed without semantic search
    }
  }

  // Build final context — priority order: pinned → memory facts → search results
  const pinnedIds = new Set(pinned.map((c) => c.id));
  const memoryIds = new Set(memoryFacts.map((c) => c.id));

  const uniqueSearch = searchResults.filter(
    (c) => !pinnedIds.has(c.id) && !memoryIds.has(c.id),
  );

  const allChunks = [...pinned, ...memoryFacts, ...uniqueSearch];

  if (allChunks.length === 0) {
    return { contextBlock: '', sourceIds: [], chunks: [] };
  }

  // Format by section
  const sections: string[] = [];

  if (pinned.length > 0) {
    sections.push(
      '### Profile\n' + pinned.map((c) => c.content).join('\n'),
    );
  }

  if (memoryFacts.length > 0) {
    const byCategory = groupBy(memoryFacts, (c) => c.category ?? 'personal');
    for (const [cat, facts] of Object.entries(byCategory)) {
      sections.push(
        `### ${capitalize(cat)} Facts\n` + facts.map((c) => `- ${c.content}`).join('\n'),
      );
    }
  }

  if (uniqueSearch.length > 0) {
    sections.push(
      '### Relevant Knowledge\n' +
        uniqueSearch.map((c) => `[${c.source_name}]\n${c.content}`).join('\n\n'),
    );
  }

  const contextBlock = sections.join('\n\n');

  return {
    contextBlock,
    sourceIds: allChunks.map((c) => c.id),
    chunks: allChunks,
  };
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
