import React from 'react';
import { FlatList, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { ChatSession } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

interface Props {
  sessions: ChatSession[];
  onSelect: (session: ChatSession) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function SessionList({ sessions, onSelect, onDelete, onNew }: Props) {
  const { colors } = useTheme();

  const renderRightActions = (id: number) => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: colors.error }]}
      onPress={() => {
        Alert.alert('Delete Chat', 'This will permanently delete this chat.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(id) },
        ]);
      }}
    >
      <Ionicons name="trash" size={20} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText style={styles.title}>Chats</ThemedText>
        <TouchableOpacity style={[styles.newBtn, { backgroundColor: colors.accent }]} onPress={onNew}>
          <Ionicons name="add" size={20} color="#fff" />
          <ThemedText style={styles.newBtnText}>New Chat</ThemedText>
        </TouchableOpacity>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
          <ThemedText secondary style={styles.emptyText}>No chats yet. Start one!</ThemedText>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <TouchableOpacity
                style={[styles.item, { borderBottomColor: colors.border }]}
                onPress={() => onSelect(item)}
              >
                <View style={styles.itemContent}>
                  <ThemedText style={styles.itemTitle} numberOfLines={1}>{item.title}</ThemedText>
                  {item.last_message && (
                    <ThemedText secondary style={styles.itemPreview} numberOfLines={1}>
                      {item.last_message}
                    </ThemedText>
                  )}
                </View>
                <ThemedText tertiary style={styles.itemTime}>{formatTime(item.updated_at)}</ThemedText>
              </TouchableOpacity>
            </Swipeable>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 24, fontWeight: '800' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  itemContent: { flex: 1, marginRight: 8 },
  itemTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  itemPreview: { fontSize: 13 },
  itemTime: { fontSize: 12 },
  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 72 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15 },
});
