import React, { useEffect, useRef, useCallback } from 'react';
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

export default function ChatScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const id = parseInt(sessionId, 10);
  const { colors } = useTheme();
  const router = useRouter();
  const { chatStatus } = useLLMContext();
  const { messages, status, streamingText, errorMsg, initMessages, send } = useChat(id);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getMessages(id).then(initMessages);
  }, [id, initMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = useCallback((text: string) => {
    send(text, messages);
  }, [send, messages]);

  const isModelReady = chatStatus === 'ready';
  const isGenerating = status === 'thinking' || status === 'generating';

  // Build display list including live streaming bubble
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

  const statusText = () => {
    if (chatStatus === 'not_downloaded') return 'Download a model in Settings to chat';
    if (chatStatus === 'loading') return 'Loading model…';
    if (chatStatus === 'downloading') return 'Model downloading…';
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
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>Chat</ThemedText>
          {banner && (
            <ThemedText secondary style={styles.headerSub}>{banner}</ThemedText>
          )}
        </View>
        {isGenerating && <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <Ionicons name="sparkles" size={40} color={colors.accent} />
              <ThemedText secondary style={styles.emptyText}>
                {isModelReady
                  ? 'Say something to start the conversation'
                  : 'Download a model in Settings to begin'}
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
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, paddingHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  spinner: { marginRight: 8 },
  messageList: { paddingVertical: 12, paddingBottom: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 80 },
  emptyText: { fontSize: 15, textAlign: 'center', maxWidth: 260 },
  errorBanner: { margin: 12, padding: 12, borderRadius: 10 },
});
