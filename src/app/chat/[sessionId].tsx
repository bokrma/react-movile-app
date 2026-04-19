import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  SafeAreaView, FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, View, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLLMContext } from '@/context/LLMContext';
import { useChat } from '@/hooks/useChat';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { getMessages } from '@/services/db/chats';
import { AssistantMode } from '@/services/ai/scoring';
import { ASSISTANT_MODES, MODE_LIST } from '@/constants/AssistantModes';

const MODE_ICON_MAP: Record<AssistantMode, string> = {
  general: 'sparkles',
  health: 'heart',
  finance: 'card',
};

export default function ChatScreen() {
  const { sessionId, mode: modeParam } = useLocalSearchParams<{ sessionId: string; mode?: string }>();
  const id = parseInt(sessionId, 10);
  const { colors } = useTheme();
  const router = useRouter();
  const { chatStatus } = useLLMContext();

  const [mode, setMode] = useState<AssistantMode>((modeParam as AssistantMode) ?? 'general');
  const [showModeMenu, setShowModeMenu] = useState(false);

  const { messages, status, streamingText, errorMsg, initMessages, send } = useChat(id, mode);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getMessages(id).then(initMessages);
  }, [id, initMessages]);

  useEffect(() => {
    if (messages.length > 0 || streamingText) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, streamingText]);

  const handleSend = useCallback((text: string) => {
    send(text, messages);
  }, [send, messages]);

  const isModelReady = chatStatus === 'ready';
  const isGenerating = status === 'thinking' || status === 'generating';

  const displayMessages = streamingText
    ? [
        ...messages,
        {
          id: -1,
          session_id: id,
          role: 'assistant' as const,
          content: streamingText,
          sources: [],
          created_at: Date.now(),
          isStreaming: true,
        },
      ]
    : messages;

  const activeModeConfig = ASSISTANT_MODES[mode];

  const statusText = () => {
    if (chatStatus === 'not_downloaded') return 'Download a model in Settings →';
    if (chatStatus === 'loading') return 'Loading model…';
    if (chatStatus === 'downloading') return 'Downloading model…';
    if (status === 'thinking') return 'Thinking…';
    if (status === 'generating') return 'Generating…';
    return null;
  };

  const banner = statusText();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.modeChip} onPress={() => setShowModeMenu(true)}>
          <Ionicons name={MODE_ICON_MAP[mode] as any} size={14} color={activeModeConfig.color} />
          <ThemedText style={[styles.modeLabel, { color: activeModeConfig.color }]}>
            {activeModeConfig.label}
          </ThemedText>
          <Ionicons name="chevron-down" size={12} color={activeModeConfig.color} />
        </TouchableOpacity>

        {banner && (
          <ThemedText secondary style={styles.statusText} numberOfLines={1}>{banner}</ThemedText>
        )}
        {isGenerating && <ActivityIndicator size="small" color={colors.accent} />}
      </View>

      {/* Mode Menu */}
      {showModeMenu && (
        <View style={[styles.modeMenu, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          {MODE_LIST.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeMenuItem, mode === m.id && { backgroundColor: colors.surface }]}
              onPress={() => { setMode(m.id); setShowModeMenu(false); }}
            >
              <Ionicons name={m.icon as any} size={16} color={m.color} />
              <View>
                <ThemedText style={styles.modeMenuLabel}>{m.label}</ThemedText>
              </View>
              {mode === m.id && <Ionicons name="checkmark" size={16} color={m.color} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <Ionicons name={MODE_ICON_MAP[mode] as any} size={40} color={activeModeConfig.color} />
              <ThemedText secondary style={styles.emptyText}>
                {isModelReady
                  ? `${activeModeConfig.label} ready.\nAsk anything or request a reminder.`
                  : 'Download a model in Settings to begin chatting.'}
              </ThemedText>
            </ThemedView>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: colors.error }]}>
            <ThemedText style={{ color: '#fff', fontSize: 13 }}>{errorMsg}</ThemedText>
          </View>
        )}

        <ChatInput
          onSend={handleSend}
          isGenerating={isGenerating}
          disabled={!isModelReady || isGenerating}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  backBtn: { padding: 8 },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  modeLabel: { fontSize: 13, fontWeight: '700' },
  statusText: { flex: 1, fontSize: 12 },
  modeMenu: {
    position: 'absolute', top: 52, left: 16, right: 16, zIndex: 100,
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  modeMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  modeMenuLabel: { fontSize: 14, fontWeight: '600' },
  messageList: { paddingVertical: 12, paddingBottom: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 80 },
  emptyText: { fontSize: 15, textAlign: 'center', maxWidth: 260, lineHeight: 22 },
  errorBanner: { margin: 12, padding: 12, borderRadius: 10 },
});
