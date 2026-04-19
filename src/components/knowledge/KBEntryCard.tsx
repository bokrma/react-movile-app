import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { KBChunk } from '@/types/knowledge';
import { Ionicons } from '@expo/vector-icons';

const TYPE_ICONS: Record<string, string> = {
  file: 'document-text',
  text: 'create',
  profile: 'person-circle',
  note: 'journal',
};

interface Props {
  chunk: KBChunk;
  onDelete: (id: number) => void;
}

export function KBEntryCard({ chunk, onDelete }: Props) {
  const { colors } = useTheme();
  const icon = TYPE_ICONS[chunk.source_type] ?? 'document';

  const handleDelete = () => {
    Alert.alert('Remove Entry', 'Remove this from your knowledge base?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(chunk.id) },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: chunk.is_pinned ? colors.accent : colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: colors.elevated }]}>
          <Ionicons name={icon as any} size={14} color={colors.accent} />
        </View>
        <ThemedText style={styles.sourceName} numberOfLines={1}>{chunk.source_name}</ThemedText>
        {chunk.is_pinned === 1 && (
          <View style={[styles.pinBadge, { backgroundColor: colors.accentDim }]}>
            <ThemedText style={styles.pinText}>pinned</ThemedText>
          </View>
        )}
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
      <ThemedText secondary style={styles.content} numberOfLines={3}>{chunk.content}</ThemedText>
      <ThemedText tertiary style={styles.meta}>
        {new Date(chunk.created_at).toLocaleDateString()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBg: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  sourceName: { flex: 1, fontSize: 13, fontWeight: '600' },
  pinBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pinText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  content: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 11 },
});
