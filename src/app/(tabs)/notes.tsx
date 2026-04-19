import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView, FlatList, View, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { NoteCard } from '@/components/notes/NoteCard';
import { useTheme } from '@/context/ThemeContext';
import { useAudioRecord } from '@/hooks/useAudioRecord';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { Note } from '@/types/notes';
import { listNotes, createNote, updateNote, deleteNote, setNoteInKB, setNoteAudioUri } from '@/services/db/notes';
import * as FileSystem from 'expo-file-system';

export default function NotesScreen() {
  const { colors } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { status: recStatus, startRecording, stopRecording, cancelRecording } = useAudioRecord();
  const { addText } = useKnowledgeBase();

  const loadNotes = useCallback(async () => {
    const all = await listNotes();
    setNotes(all);
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleNew = async () => {
    const note = await createNote();
    setEditNote(note);
    setEditContent('');
  };

  const handleOpen = (note: Note) => {
    setEditNote(note);
    setEditContent(note.content);
  };

  const handleSave = async () => {
    if (!editNote) return;
    setIsSaving(true);
    await updateNote(editNote.id, editContent);
    setIsSaving(false);
    await loadNotes();
  };

  const handleClose = async () => {
    await handleSave();
    setEditNote(null);
  };

  const handleDelete = async (id: number) => {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleToggleKB = async () => {
    if (!editNote) return;
    const newVal = editNote.in_kb === 0;
    await setNoteInKB(editNote.id, newVal);
    if (newVal && editContent.trim()) {
      await addText(editContent.trim(), `Note: ${editNote.date}`, 'note');
    }
    setEditNote({ ...editNote, in_kb: newVal ? 1 : 0 });
  };

  const handleMicToggle = async () => {
    if (recStatus === 'recording') {
      const uri = await stopRecording();
      if (uri && editNote) {
        await setNoteAudioUri(editNote.id, uri);
        // Simple note about the recording
        const recNote = `\n\n[Voice recording saved: ${new Date().toLocaleTimeString()}]`;
        const newContent = editContent + recNote;
        setEditContent(newContent);
        await updateNote(editNote.id, newContent);
      }
    } else {
      await startRecording();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText style={styles.title}>Notes</ThemedText>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={handleNew}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="journal-outline" size={48} color={colors.textTertiary} />
          <ThemedText secondary style={styles.emptyText}>No notes yet.{'\n'}Tap + to create your first note.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={handleOpen} onDelete={handleDelete} />
          )}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={!!editNote} animationType="slide" presentationStyle="pageSheet">
        <ThemedView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="chevron-down" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText style={styles.modalDate}>{editNote?.date}</ThemedText>
            <View style={styles.modalActions}>
              {/* Mic button */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: recStatus === 'recording' ? colors.error : colors.elevated },
                ]}
                onPress={handleMicToggle}
              >
                <Ionicons
                  name={recStatus === 'recording' ? 'stop' : 'mic'}
                  size={18}
                  color={recStatus === 'recording' ? '#fff' : colors.accent}
                />
              </TouchableOpacity>

              {/* Add to KB toggle */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: editNote?.in_kb ? colors.accent : colors.elevated },
                ]}
                onPress={handleToggleKB}
              >
                <Ionicons name="library" size={18} color={editNote?.in_kb ? '#fff' : colors.textSecondary} />
              </TouchableOpacity>

              {isSaving
                ? <ActivityIndicator color={colors.accent} size="small" />
                : (
                  <TouchableOpacity onPress={handleSave}>
                    <ThemedText accent style={styles.saveText}>Save</ThemedText>
                  </TouchableOpacity>
                )
              }
            </View>
          </View>

          {recStatus === 'recording' && (
            <View style={[styles.recordingBanner, { backgroundColor: colors.error }]}>
              <Ionicons name="radio-button-on" size={12} color="#fff" />
              <ThemedText style={{ color: '#fff', fontSize: 13 }}>Recording… tap stop when done</ThemedText>
            </View>
          )}

          <TextInput
            style={[styles.noteInput, { color: colors.text }]}
            multiline
            value={editContent}
            onChangeText={setEditContent}
            placeholder="Start writing your note…"
            placeholderTextColor={colors.textTertiary}
            textAlignVertical="top"
            autoFocus
          />
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
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  modal: { flex: 1, paddingTop: 16, paddingHorizontal: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  closeBtn: { padding: 4 },
  modalDate: { flex: 1, fontSize: 16, fontWeight: '700' },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '600' },
  recordingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 12 },
  noteInput: { flex: 1, fontSize: 16, lineHeight: 24, paddingBottom: 40 },
});
