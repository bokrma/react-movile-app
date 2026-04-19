import { getDB } from './database';
import { Note } from '@/types/notes';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayNote(): Promise<Note | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Note>(
    `SELECT * FROM notes WHERE date = ? ORDER BY created_at DESC LIMIT 1`,
    today(),
  );
  return row ?? null;
}

export async function createNote(date?: string): Promise<Note> {
  const db = await getDB();
  const now = Date.now();
  const noteDate = date ?? today();
  const result = await db.runAsync(
    `INSERT INTO notes (date, content, in_kb, created_at, updated_at) VALUES (?, '', 0, ?, ?)`,
    noteDate,
    now,
    now,
  );
  return { id: result.lastInsertRowId, date: noteDate, content: '', in_kb: 0, created_at: now, updated_at: now };
}

export async function updateNote(id: number, content: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE notes SET content = ?, updated_at = ? WHERE id = ?`,
    content,
    Date.now(),
    id,
  );
}

export async function setNoteAudioUri(id: number, audioUri: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE notes SET audio_uri = ? WHERE id = ?`, audioUri, id);
}

export async function setNoteInKB(id: number, inKb: boolean): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE notes SET in_kb = ? WHERE id = ?`, inKb ? 1 : 0, id);
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDB();
  return db.getAllAsync<Note>(`SELECT * FROM notes ORDER BY date DESC, created_at DESC`);
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM notes WHERE id = ?`, id);
}
