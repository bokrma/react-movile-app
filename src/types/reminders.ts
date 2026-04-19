export type ReminderRepeat = 'once' | 'daily' | 'weekly' | 'monthly';
export type ReminderCategory = 'health' | 'finance' | 'general';

export interface Reminder {
  id: number;
  title: string;
  body: string;
  scheduled_at: number; // Unix ms
  repeat_interval: ReminderRepeat | null;
  is_active: number; // 0 | 1
  is_completed: number; // 0 | 1
  category: ReminderCategory;
  created_at: number;
  notification_id: string | null;
}

export interface ReminderInput {
  title: string;
  body?: string;
  scheduled_at: number;
  repeat_interval?: ReminderRepeat;
  category?: ReminderCategory;
}
