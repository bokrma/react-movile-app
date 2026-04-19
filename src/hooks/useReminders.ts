import { useState, useCallback } from 'react';
import { Reminder, ReminderInput } from '@/types/reminders';
import {
  createReminder, listReminders, listUpcomingReminders,
  completeReminder, deleteReminder,
} from '@/services/db/reminders';
import {
  scheduleReminder as scheduleNotif, cancelReminderNotification,
} from '@/services/notifications/scheduler';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    const all = await listReminders(false);
    setReminders(all);
  }, []);

  const upcoming24h = useCallback(async (): Promise<Reminder[]> => {
    return listUpcomingReminders(86_400_000);
  }, []);

  const add = useCallback(async (input: ReminderInput): Promise<Reminder> => {
    setIsLoading(true);
    const reminder = await createReminder(input);
    await scheduleNotif(reminder).catch(() => {});
    await load();
    setIsLoading(false);
    return reminder;
  }, [load]);

  const complete = useCallback(async (id: number) => {
    const r = reminders.find((x) => x.id === id);
    await completeReminder(id);
    if (r?.notification_id) await cancelReminderNotification(r.notification_id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, [reminders]);

  const remove = useCallback(async (id: number) => {
    const r = reminders.find((x) => x.id === id);
    await deleteReminder(id);
    if (r?.notification_id) await cancelReminderNotification(r.notification_id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, [reminders]);

  return { reminders, isLoading, load, add, complete, remove, upcoming24h };
}
