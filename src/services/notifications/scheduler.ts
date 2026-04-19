import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import {
  listOverdueReminders, listUpcomingReminders, completeReminder,
  rescheduleRepeating, setNotificationId, Reminder,
} from '@/services/db/reminders';

export const REMINDER_CHECK_TASK = 'EDGE_AI_REMINDER_CHECK';

// ── Notification Handler ──────────────────────────────────────────────────

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }
  return granted;
}

// ── Schedule a single reminder ────────────────────────────────────────────

export async function scheduleReminder(reminder: {
  id: number;
  title: string;
  body: string;
  scheduled_at: number;
  category: string;
}): Promise<string> {
  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.body || `Reminder: ${reminder.title}`,
      data: { reminderId: reminder.id, category: reminder.category },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminder.scheduled_at),
    },
  });

  await setNotificationId(reminder.id, notifId);
  return notifId;
}

export async function cancelReminderNotification(notificationId: string | null): Promise<void> {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
  }
}

// ── Background task: check for overdue reminders ──────────────────────────

TaskManager.defineTask(REMINDER_CHECK_TASK, async () => {
  try {
    const overdue = await listOverdueReminders();
    for (const r of overdue) {
      // Fire an immediate notification for each overdue reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${r.title}`,
          body: r.body || 'You have an overdue reminder.',
          data: { reminderId: r.id },
          sound: 'default',
        },
        trigger: null, // immediately
      });

      if (r.repeat_interval && r.repeat_interval !== 'once') {
        await rescheduleRepeating(r);
      } else {
        await completeReminder(r.id);
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(REMINDER_CHECK_TASK);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(REMINDER_CHECK_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

// ── Reschedule all active reminders on app launch ─────────────────────────

export async function syncAllReminders(): Promise<void> {
  const upcoming = await listUpcomingReminders(7 * 86_400_000); // next 7 days
  for (const r of upcoming) {
    if (!r.notification_id) {
      await scheduleReminder(r).catch(() => {});
    }
  }
}
