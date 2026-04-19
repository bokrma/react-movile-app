import { getDB } from './database';
import { Reminder, ReminderInput } from '@/types/reminders';

export type { Reminder };

export async function createReminder(input: ReminderInput): Promise<Reminder> {
  const db = await getDB();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO reminders
       (title, body, scheduled_at, repeat_interval, is_active, is_completed, category, created_at)
     VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
    input.title,
    input.body ?? '',
    input.scheduled_at,
    input.repeat_interval ?? null,
    input.category ?? 'general',
    now,
  );
  return {
    id: result.lastInsertRowId,
    title: input.title,
    body: input.body ?? '',
    scheduled_at: input.scheduled_at,
    repeat_interval: input.repeat_interval ?? null,
    is_active: 1,
    is_completed: 0,
    category: input.category ?? 'general',
    created_at: now,
    notification_id: null,
  };
}

export async function setNotificationId(id: number, notificationId: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE reminders SET notification_id = ? WHERE id = ?`, notificationId, id);
}

export async function listReminders(includeCompleted = false): Promise<Reminder[]> {
  const db = await getDB();
  const whereClause = includeCompleted ? '' : 'WHERE is_completed = 0';
  return db.getAllAsync<Reminder>(
    `SELECT * FROM reminders ${whereClause} ORDER BY scheduled_at ASC`,
  );
}

export async function listUpcomingReminders(withinMs = 86_400_000): Promise<Reminder[]> {
  const db = await getDB();
  const now = Date.now();
  return db.getAllAsync<Reminder>(
    `SELECT * FROM reminders
     WHERE is_active = 1 AND is_completed = 0 AND scheduled_at BETWEEN ? AND ?
     ORDER BY scheduled_at ASC`,
    now,
    now + withinMs,
  );
}

export async function listOverdueReminders(): Promise<Reminder[]> {
  const db = await getDB();
  return db.getAllAsync<Reminder>(
    `SELECT * FROM reminders
     WHERE is_active = 1 AND is_completed = 0 AND scheduled_at < ?
     ORDER BY scheduled_at ASC`,
    Date.now(),
  );
}

export async function completeReminder(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE reminders SET is_completed = 1, is_active = 0 WHERE id = ?`, id);
}

export async function deleteReminder(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM reminders WHERE id = ?`, id);
}

export async function rescheduleRepeating(reminder: Reminder): Promise<Reminder | null> {
  if (!reminder.repeat_interval) return null;

  const delays: Record<string, number> = {
    daily: 86_400_000,
    weekly: 7 * 86_400_000,
    monthly: 30 * 86_400_000,
  };

  const delay = delays[reminder.repeat_interval];
  if (!delay) return null;

  const nextTime = reminder.scheduled_at + delay;
  const db = await getDB();
  await db.runAsync(
    `UPDATE reminders SET scheduled_at = ?, is_completed = 0, is_active = 1, notification_id = NULL WHERE id = ?`,
    nextTime,
    reminder.id,
  );

  return { ...reminder, scheduled_at: nextTime, is_completed: 0, is_active: 1, notification_id: null };
}

// Parse a natural-language reminder string from AI tool output
// Format: set_reminder(title, ISO datetime or relative, repeat?)
export function parseReminderToolCall(toolArg: string): Partial<ReminderInput> | null {
  try {
    // Try to parse as JSON first: {"title":"...", "at":"...", "repeat":"..."}
    const json = JSON.parse(toolArg);
    if (json.title) {
      return {
        title: json.title,
        body: json.body ?? json.description ?? '',
        scheduled_at: parseDatetime(json.at ?? json.time ?? json.datetime ?? ''),
        repeat_interval: json.repeat ?? undefined,
        category: json.category ?? 'general',
      };
    }
  } catch {
    // Not JSON, try comma-separated: "title, datetime, repeat"
  }

  const parts = toolArg.split(',').map((s) => s.trim());
  if (parts.length < 2) return null;

  const scheduled_at = parseDatetime(parts[1]);
  if (!scheduled_at) return null;

  return {
    title: parts[0],
    scheduled_at,
    repeat_interval: (parts[2] as any) ?? undefined,
    category: 'general',
  };
}

export function parseDatetime(input: string): number {
  if (!input) return Date.now() + 3_600_000; // default 1 hour from now

  // Try ISO 8601
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.getTime();

  const now = Date.now();
  const lower = input.toLowerCase().trim();

  // Relative: "in X minutes/hours/days"
  const relMatch = lower.match(/in\s+(\d+)\s+(minute|hour|day|week)s?/);
  if (relMatch) {
    const n = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    const ms = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 }[unit] ?? 0;
    return now + n * ms;
  }

  // "tomorrow at HH:MM"
  if (lower.includes('tomorrow')) {
    const timeMatch = lower.match(/(\d{1,2}):(\d{2})/);
    const tomorrow = new Date(now + 86_400_000);
    tomorrow.setHours(timeMatch ? parseInt(timeMatch[1]) : 9);
    tomorrow.setMinutes(timeMatch ? parseInt(timeMatch[2]) : 0);
    tomorrow.setSeconds(0, 0);
    return tomorrow.getTime();
  }

  // "today at HH:MM"
  if (lower.includes('today')) {
    const timeMatch = lower.match(/(\d{1,2}):(\d{2})/);
    const today = new Date(now);
    today.setHours(timeMatch ? parseInt(timeMatch[1]) : 9);
    today.setMinutes(timeMatch ? parseInt(timeMatch[2]) : 0);
    today.setSeconds(0, 0);
    const t = today.getTime();
    return t > now ? t : t + 86_400_000;
  }

  return now + 3_600_000; // fallback: 1 hour from now
}
