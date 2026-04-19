import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  onSend: (text: string) => void;
  onMic?: () => void;
  isGenerating: boolean;
  onCancel?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onMic, isGenerating, onCancel, disabled }: Props) {
  const [text, setText] = useState('');
  const { colors } = useTheme();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    setText('');
    onSend(trimmed);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View style={[styles.inputRow, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Message…"
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        {onMic && !text && (
          <TouchableOpacity style={styles.iconBtn} onPress={onMic} disabled={isGenerating}>
            <Ionicons name="mic" size={20} color={colors.accent} />
          </TouchableOpacity>
        )}
        {isGenerating ? (
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.error }]} onPress={onCancel}>
            <Ionicons name="stop" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.accent : colors.muted }]}
            onPress={handleSend}
            disabled={!text.trim() || disabled}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', borderRadius: 24,
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, gap: 8,
  },
  input: { flex: 1, fontSize: 16, maxHeight: 120, paddingVertical: 6 },
  iconBtn: { padding: 6 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
});
