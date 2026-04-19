import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { Note } from '@/types/notes';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  note: Note;
  onPress: (note: Note) => void;
  onDelete: (id: number) => void;
}

export function NoteCard({ note, onPress, onDelete }: Props) {
  const { colors } = useTheme();

  const handleDelete = () => {
    Alert.alert('Delete Note', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(note.id) },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onPress(note)}
    >
      <View style={styles.header}>
        <ThemedText style={styles.date}>{note.date}</ThemedText>
        <View style={styles.badges}>
          {note.audio_uri && <Ionicons name="mic" size={14} color={colors.textSecondary} />}
          {note.in_kb === 1 && <Ionicons name="library" size={14} color={colors.accent} />}
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
      <ThemedText secondary style={styles.preview} numberOfLines={4}>
        {note.content || '(empty note)'}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date: { flex: 1, fontSize: 13, fontWeight: '700' },
  badges: { flexDirection: 'row', gap: 6 },
  deleteBtn: { padding: 4 },
  preview: { fontSize: 14, lineHeight: 20 },
});
