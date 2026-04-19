import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
const DB_VERSION = 2;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('edgeai.db');
  await initSchema(db);
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS kb_chunks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name  TEXT    NOT NULL,
      source_type  TEXT    NOT NULL,
      content      TEXT    NOT NULL,
      embedding    TEXT    NOT NULL DEFAULT '[]',
      created_at   INTEGER NOT NULL,
      is_pinned    INTEGER NOT NULL DEFAULT 0,
      category     TEXT    NOT NULL DEFAULT 'general',
      importance   INTEGER NOT NULL DEFAULT 1,
      tags         TEXT    NOT NULL DEFAULT '[]',
      last_accessed INTEGER
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL DEFAULT 'New Chat',
      mode        TEXT    NOT NULL DEFAULT 'general',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      summary     TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role        TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      sources     TEXT    NOT NULL DEFAULT '[]',
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL,
      content     TEXT    NOT NULL DEFAULT '',
      audio_uri   TEXT,
      in_kb       INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT    NOT NULL,
      body            TEXT    NOT NULL DEFAULT '',
      scheduled_at    INTEGER NOT NULL,
      repeat_interval TEXT,
      is_active       INTEGER NOT NULL DEFAULT 1,
      is_completed    INTEGER NOT NULL DEFAULT 0,
      category        TEXT    NOT NULL DEFAULT 'general',
      created_at      INTEGER NOT NULL,
      notification_id TEXT
    );

    CREATE TABLE IF NOT EXISTS memory_facts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      content      TEXT    NOT NULL,
      category     TEXT    NOT NULL DEFAULT 'personal',
      confidence   REAL    NOT NULL DEFAULT 1.0,
      source_session INTEGER,
      embedding    TEXT    NOT NULL DEFAULT '[]',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session  ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_notes_date        ON notes(date);
    CREATE INDEX IF NOT EXISTS idx_kb_pinned         ON kb_chunks(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_kb_category       ON kb_chunks(category);
    CREATE INDEX IF NOT EXISTS idx_reminders_active  ON reminders(is_active, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_memory_category   ON memory_facts(category);
  `);

  // Run migrations for existing databases
  await runMigrations(database);
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Add columns if they don't exist (idempotent ALTER TABLE approach)
  const migrations = [
    `ALTER TABLE kb_chunks ADD COLUMN category TEXT NOT NULL DEFAULT 'general'`,
    `ALTER TABLE kb_chunks ADD COLUMN importance INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE kb_chunks ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE kb_chunks ADD COLUMN last_accessed INTEGER`,
    `ALTER TABLE chat_sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'general'`,
    `ALTER TABLE chat_sessions ADD COLUMN summary TEXT`,
  ];

  for (const sql of migrations) {
    try {
      await database.execAsync(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}
