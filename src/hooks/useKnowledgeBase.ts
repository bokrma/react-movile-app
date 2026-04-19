import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { insertChunk, getAllChunks, deleteChunk, deleteChunksBySourceName } from '@/services/db/knowledge';
import { embedText, isEmbedModelLoaded } from '@/services/ai/llm';
import { KBChunk } from '@/types/knowledge';

function chunkText(text: string, maxLen = 500): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';
  for (const para of paragraphs) {
    if ((current + para).length > maxLen && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 20);
}

export function useKnowledgeBase() {
  const [chunks, setChunks] = useState<KBChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChunks = useCallback(async () => {
    const all = await getAllChunks();
    setChunks(all);
  }, []);

  const addText = useCallback(async (
    text: string,
    sourceName: string,
    sourceType: 'text' | 'profile' | 'note' = 'text',
    isPinned = false,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const parts = chunkText(text);
      for (const part of parts) {
        const embedding = isEmbedModelLoaded() ? await embedText(part) : [];
        await insertChunk(
          { source_name: sourceName, source_type: sourceType, content: part, is_pinned: isPinned },
          embedding,
        );
      }
      await loadChunks();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, [loadChunks]);

  const uploadFile = useCallback(async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const name = asset.name;
      setIsLoading(true);

      let text = '';
      if (asset.mimeType === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
        text = await FileSystem.readAsStringAsync(asset.uri);
      } else {
        // For other file types, read as much as possible
        try {
          text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
        } catch {
          setError('Could not read file. Only text files are fully supported.');
          setIsLoading(false);
          return;
        }
      }

      if (!text.trim()) {
        setError('File is empty or could not be read as text.');
        setIsLoading(false);
        return;
      }

      const parts = chunkText(text);
      for (const part of parts) {
        const embedding = isEmbedModelLoaded() ? await embedText(part) : [];
        await insertChunk(
          { source_name: name, source_type: 'file', content: part },
          embedding,
        );
      }
      await loadChunks();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, [loadChunks]);

  const removeChunk = useCallback(async (id: number) => {
    await deleteChunk(id);
    setChunks((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const removeSource = useCallback(async (sourceName: string) => {
    await deleteChunksBySourceName(sourceName);
    setChunks((prev) => prev.filter((c) => c.source_name !== sourceName));
  }, []);

  return { chunks, isLoading, error, loadChunks, addText, uploadFile, removeChunk, removeSource };
}
