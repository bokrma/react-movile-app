import React, { useEffect, useState } from 'react';
import {
  ScrollView, View, StyleSheet, SafeAreaView, Switch, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useLLMContext } from '@/context/LLMContext';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { AVAILABLE_MODELS, EMBEDDING_MODEL } from '@/constants/Models';
import * as FileSystem from 'expo-file-system';
import { MODELS_DIR } from '@/services/ai/llm';

function formatBytes(b: number): string {
  if (b < 1e6) return `${(b / 1e3).toFixed(0)} KB`;
  if (b < 1e9) return `${(b / 1e6).toFixed(0)} MB`;
  return `${(b / 1e9).toFixed(1)} GB`;
}

function ModelCard() {
  const { colors } = useTheme();
  const {
    activeModel, chatStatus, embedStatus, downloadProgress,
    setActiveModelId, downloadModel, cancelDownload, isModelDownloaded,
  } = useLLMContext();

  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const check = async () => {
      const results: Record<string, boolean> = {};
      for (const m of [...AVAILABLE_MODELS, EMBEDDING_MODEL]) {
        results[m.id] = await isModelDownloaded(m.filename);
      }
      setDownloaded(results);
    };
    check();
  }, [chatStatus, embedStatus]);

  const renderStatus = (modelId: string, status: string) => {
    const prog = downloadProgress[modelId];
    if (prog) {
      const pct = Math.round((prog.written / prog.total) * 100);
      return (
        <View style={styles.progressRow}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${pct}%` as any }]} />
          </View>
          <ThemedText secondary style={styles.progressText}>{pct}%</ThemedText>
          <TouchableOpacity onPress={() => cancelDownload(modelId)}>
            <ThemedText style={{ color: colors.error, fontSize: 12 }}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }
    if (status === 'loading') return <ActivityIndicator size="small" color={colors.accent} />;
    if (status === 'ready') return <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
    return null;
  };

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>AI Models</ThemedText>
      <ThemedText secondary style={styles.hint}>
        Models run entirely on your device. Download a chat model to get started.
        The embedding model enables semantic knowledge base search.
      </ThemedText>

      {AVAILABLE_MODELS.map((model) => {
        const isActive = activeModel?.id === model.id;
        const isDl = downloaded[model.id];
        const prog = downloadProgress[model.id];
        const isDownloading = !!prog;

        return (
          <View
            key={model.id}
            style={[styles.modelCard, {
              backgroundColor: colors.elevated,
              borderColor: isActive ? colors.accent : colors.border,
            }]}
          >
            <View style={styles.modelHeader}>
              <View style={styles.modelInfo}>
                <ThemedText style={styles.modelName}>{model.name}</ThemedText>
                <ThemedText secondary style={styles.modelDesc}>{model.description}</ThemedText>
              </View>
              {isDl && !isActive && (
                <TouchableOpacity
                  style={[styles.useBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setActiveModelId(model.id)}
                >
                  <ThemedText style={styles.useBtnText}>Use</ThemedText>
                </TouchableOpacity>
              )}
              {isActive && renderStatus(model.id, chatStatus)}
            </View>

            {renderStatus(model.id, isDownloading ? 'downloading' : '')}

            {!isDl && !isDownloading && (
              <TouchableOpacity
                style={[styles.dlBtn, { backgroundColor: colors.accent }]}
                onPress={() => downloadModel(model)}
              >
                <Ionicons name="cloud-download-outline" size={16} color="#fff" />
                <ThemedText style={styles.dlBtnText}>
                  Download ({formatBytes(model.sizeBytes)})
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Embedding model */}
      <View style={[styles.modelCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <View style={styles.modelHeader}>
          <View style={styles.modelInfo}>
            <ThemedText style={styles.modelName}>{EMBEDDING_MODEL.name}</ThemedText>
            <ThemedText secondary style={styles.modelDesc}>{EMBEDDING_MODEL.description}</ThemedText>
          </View>
          {downloaded[EMBEDDING_MODEL.id]
            ? <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            : renderStatus(EMBEDDING_MODEL.id, embedStatus)
          }
        </View>
        {!downloaded[EMBEDDING_MODEL.id] && !downloadProgress[EMBEDDING_MODEL.id] && (
          <TouchableOpacity
            style={[styles.dlBtn, { backgroundColor: colors.info }]}
            onPress={() => downloadModel(EMBEDDING_MODEL)}
          >
            <Ionicons name="cloud-download-outline" size={16} color="#fff" />
            <ThemedText style={styles.dlBtnText}>
              Download ({formatBytes(EMBEDDING_MODEL.sizeBytes)})
            </ThemedText>
          </TouchableOpacity>
        )}
        {renderStatus(EMBEDDING_MODEL.id, downloadProgress[EMBEDDING_MODEL.id] ? 'downloading' : '')}
      </View>
    </View>
  );
}

function ProfileSection() {
  const { colors } = useTheme();
  const { addText } = useKnowledgeBase();
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [interests, setInterests] = useState('');
  const [style, setStyle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name && !occupation && !interests) return;
    setSaving(true);
    const profileText = [
      name && `My name is ${name}.`,
      occupation && `I work as ${occupation}.`,
      interests && `My interests include: ${interests}.`,
      style && `My communication style preference: ${style}.`,
    ].filter(Boolean).join(' ');

    await addText(profileText, 'Personal Profile', 'profile', true);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <View style={styles.fieldRow}>
      <ThemedText secondary style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.elevated, borderColor: colors.border }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  );

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Personal Profile</ThemedText>
      <ThemedText secondary style={styles.hint}>
        Saved as pinned knowledge — the AI will always know this about you.
      </ThemedText>
      {field('Name', name, setName, 'Your name')}
      {field('Occupation', occupation, setOccupation, 'What do you do?')}
      {field('Interests', interests, setInterests, 'e.g. cooking, AI, travel…')}
      {field('AI Style', style, setStyle, 'e.g. concise, friendly, technical…')}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: saved ? colors.success : colors.accent }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <ThemedText style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save to Knowledge Base'}</ThemedText>
        }
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.pageTitle}>Settings</ThemedText>

        <ModelCard />
        <ProfileSection />

        {/* Appearance */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Appearance</ThemedText>
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} />
            <ThemedText style={styles.rowLabel}>Dark Mode</ThemedText>
            <Switch value={isDark} onValueChange={toggleTheme} thumbColor={colors.accent} />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          <ThemedText secondary style={styles.hint}>
            Edge AI Assistant — all AI runs locally on your device using llama.cpp.{'\n'}
            No data is sent to any server unless you use the web search tool.
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  section: { gap: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  hint: { fontSize: 13, lineHeight: 18 },
  modelCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  modelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modelInfo: { flex: 1 },
  modelName: { fontSize: 15, fontWeight: '700' },
  modelDesc: { fontSize: 12, marginTop: 2 },
  useBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  useBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, justifyContent: 'center' },
  dlBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, minWidth: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  rowLabel: { flex: 1, fontSize: 15 },
  fieldRow: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
