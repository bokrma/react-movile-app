export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: number;
  session_id: number;
  role: MessageRole;
  content: string;
  sources: number[]; // kb_chunk ids used for this response
  created_at: number;
}

export interface ChatSession {
  id: number;
  title: string;
  last_message?: string;
  created_at: number;
  updated_at: number;
}
