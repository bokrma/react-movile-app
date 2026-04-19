export type KBSourceType = 'file' | 'text' | 'profile' | 'note';

export interface KBChunk {
  id: number;
  source_name: string;
  source_type: KBSourceType;
  content: string;
  embedding: number[];
  created_at: number;
  is_pinned: number; // 0 | 1
}

export interface KBChunkInput {
  source_name: string;
  source_type: KBSourceType;
  content: string;
  is_pinned?: boolean;
}
