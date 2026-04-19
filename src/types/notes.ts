export interface Note {
  id: number;
  date: string; // YYYY-MM-DD
  content: string;
  audio_uri?: string;
  in_kb: number; // 0 | 1
  created_at: number;
  updated_at: number;
}
