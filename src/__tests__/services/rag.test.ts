import { buildRAGContext } from '@/services/ai/rag';

// The db and llm modules are mocked via setup.ts

jest.mock('@/services/db/knowledge', () => ({
  getPinnedChunks: jest.fn().mockResolvedValue([
    {
      id: 1,
      source_name: 'Personal Profile',
      source_type: 'profile',
      content: 'My name is Alice. I work as a nurse.',
      embedding: Array(8).fill(0.9),
      created_at: Date.now(),
      is_pinned: 1,
      category: 'personal',
      importance: 3,
      tags: [],
    },
  ]),
  getMemoryFacts: jest.fn().mockResolvedValue([
    {
      id: 2,
      source_name: 'Memory',
      source_type: 'memory',
      content: 'User has hypertension.',
      embedding: Array(8).fill(0.8),
      created_at: Date.now() - 86_400_000,
      is_pinned: 0,
      category: 'health',
      importance: 2,
      tags: [],
    },
  ]),
  smartSearch: jest.fn().mockResolvedValue([
    {
      chunk: {
        id: 3,
        source_name: 'Health Notes',
        source_type: 'note',
        content: 'Blood pressure reading: 130/85',
        embedding: Array(8).fill(0.7),
        created_at: Date.now() - 3 * 86_400_000,
        is_pinned: 0,
        category: 'health',
        importance: 1,
        tags: [],
      },
      score: 0.82,
      semanticScore: 0.8,
      keywordScore: 0.5,
    },
  ]),
}));

jest.mock('@/services/ai/llm', () => ({
  embedText: jest.fn().mockResolvedValue(Array(8).fill(0.8)),
  isEmbedModelLoaded: jest.fn().mockReturnValue(true),
}));

describe('buildRAGContext', () => {
  it('returns contextBlock with all three sections', async () => {
    const result = await buildRAGContext('my blood pressure', 'health');
    expect(result.contextBlock).toContain('Profile');
    expect(result.contextBlock).toContain('Alice');
    expect(result.contextBlock).toContain('hypertension');
  });

  it('returns sourceIds for all included chunks', async () => {
    const result = await buildRAGContext('blood pressure', 'health');
    expect(result.sourceIds).toContain(1); // pinned
    expect(result.sourceIds).toContain(2); // memory
    expect(result.sourceIds).toContain(3); // search
  });

  it('returns empty context when no chunks', async () => {
    const { getPinnedChunks, getMemoryFacts, smartSearch } = require('@/services/db/knowledge');
    getPinnedChunks.mockResolvedValueOnce([]);
    getMemoryFacts.mockResolvedValueOnce([]);
    smartSearch.mockResolvedValueOnce([]);

    const result = await buildRAGContext('anything', 'general');
    expect(result.contextBlock).toBe('');
    expect(result.sourceIds).toEqual([]);
    expect(result.chunks).toEqual([]);
  });

  it('formats memory facts by category', async () => {
    const result = await buildRAGContext('my health', 'health');
    expect(result.contextBlock).toContain('Health Facts');
  });

  it('deduplicates pinned chunks from search results', async () => {
    const { smartSearch } = require('@/services/db/knowledge');
    // Return the same chunk as pinned in search results
    smartSearch.mockResolvedValueOnce([
      {
        chunk: {
          id: 1, // same as pinned
          source_type: 'profile',
          content: 'duplicate',
          embedding: [],
          category: 'personal',
          is_pinned: 1,
          source_name: 'Profile',
          created_at: Date.now(),
          importance: 1,
          tags: [],
        },
        score: 0.9,
        semanticScore: 0.9,
        keywordScore: 0,
      },
    ]);

    const result = await buildRAGContext('test', 'general');
    const idOccurrences = result.sourceIds.filter((id) => id === 1).length;
    expect(idOccurrences).toBe(1); // not duplicated
  });
});
