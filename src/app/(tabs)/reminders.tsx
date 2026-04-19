import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, FlatList, View, StyleSheet, TouchableOpacity,
  TextInput, Modal, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useReminders } from '@/hooks/useReminders';
import { Reminder, ReminderCategory, ReminderRepeat } from '@/types/reminders';
import { parseDatetime } from '@/services/db/reminders';
import { requestNotificationPermissions } from '@/services/notifications/scheduler';

const CAT_ICONS: Record<ReminderCategory, string> = {
  health: 'heart',
  finance: 'card',
  general: 'alarm',
};
const CAT_COLORS: Record<ReminderCategory, string> = {
  health: '#ef4444',
  finance: '#22c55e',
  general: '#a855f7',
};

function formatDue(ts: number): string {
  const now = Date.now();
  const diff = ts - now;
  const d = new Date(ts);
  if (diff < 0) return `Overdue (${d.toLocaleDateString()})`;
  if (diff < 3_600_000) return `In ${Math.round(diff / 60000)} min`;
  if (diff < 86_400_000) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diff < 2 * 86_400_000) return `Tomorrow ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function RemindersScreen() {
  const { colors } = useTheme();
  const { reminders, isLoading, load, add, complete, remove } = useReminders();
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dateText, setDateText] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('general');
  const [repeat, setRepeat] = useState<ReminderRepeat | ''>('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setAdding(true);
    await add({
      title: title.trim(),
      body: body.trim(),
      scheduled_at: parseDatetime(dateText),
      repeat_interval: (repeat as ReminderRepeat) || undefined,
      category,
    });
    setTitle(''); setBody(''); setDateText(''); setCategory('general'); setRepeat('');
    setAdding(false);
    setShowModal(false);
  };

  const handleComplete = (r: Reminder) => {
    Alert.alert('Complete Reminder', `Mark "${r.title}" as done?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Done', onPress: () => complete(r.id) },
    ]);
  };

  const handleDelete = (r: Reminder) => {
    Alert.alert('Delete Reminder', `Delete "${r.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(r.id) },
    ]);
  };

  const overdue = reminders.filter((r) => r.scheduled_at < Date.now());
  const upcoming = reminders.filter((r) => r.scheduled_at >= Date.now());

  const renderReminder = (r: Reminder) => {
    const isOver = r.scheduled_at < Date.now();
    const catColor = CAT_COLORS[r.category as ReminderCategory] ?? colors.accent;
    return (
      <View key={r.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: isOver ? colors.error : colors.border }]}>
        <View style={styles.cardLeft}>
          <View style={[styles.catDot, { backgroundColor: catColor }]}>
            <Ionicons name={CAT_ICONS[r.category as ReminderCategory] as any} size={12} color="#fff" />
          </View>
          <View style={styles.cardInfo}>
            <ThemedText style={styles.cardTitle}>{r.title}</ThemedText>
            {r.body ? <ThemedText secondary style={styles.cardBody} numberOfLines={2}>{r.body}</ThemedText> : null}
            <ThemedText style={[styles.cardDue, { color: isOver ? colors.error : colors.textSecondary }]}>
              {formatDue(r.scheduled_at)}
              {r.repeat_interval ? `  · repeats ${r.repeat_interval}` : ''}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success + '22' }]} onPress={() => handleComplete(r)}>
            <Ionicons name="checkmark" size={18} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.error + '22' }]} onPress={() => handleDelete(r)}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText style={styles.title}>Reminders</ThemedText>
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />}

      {reminders.length === 0 && !isLoading && (
        <View style={styles.empty}>
          <Ionicons name="alarm-outline" size={48} color={colors.textTertiary} />
          <ThemedText secondary style={styles.emptyText}>No reminders yet.{'\n'}The AI can create reminders for you,{'\n'}or tap + to add one manually.</ThemedText>
        </View>
      )}

      <FlatList
        data={[...overdue, ...upcoming]}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          overdue.length > 0 ? (
            <View style={[styles.sectionHeader, { backgroundColor: colors.error + '22' }]}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <ThemedText style={[styles.sectionLabel, { color: colors.error }]}>
                {overdue.length} Overdue
              </ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item }) => renderReminder(item)}
      />

      {/* Add Reminder Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ThemedView style={styles.modal}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>New Reminder</ThemedText>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.elevated, borderColor: colors.border }]}
            placeholder="What do you need to remember?"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.elevated, borderColor: colors.border }]}
            placeholder="Details (optional)"
            placeholderTextColor={colors.textTertiary}
            value={body}
            onChangeText={setBody}
          />

          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.elevated, borderColor: colors.border }]}
            placeholder='When? e.g. "tomorrow at 9:00", "in 2 hours", or ISO date'
            placeholderTextColor={colors.textTertiary}
            value={dateText}
            onChangeText={setDateText}
          />

          {/* Category selector */}
          <View style={styles.row}>
            <ThemedText secondary style={styles.rowLabel}>Category</ThemedText>
            <View style={styles.chips}>
              {(['general', 'health', 'finance'] as ReminderCategory[]).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: category === c ? CAT_COLORS[c] : colors.elevated }]}
                  onPress={() => setCategory(c)}
                >
                  <Ionicons name={CAT_ICONS[c] as any} size={12} color={category === c ? '#fff' : colors.textSecondary} />
                  <ThemedText style={[styles.chipText, { color: category === c ? '#fff' : colors.textSecondary }]}>{c}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Repeat selector */}
          <View style={styles.row}>
            <ThemedText secondary style={styles.rowLabel}>Repeat</ThemedText>
            <View style={styles.chips}>
              {(['', 'daily', 'weekly', 'monthly'] as const).map((r) => (
                <TouchableOpacity
                  key={r || 'once'}
                  style={[styles.chip, { backgroundColor: repeat === r ? colors.accent : colors.elevated }]}
                  onPress={() => setRepeat(r)}
                >
                  <ThemedText style={[styles.chipText, { color: repeat === r ? '#fff' : colors.textSecondary }]}>
                    {r || 'once'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: title.trim() ? colors.accent : colors.muted }]}
            onPress={handleAdd}
            disabled={!title.trim() || adding}
          >
            {adding
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.addBtnText}>Add Reminder</ThemedText>
            }
          </TouchableOpacity>
        </ThemedView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 24, fontWeight: '800' },
  fab: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  cardLeft: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  catDot: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardBody: { fontSize: 13, lineHeight: 18 },
  cardDue: { fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modal: { flex: 1, padding: 20, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  row: { gap: 6 },
  rowLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600' },
  addBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
