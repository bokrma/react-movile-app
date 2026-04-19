import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, FlatList, View, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { KBEntryCard } from '@/components/knowledge/KBEntryCard';
import { useTheme } from '@/context/ThemeContext';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KBChunk } from '@/types/knowledge';

type GroupedChunks = { sourceName: string; chunks: KBChunk[]; type: string }[];

function groupChunks(chunks: KBChunk[]): GroupedChunks {
  const map = new Map<string, KBChunk[]>();
  for (const c of chunks) {
    if (!map.has(c.source_name)) map.set(c.source_name, []);
    map.get(c.source_name)!.push(c);
  }
  return Array.from(map.entries()).map(([sourceName, items]) => ({
    sourceName,
    chunks: items,
    type: items[0].source_type,
  }));
}

export default function KnowledgeScreen() {
  const { colors } = useTheme();
  const { chunks, isLoading, error, loadChunks, addText, uploadFile, removeChunk, removeSource } = useKnowledgeBase();
  const [showAddModal, setShowAddModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteName, setPasteName] = useState('');
  const [adding, setAdding] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  useEffect(() => { loadChunks(); }, [loadChunks]);

  const grouped = groupChunks(chunks);

  const handlePasteAdd = async () => {
    if (!pasteText.trim()) return;
    setAdding(true);
    await addText(pasteText.trim(), pasteName.trim() || 'Manual Entry');
    setPasteText('');
    setPasteName('');
    setAdding(false);
    setShowAddModal(false);
  };

  const handleUpload = async () => {
    setShowAddModal(false);
    await uploadFile();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedText style={styles.title}>Knowledge Base</ThemedText>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ThemedText secondary style={styles.subtitle}>
        {chunks.length} chunk{chunks.length !== 1 ? 's' : ''} across {grouped.length} source{grouped.length !== 1 ? 's' : ''}
      </ThemedText>

      {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />}

      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.error }]}>
          <ThemedText style={{ color: '#fff', fontSize: 13 }}>{error}</ThemedText>
        </View>
      )}

      {grouped.length === 0 && !isLoading && (
        <View style={styles.empty}>
          <Ionicons name="library-outline" size={48} color={colors.textTertiary} />
          <ThemedText secondary style={styles.emptyText}>
            Your knowledge base is empty.{'\n'}Add files, notes, or text to get started.
          </ThemedText>
        </View>
      )}

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.sourceName}
        contentContainerStyle={styles.list}
        renderItem={({ item: group }) => {
          const isExpanded = expandedSource === group.sourceName;
          return (
            <View style={styles.groupContainer}>
              <TouchableOpacity
                style={[styles.groupHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setExpandedSource(isExpanded ? null : group.sourceName)}
              >
                <Ionicons
                  name={group.type === 'file' ? 'document-text' : group.type === 'profile' ? 'person-circle' : 'create'}
                  size={16}
                  color={colors.accent}
                />
                <ThemedText style={styles.groupTitle} numberOfLines={1}>{group.sourceName}</ThemedText>
                <ThemedText secondary style={styles.groupCount}>{group.chunks.length}</ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Remove Source', `Remove all ${group.chunks.length} chunks from "${group.sourceName}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeSource(group.sourceName) },
                    ]);
                  }}
                  style={styles.removeBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </TouchableOpacity>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {isExpanded && group.chunks.map((chunk) => (
                <KBEntryCard key={chunk.id} chunk={chunk} onDelete={removeChunk} />
              ))}
            </View>
          );
        }}
      />

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <ThemedView style={styles.modal}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Add to Knowledge Base</ThemedText>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.optionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleUpload}
          >
            <Ionicons name="document-attach" size={24} color={colors.accent} />
            <View>
              <ThemedText style={styles.optionTitle}>Upload File</ThemedText>
              <ThemedText secondary style={styles.optionDesc}>TXT, Markdown, or other text files</ThemedText>
            </View>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <ThemedText style={styles.pasteLabel}>Or paste text</ThemedText>

          <TextInput
            style={[styles.nameInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Source name (optional)"
            placeholderTextColor={colors.textTertiary}
            value={pasteName}
            onChangeText={setPasteName}
          />

          <TextInput
            style={[styles.pasteInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Paste or type text to add to your knowledge base…"
            placeholderTextColor={colors.textTertiary}
            value={pasteText}
            onChangeText={setPasteText}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: pasteText.trim() ? colors.accent : colors.muted }]}
            onPress={handlePasteAdd}
            disabled={!pasteText.trim() || adding}
          >
            {adding
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.addBtnText}>Add Text</ThemedText>
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
  subtitle: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 8 },
  list: { padding: 16, gap: 8 },
  groupContainer: { gap: 4 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  groupTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  groupCount: { fontSize: 12 },
  removeBtn: { padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 60 },
  emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  errorBox: { margin: 16, padding: 12, borderRadius: 10 },
  modal: { flex: 1, padding: 20, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  optionDesc: { fontSize: 12, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  pasteLabel: { fontSize: 15, fontWeight: '600' },
  nameInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  pasteInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 140 },
  addBtn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
