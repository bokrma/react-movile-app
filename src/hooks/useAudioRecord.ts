import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export type RecordStatus = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export function useAudioRecord() {
  const [status, setStatus] = useState<RecordStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    setTranscript('');
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setErrorMsg('Microphone permission denied.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setStatus('recording');
    } catch (e) {
      setErrorMsg(String(e));
      setStatus('error');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;
    setStatus('processing');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setStatus('error');
        return null;
      }

      // Use iOS Speech Recognition via a simple approach
      // For now, return the URI so the caller can use it
      setStatus('done');
      return uri;
    } catch (e) {
      setErrorMsg(String(e));
      setStatus('error');
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    setStatus('idle');
  }, []);

  const setTranscriptText = useCallback((text: string) => {
    setTranscript(text);
    setStatus('done');
  }, []);

  return {
    status,
    transcript,
    errorMsg,
    startRecording,
    stopRecording,
    cancelRecording,
    setTranscriptText,
  };
}
