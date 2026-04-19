// Test chat session and message logic using mocked SQLite

jest.mock('@/services/db/database', () => ({
  getDB: jest.fn(),
}));

import { createSession, addMessage, getMessages } from '@/services/db/chats';
import { getDB } from '@/services/db/database';

const mockDb = {
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  execAsync: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getDB as jest.Mock).mockResolvedValue(mockDb);
});

describe('createSession', () => {
  it('creates a session with default title', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 42, changes: 1 });

    const session = await createSession();
    expect(session.id).toBe(42);
    expect(session.title).toBe('New Chat');
    expect(session.created_at).toBeLessThanOrEqual(Date.now());
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO chat_sessions'),
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('creates a session with custom title', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    const session = await createSession('Health Chat');
    expect(session.title).toBe('Health Chat');
  });
});

describe('addMessage', () => {
  it('inserts a user message and returns it', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 10, changes: 1 });

    const msg = await addMessage(1, 'user', 'Hello there');
    expect(msg.id).toBe(10);
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello there');
    expect(msg.session_id).toBe(1);
    expect(msg.sources).toEqual([]);
  });

  it('inserts an assistant message with sources', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 11, changes: 1 });

    const msg = await addMessage(1, 'assistant', 'Here is my answer', [3, 7]);
    expect(msg.role).toBe('assistant');
    expect(msg.sources).toEqual([3, 7]);
  });
});

describe('getMessages', () => {
  it('returns parsed messages for a session', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { id: 1, session_id: 5, role: 'user', content: 'Hi', sources: '[]', created_at: 1000 },
      { id: 2, session_id: 5, role: 'assistant', content: 'Hello', sources: '[1,2]', created_at: 2000 },
    ]);

    const msgs = await getMessages(5);
    expect(msgs.length).toBe(2);
    expect(msgs[0].sources).toEqual([]);
    expect(msgs[1].sources).toEqual([1, 2]);
  });

  it('returns empty array when no messages', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const msgs = await getMessages(99);
    expect(msgs).toEqual([]);
  });
});
