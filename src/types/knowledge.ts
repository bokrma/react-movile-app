export type KBSourceType = 'file' | 'text' | 'profile' | 'note' | 'memory' | 'conversation_summary';
export type KBCategory = 'general' | 'health' | 'finance' | 'personal' | 'preference' | 'goal' | 'fitness' | 'medication' | 'mental_health' | 'budget' | 'expense' | 'investment';

export interface KBChunk {
  id: number;
  source_name: string;
  source_type: KBSourceType;
  content: string;
  embedding: number[];
  created_at: number;
  is_pinned: number; // 0 | 1
  category: KBCategory | string;
  importance: number; // 1-5
  tags: string[];
  last_accessed?: number;
}

export interface KBChunkInput {
  source_name: string;
  source_type: KBSourceType;
  content: string;
  is_pinned?: boolean;
  category?: string;
  importance?: number;
  tags?: string[];
}
