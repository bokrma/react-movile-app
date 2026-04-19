import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { SessionList } from '@/components/chat/SessionList';
import { ChatSession } from '@/types/chat';
import { listSessions, createSession, deleteSession } from '@/services/db/chats';
import { getDB } from '@/services/db/database';

export default function ChatsIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const load = useCallback(async () => {
    await getDB(); // ensure DB initialized
    const data = await listSessions();
    setSessions(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNew = async () => {
    const session = await createSession();
    router.push(`/chat/${session.id}`);
  };

  const handleSelect = (session: ChatSession) => {
    router.push(`/chat/${session.id}`);
  };

  const handleDelete = async (id: number) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SessionList
        sessions={sessions}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onNew={handleNew}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
