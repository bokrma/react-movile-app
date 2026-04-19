import { getDB } from './database';
import { KBChunk, KBChunkInput } from '@/types/knowledge';
import { hybridScore, tokenize, maximalMarginalRelevance, ScoredChunk, AssistantMode } from '@/services/ai/scoring';

export async function insertChunk(
  input: KBChunkInput,
  embedding: number[],
): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO kb_chunks
       (source_name, source_type, content, embedding, created_at, is_pinned, category, importance, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.source_name,
    input.source_type,
    input.content,
    JSON.stringify(embedding),
    Date.now(),
    input.is_pinned ? 1 : 0,
    input.category ?? 'general',
    input.importance ?? 1,
    JSON.stringify(input.tags ?? []),
  );
  return result.lastInsertRowId;
}

export async function getAllChunks(): Promise<KBChunk[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM kb_chunks ORDER BY is_pinned DESC, created_at DESC`,
  );
  return rows.map(deserializeChunk);
}

export async function getPinnedChunks(): Promise<KBChunk[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM kb_chunks WHERE is_pinned = 1 ORDER BY importance DESC`,
  );
  return rows.map(deserializeChunk);
}

export async function getMemoryFacts(): Promise<KBChunk[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM kb_chunks WHERE source_type = 'memory' ORDER BY importance DESC, created_at DESC LIMIT 30`,
  );
  return rows.map(deserializeChunk);
}

export async function smartSearch(
  queryEmbedding: number[],
  queryText: string,
  mode: AssistantMode = 'general',
  topK = 6,
  minScore = 0.15,
): Promise<ScoredChunk[]> {
  const db = await getDB();

  // Load non-pinned chunks. For large KBs, limit candidates to 500 most recent.
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM kb_chunks WHERE is_pinned = 0 ORDER BY created_at DESC LIMIT 500`,
  );
  const chunks = rows.map(deserializeChunk);

  const queryTokens = tokenize(queryText);

  const scored = chunks
    .map((chunk) => hybridScore(chunk, queryEmbedding, queryTokens, mode))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score);

  // MMR for diversity — avoid near-duplicate results
  const diverse = maximalMarginalRelevance(scored, topK, 0.65);

  // Update last_accessed timestamp
  if (diverse.length > 0) {
    const ids = diverse.map((s) => s.chunk.id).join(',');
    await db.runAsync(`UPDATE kb_chunks SET last_accessed = ? WHERE id IN (${ids})`, Date.now());
  }

  return diverse;
}

export async function deleteChunk(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM kb_chunks WHERE id = ?`, id);
}

export async function deleteChunksBySourceName(sourceName: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM kb_chunks WHERE source_name = ?`, sourceName);
}

export async function upsertMemoryFact(
  content: string,
  category: string,
  embedding: number[],
  existingChunks: KBChunk[],
): Promise<void> {
  const { cosineSimilarity } = await import('@/services/ai/scoring');
  const db = await getDB();

  // Deduplicate: if a very similar fact already exists (>0.92 similarity), update instead of insert
  const existing = existingChunks.filter(
    (c) => c.source_type === 'memory' && c.category === category,
  );

  let duplicateId: number | null = null;
  for (const c of existing) {
    if (c.embedding.length > 0 && cosineSimilarity(c.embedding, embedding) > 0.92) {
      duplicateId = c.id;
      break;
    }
  }

  const now = Date.now();
  if (duplicateId !== null) {
    await db.runAsync(
      `UPDATE kb_chunks SET content = ?, embedding = ?, updated_at = ? WHERE id = ?`,
      content,
      JSON.stringify(embedding),
      now,
      duplicateId,
    );
  } else {
    await db.runAsync(
      `INSERT INTO kb_chunks (source_name, source_type, content, embedding, created_at, is_pinned, category, importance, tags)
       VALUES ('Memory', 'memory', ?, ?, ?, 0, ?, 2, '[]')`,
      content,
      JSON.stringify(embedding),
      now,
      category,
    );
  }
}

export async function updateSessionSummary(sessionId: number, summary: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE chat_sessions SET summary = ? WHERE id = ?`, summary, sessionId);
}

function deserializeChunk(r: any): KBChunk {
  return {
    ...r,
    embedding: JSON.parse(r.embedding ?? '[]'),
    tags: JSON.parse(r.tags ?? '[]'),
  };
}
