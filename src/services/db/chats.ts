import { getDB } from './database';
import { ChatSession, ChatMessage } from '@/types/chat';

export async function createSession(title = 'New Chat'): Promise<ChatSession> {
  const db = await getDB();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO chat_sessions (title, created_at, updated_at) VALUES (?, ?, ?)`,
    title,
    now,
    now,
  );
  return { id: result.lastInsertRowId, title, created_at: now, updated_at: now };
}

export async function listSessions(): Promise<ChatSession[]> {
  const db = await getDB();
  return db.getAllAsync<ChatSession>(
    `SELECT s.id, s.title, s.created_at, s.updated_at,
            (SELECT content FROM chat_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message
     FROM chat_sessions s ORDER BY s.updated_at DESC`,
  );
}

export async function updateSessionTitle(id: number, title: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?`,
    title,
    Date.now(),
    id,
  );
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM chat_sessions WHERE id = ?`, id);
}

export async function getMessages(sessionId: number): Promise<ChatMessage[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, session_id, role, content, sources, created_at
     FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
    sessionId,
  );
  return rows.map((r) => ({ ...r, sources: JSON.parse(r.sources || '[]') }));
}

export async function addMessage(
  sessionId: number,
  role: 'user' | 'assistant',
  content: string,
  sources: number[] = [],
): Promise<ChatMessage> {
  const db = await getDB();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO chat_messages (session_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?)`,
    sessionId,
    role,
    content,
    JSON.stringify(sources),
    now,
  );
  await db.runAsync(
    `UPDATE chat_sessions SET updated_at = ? WHERE id = ?`,
    now,
    sessionId,
  );
  return { id: result.lastInsertRowId, session_id: sessionId, role, content, sources, created_at: now };
}

export async function clearMessages(sessionId: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM chat_messages WHERE session_id = ?`, sessionId);
}
