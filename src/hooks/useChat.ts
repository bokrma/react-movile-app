import { useState, useCallback, useRef } from 'react';
import { ChatMessage } from '@/types/chat';
import { addMessage, updateSessionTitle } from '@/services/db/chats';
import { buildRAGContext } from '@/services/ai/rag';
import { generateCompletion, isChatModelLoaded } from '@/services/ai/llm';
import { webSearch, fetchUrl, formatSearchResults } from '@/services/ai/webSearch';
import { TITLE_PROMPT } from '@/constants/Prompts';

export type ChatStatus = 'idle' | 'thinking' | 'generating' | 'error';

const TOOL_CALL_RE = /\[TOOL:(web_search|fetch_url)\(([^)]+)\)\]/g;

export function useChat(sessionId: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [streamingText, setStreamingText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef(false);

  const initMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
  }, []);

  const send = useCallback(async (userText: string, allMessages: ChatMessage[]) => {
    if (!isChatModelLoaded()) {
      setErrorMsg('No model loaded. Please download a model in Settings.');
      return;
    }

    abortRef.current = false;
    setStatus('thinking');
    setErrorMsg(null);
    setStreamingText('');

    const userMsg = await addMessage(sessionId, 'user', userText);
    const updatedMessages = [...allMessages, userMsg];
    setMessages(updatedMessages);

    // auto-title from first user message
    if (allMessages.length === 0) {
      generateCompletion(
        [{ role: 'user', content: `${TITLE_PROMPT}\n\nMessage: ${userText}` }],
        '',
      )
        .then((title) => updateSessionTitle(sessionId, title.trim().slice(0, 60)))
        .catch(() => {});
    }

    try {
      const { contextBlock, sourceIds } = await buildRAGContext(userText);

      const historyForLLM = updatedMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      setStatus('generating');

      let accumulated = '';
      let responseText = await generateCompletion(
        historyForLLM,
        contextBlock,
        (token) => {
          accumulated += token;
          setStreamingText(accumulated);
        },
      );

      // tool use: handle [TOOL:...] calls
      const toolCalls = [...responseText.matchAll(TOOL_CALL_RE)];
      if (toolCalls.length > 0) {
        let toolResults = '';
        for (const match of toolCalls) {
          const [, toolName, arg] = match;
          if (toolName === 'web_search') {
            const results = await webSearch(arg);
            toolResults += `\nWeb search results for "${arg}":\n${formatSearchResults(results)}\n`;
          } else if (toolName === 'fetch_url') {
            const content = await fetchUrl(arg);
            toolResults += `\nContent from ${arg}:\n${content}\n`;
          }
        }

        if (toolResults) {
          setStreamingText('');
          accumulated = '';
          const augmentedMessages = [
            ...historyForLLM,
            { role: 'assistant' as const, content: responseText },
            { role: 'user' as const, content: `Tool results:\n${toolResults}\n\nNow answer based on these results.` },
          ];
          responseText = await generateCompletion(
            augmentedMessages,
            contextBlock,
            (token) => {
              accumulated += token;
              setStreamingText(accumulated);
            },
          );
        }
      }

      setStreamingText('');
      const assistantMsg = await addMessage(sessionId, 'assistant', responseText, sourceIds);
      setMessages((prev) => [...prev, assistantMsg]);
      setStatus('idle');
    } catch (e) {
      setStreamingText('');
      setErrorMsg(String(e));
      setStatus('error');
    }
  }, [sessionId]);

  return { messages, status, streamingText, errorMsg, initMessages, send };
}
