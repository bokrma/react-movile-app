import { KBChunk } from '@/types/knowledge';

export type AssistantMode = 'general' | 'health' | 'finance';

const SOURCE_TYPE_PRIORITY: Record<string, number> = {
  profile: 1.0,
  memory: 0.9,
  conversation_summary: 0.85,
  note: 0.7,
  text: 0.6,
  file: 0.5,
};

const CATEGORY_MODE_AFFINITY: Record<AssistantMode, string[]> = {
  health: ['health', 'medication', 'fitness', 'mental_health', 'personal'],
  finance: ['finance', 'budget', 'expense', 'investment', 'personal'],
  general: ['personal', 'general', 'preference'],
};

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function keywordOverlap(text: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const lower = text.toLowerCase();
  const hits = queryTokens.filter((t) => t.length > 2 && lower.includes(t)).length;
  return hits / queryTokens.length;
}

export function recencyScore(createdAt: number): number {
  const ageMs = Date.now() - createdAt;
  const ageDays = ageMs / 86_400_000;
  // Exponential decay: score = e^(-age/180), so 6-month-old data still scores ~0.37
  return Math.exp(-ageDays / 180);
}

export function sourceTypePriority(sourceType: string): number {
  return SOURCE_TYPE_PRIORITY[sourceType] ?? 0.5;
}

export function categoryAffinity(category: string, mode: AssistantMode): number {
  const affinities = CATEGORY_MODE_AFFINITY[mode] ?? [];
  return affinities.includes(category) ? 1.0 : 0.3;
}

export interface ScoredChunk {
  chunk: KBChunk;
  score: number;
  semanticScore: number;
  keywordScore: number;
}

export function hybridScore(
  chunk: KBChunk,
  queryEmbedding: number[],
  queryTokens: string[],
  mode: AssistantMode = 'general',
): ScoredChunk {
  const semanticScore = cosineSimilarity(chunk.embedding, queryEmbedding);
  const keywordScore = keywordOverlap(chunk.content, queryTokens);
  const recency = recencyScore(chunk.created_at);
  const typePriority = sourceTypePriority(chunk.source_type);
  const catAffinity = categoryAffinity(chunk.category ?? 'general', mode);
  const importanceBoost = ((chunk.importance ?? 1) - 1) * 0.05; // 0..0.2 bonus

  const score =
    0.55 * semanticScore +
    0.20 * keywordScore +
    0.10 * recency +
    0.08 * typePriority +
    0.05 * catAffinity +
    importanceBoost;

  return { chunk, score, semanticScore, keywordScore };
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function maximalMarginalRelevance(
  scored: ScoredChunk[],
  topK: number,
  lambda = 0.6,
): ScoredChunk[] {
  if (scored.length <= topK) return scored;

  const selected: ScoredChunk[] = [];
  const candidates = [...scored];

  while (selected.length < topK && candidates.length > 0) {
    let bestIdx = 0;
    let bestMMR = -Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const relevance = candidates[i].score;

      let maxSim = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(candidates[i].chunk.embedding, sel.chunk.embedding);
        if (sim > maxSim) maxSim = sim;
      }

      const mmr = lambda * relevance - (1 - lambda) * maxSim;
      if (mmr > bestMMR) {
        bestMMR = mmr;
        bestIdx = i;
      }
    }

    selected.push(candidates[bestIdx]);
    candidates.splice(bestIdx, 1);
  }

  return selected;
}
