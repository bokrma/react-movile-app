import { getDB } from './database';
import { KBChunk, KBChunkInput } from '@/types/knowledge';

function cosineSimilarity(a: number[], b: number[]): number {
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

export async function insertChunk(
  input: KBChunkInput,
  embedding: number[],
): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO kb_chunks (source_name, source_type, content, embedding, created_at, is_pinned)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.source_name,
    input.source_type,
    input.content,
    JSON.stringify(embedding),
    Date.now(),
    input.is_pinned ? 1 : 0,
  );
  return result.lastInsertRowId;
}

export async function getAllChunks(): Promise<KBChunk[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, source_name, source_type, content, embedding, created_at, is_pinned
     FROM kb_chunks ORDER BY created_at DESC`,
  );
  return rows.map((r) => ({ ...r, embedding: JSON.parse(r.embedding) }));
}

export async function getPinnedChunks(): Promise<KBChunk[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, source_name, source_type, content, embedding, created_at, is_pinned
     FROM kb_chunks WHERE is_pinned = 1`,
  );
  return rows.map((r) => ({ ...r, embedding: JSON.parse(r.embedding) }));
}

export async function searchChunks(
  queryEmbedding: number[],
  topK = 5,
): Promise<KBChunk[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, source_name, source_type, content, embedding, created_at, is_pinned
     FROM kb_chunks WHERE is_pinned = 0`,
  );
  const scored = rows.map((r) => {
    const emb: number[] = JSON.parse(r.embedding);
    return { ...r, embedding: emb, score: cosineSimilarity(queryEmbedding, emb) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function deleteChunk(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM kb_chunks WHERE id = ?`, id);
}

export async function deleteChunksBySourceName(sourceName: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM kb_chunks WHERE source_name = ?`, sourceName);
}

export async function updateChunkPinned(id: number, pinned: boolean): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE kb_chunks SET is_pinned = ? WHERE id = ?`, pinned ? 1 : 0, id);
}
