import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { ChatMessage } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  message: ChatMessage & { isStreaming?: boolean };
}

export function ChatBubble({ message }: Props) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const [expanded, setExpanded] = useState(true);

  const bubbleColor = isUser ? colors.userBubble : colors.aiBubble;
  const textColor = isUser ? '#ffffff' : colors.text;

  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Ionicons name="sparkles" size={12} color="#fff" />
        </View>
      )}
      <Pressable
        style={[styles.bubble, { backgroundColor: bubbleColor }, isUser ? styles.userBubble : styles.aiBubble]}
        onLongPress={() => setExpanded((v) => !v)}
      >
        <ThemedText
          style={[styles.text, { color: textColor }]}
          numberOfLines={expanded ? undefined : 4}
        >
          {message.content}
          {message.isStreaming && (
            <ThemedText style={{ color: colors.accent }}>▍</ThemedText>
          )}
        </ThemedText>
        {message.sources && message.sources.length > 0 && (
          <View style={styles.sourceBadge}>
            <Ionicons name="library-outline" size={10} color={colors.textSecondary} />
            <ThemedText secondary style={styles.sourceText}>
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
            </ThemedText>
          </View>
        )}
      </Pressable>
      {isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.accentDim }]}>
          <Ionicons name="person" size={12} color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 12, alignItems: 'flex-end', gap: 8 },
  userWrapper: { justifyContent: 'flex-end' },
  aiWrapper: { justifyContent: 'flex-start' },
  avatar: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12, gap: 6 },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  text: { fontSize: 15, lineHeight: 21 },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sourceText: { fontSize: 11 },
});
