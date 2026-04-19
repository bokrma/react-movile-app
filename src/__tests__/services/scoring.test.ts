import {
  cosineSimilarity, keywordOverlap, recencyScore,
  sourceTypePriority, categoryAffinity, hybridScore,
  tokenize, maximalMarginalRelevance, ScoredChunk,
} from '@/services/ai/scoring';
import { KBChunk } from '@/types/knowledge';

function makeChunk(overrides: Partial<KBChunk> = {}): KBChunk {
  return {
    id: 1,
    source_name: 'Test',
    source_type: 'text',
    content: 'sample content about health and medications',
    embedding: Array(8).fill(0.5),
    created_at: Date.now() - 86_400_000, // 1 day ago
    is_pinned: 0,
    category: 'general',
    importance: 1,
    tags: [],
    ...overrides,
  };
}

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    const v = [1, 0, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });

  it('returns high score for similar vectors', () => {
    const a = [0.9, 0.1, 0.2];
    const b = [0.8, 0.15, 0.25];
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.99);
  });
});

describe('keywordOverlap', () => {
  it('returns 1.0 when all tokens match', () => {
    expect(keywordOverlap('my blood pressure medication daily', ['blood', 'pressure', 'medication'])).toBeCloseTo(1.0);
  });

  it('returns 0.5 when half tokens match', () => {
    expect(keywordOverlap('blood sugar levels', ['blood', 'medication'])).toBeCloseTo(0.5);
  });

  it('returns 0 for no match', () => {
    expect(keywordOverlap('sunny weather today', ['medication', 'blood'])).toBe(0);
  });

  it('returns 0 for empty tokens', () => {
    expect(keywordOverlap('anything here', [])).toBe(0);
  });

  it('ignores short tokens (≤2 chars)', () => {
    expect(keywordOverlap('I am a doctor', ['i', 'am', 'a'])).toBe(0);
  });
});

describe('recencyScore', () => {
  it('returns close to 1.0 for very recent content', () => {
    expect(recencyScore(Date.now() - 1000)).toBeGreaterThan(0.99);
  });

  it('returns less than 0.5 for content older than 180 days', () => {
    expect(recencyScore(Date.now() - 181 * 86_400_000)).toBeLessThan(0.5);
  });

  it('returns positive value for old content', () => {
    expect(recencyScore(Date.now() - 365 * 86_400_000)).toBeGreaterThan(0);
  });
});

describe('sourceTypePriority', () => {
  it('profile has highest priority', () => {
    expect(sourceTypePriority('profile')).toBe(1.0);
  });

  it('memory has second priority', () => {
    expect(sourceTypePriority('memory')).toBe(0.9);
  });

  it('file has lower priority than text', () => {
    expect(sourceTypePriority('file')).toBeLessThan(sourceTypePriority('text'));
  });

  it('returns 0.5 for unknown type', () => {
    expect(sourceTypePriority('unknown_type')).toBe(0.5);
  });
});

describe('categoryAffinity', () => {
  it('health category has high affinity for health mode', () => {
    expect(categoryAffinity('health', 'health')).toBe(1.0);
  });

  it('finance category has low affinity for health mode', () => {
    expect(categoryAffinity('finance', 'health')).toBe(0.3);
  });

  it('finance category has high affinity for finance mode', () => {
    expect(categoryAffinity('finance', 'finance')).toBe(1.0);
  });

  it('personal has affinity for all modes', () => {
    expect(categoryAffinity('personal', 'general')).toBe(1.0);
    expect(categoryAffinity('personal', 'health')).toBe(1.0);
    expect(categoryAffinity('personal', 'finance')).toBe(1.0);
  });
});

describe('tokenize', () => {
  it('splits text into lowercase tokens', () => {
    const tokens = tokenize('Hello World! How are you?');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens).toContain('how');
    expect(tokens).toContain('you');
  });

  it('filters tokens shorter than 3 chars', () => {
    const tokens = tokenize('I am at OK');
    expect(tokens.every((t) => t.length > 2)).toBe(true);
  });

  it('handles empty string', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('hybridScore', () => {
  it('profile chunk with matching keywords scores high', () => {
    const chunk = makeChunk({
      source_type: 'profile',
      category: 'personal',
      content: 'My blood pressure is 120/80',
      embedding: Array(8).fill(0.9),
    });
    const queryEmbedding = Array(8).fill(0.9);
    const result = hybridScore(chunk, queryEmbedding, ['blood', 'pressure'], 'health');
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.semanticScore).toBeCloseTo(1.0);
  });

  it('old irrelevant chunk scores low', () => {
    const chunk = makeChunk({
      source_type: 'file',
      category: 'general',
      content: 'random document about cooking recipes',
      embedding: Array(8).fill(0),
      created_at: Date.now() - 500 * 86_400_000,
    });
    const queryEmbedding = Array(8).fill(0.9);
    const result = hybridScore(chunk, queryEmbedding, ['blood', 'pressure'], 'health');
    expect(result.score).toBeLessThan(0.3);
  });

  it('importance boost works', () => {
    const base = makeChunk({ importance: 1, embedding: Array(8).fill(0.5) });
    const boosted = makeChunk({ importance: 5, embedding: Array(8).fill(0.5) });
    const q = Array(8).fill(0.5);
    expect(hybridScore(boosted, q, [], 'general').score).toBeGreaterThan(hybridScore(base, q, [], 'general').score);
  });
});

describe('maximalMarginalRelevance', () => {
  it('selects topK items', () => {
    const scored: ScoredChunk[] = Array.from({ length: 10 }, (_, i) => ({
      chunk: makeChunk({ id: i, embedding: Array(8).fill(i * 0.1) }),
      score: 1 - i * 0.05,
      semanticScore: 1 - i * 0.05,
      keywordScore: 0,
    }));
    const result = maximalMarginalRelevance(scored, 5);
    expect(result.length).toBe(5);
  });

  it('returns all items when fewer than topK', () => {
    const scored: ScoredChunk[] = [
      { chunk: makeChunk({ id: 1 }), score: 0.9, semanticScore: 0.9, keywordScore: 0 },
      { chunk: makeChunk({ id: 2 }), score: 0.8, semanticScore: 0.8, keywordScore: 0 },
    ];
    const result = maximalMarginalRelevance(scored, 5);
    expect(result.length).toBe(2);
  });

  it('avoids selecting near-duplicate chunks', () => {
    // All chunks have same embedding — MMR should still pick distinct ones
    const identical = Array.from({ length: 5 }, (_, i) => ({
      chunk: makeChunk({ id: i, embedding: Array(8).fill(1) }),
      score: 1 - i * 0.01,
      semanticScore: 1,
      keywordScore: 0,
    }));
    const result = maximalMarginalRelevance(identical, 3);
    const ids = result.map((r) => r.chunk.id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
  });
});
