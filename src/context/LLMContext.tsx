import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {
  loadChatModel, loadEmbedModel, isChatModelLoaded, isEmbedModelLoaded,
  ensureModelsDir, MODELS_DIR,
} from '@/services/ai/llm';
import { AVAILABLE_MODELS, EMBEDDING_MODEL, ModelDef, DEFAULT_MODEL_ID } from '@/constants/Models';

export type ModelStatus = 'not_downloaded' | 'downloading' | 'loading' | 'ready' | 'error';

interface DownloadProgress { written: number; total: number }

interface LLMContextValue {
  activeModel: ModelDef | null;
  chatStatus: ModelStatus;
  embedStatus: ModelStatus;
  downloadProgress: Record<string, DownloadProgress>;
  errorMessage: string | null;
  setActiveModelId: (id: string) => Promise<void>;
  downloadModel: (model: ModelDef) => Promise<void>;
  cancelDownload: (modelId: string) => void;
  isModelDownloaded: (filename: string) => Promise<boolean>;
  reloadModels: () => Promise<void>;
}

const LLMContext = createContext<LLMContextValue | null>(null);
const ACTIVE_MODEL_KEY = '@llm/activeModelId';

const downloadHandles: Record<string, FileSystem.DownloadResumable> = {};

export function LLMProvider({ children }: { children: ReactNode }) {
  const [activeModelId, setActiveModelId_] = useState<string>(DEFAULT_MODEL_ID);
  const [chatStatus, setChatStatus] = useState<ModelStatus>('not_downloaded');
  const [embedStatus, setEmbedStatus] = useState<ModelStatus>('not_downloaded');
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeModel = AVAILABLE_MODELS.find((m) => m.id === activeModelId) ?? AVAILABLE_MODELS[0];

  async function isModelDownloaded(filename: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(`${MODELS_DIR}${filename}`);
    return info.exists && (info.size ?? 0) > 1_000_000;
  }

  const loadModels = useCallback(async () => {
    if (!activeModel) return;
    await ensureModelsDir();

    const chatDownloaded = await isModelDownloaded(activeModel.filename);
    const embedDownloaded = await isModelDownloaded(EMBEDDING_MODEL.filename);

    if (chatDownloaded && !isChatModelLoaded()) {
      setChatStatus('loading');
      try {
        await loadChatModel(activeModel.filename);
        setChatStatus('ready');
      } catch (e) {
        setChatStatus('error');
        setErrorMessage(String(e));
      }
    } else if (!chatDownloaded) {
      setChatStatus('not_downloaded');
    }

    if (embedDownloaded && !isEmbedModelLoaded()) {
      setEmbedStatus('loading');
      try {
        await loadEmbedModel(EMBEDDING_MODEL.filename);
        setEmbedStatus('ready');
      } catch {
        setEmbedStatus('error');
      }
    } else if (!embedDownloaded) {
      setEmbedStatus('not_downloaded');
    }
  }, [activeModel]);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_MODEL_KEY).then((id) => {
      if (id) setActiveModelId_(id);
    });
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const setActiveModelId = async (id: string) => {
    setActiveModelId_(id);
    await AsyncStorage.setItem(ACTIVE_MODEL_KEY, id);
    setChatStatus('not_downloaded');
  };

  const downloadModel = async (model: ModelDef) => {
    await ensureModelsDir();
    const path = `${MODELS_DIR}${model.filename}`;
    const isChat = model.id !== EMBEDDING_MODEL.id;

    if (isChat) setChatStatus('downloading');
    else setEmbedStatus('downloading');

    const handle = FileSystem.createDownloadResumable(
      model.downloadUrl,
      path,
      {},
      (progress) => {
        const written = progress.totalBytesWritten;
        const total = progress.totalBytesExpectedToWrite > 0
          ? progress.totalBytesExpectedToWrite
          : model.sizeBytes;
        setDownloadProgress((prev) => ({ ...prev, [model.id]: { written, total } }));
      },
    );
    downloadHandles[model.id] = handle;

    try {
      await handle.downloadAsync();
      delete downloadHandles[model.id];
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[model.id];
        return next;
      });
      await loadModels();
    } catch (e) {
      delete downloadHandles[model.id];
      if (isChat) setChatStatus('error');
      else setEmbedStatus('error');
      setErrorMessage(`Download failed: ${e}`);
    }
  };

  const cancelDownload = (modelId: string) => {
    downloadHandles[modelId]?.pauseAsync().catch(() => {});
    delete downloadHandles[modelId];
    setDownloadProgress((prev) => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
    setChatStatus('not_downloaded');
  };

  return (
    <LLMContext.Provider value={{
      activeModel,
      chatStatus,
      embedStatus,
      downloadProgress,
      errorMessage,
      setActiveModelId,
      downloadModel,
      cancelDownload,
      isModelDownloaded,
      reloadModels: loadModels,
    }}>
      {children}
    </LLMContext.Provider>
  );
}

export function useLLMContext(): LLMContextValue {
  const ctx = useContext(LLMContext);
  if (!ctx) throw new Error('useLLMContext must be inside LLMProvider');
  return ctx;
}
