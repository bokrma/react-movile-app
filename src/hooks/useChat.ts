import { useState, useCallback, useRef } from 'react';
import { ChatMessage } from '@/types/chat';
import { addMessage, updateSessionTitle, getMessages } from '@/services/db/chats';
import { buildRAGContext } from '@/services/ai/rag';
import { generateCompletion, isChatModelLoaded, embedText, isEmbedModelLoaded } from '@/services/ai/llm';
import { webSearch, fetchUrl, formatSearchResults } from '@/services/ai/webSearch';
import { TITLE_PROMPT } from '@/constants/Prompts';
import { AssistantMode } from '@/services/ai/scoring';
import { buildModeSystemPrompt } from '@/constants/AssistantModes';
import { extractFactsFromMessages, buildExtractionPrompt, parseExtractedFacts } from '@/services/memory/extractor';
import { buildSummaryPrompt, shouldSummarize } from '@/services/memory/summarizer';
import { upsertMemoryFact, updateSessionSummary, getPinnedChunks, getAllChunks } from '@/services/db/knowledge';
import { createReminder, parseReminderToolCall } from '@/services/db/reminders';
import { scheduleReminder } from '@/services/notifications/scheduler';

export type ChatStatus = 'idle' | 'thinking' | 'generating' | 'error';

const TOOL_RE = /\[TOOL:(web_search|fetch_url|set_reminder)\(([^)]*(?:\{[^}]*\})?[^)]*)\)\]/g;

export function useChat(sessionId: number, mode: AssistantMode = 'general') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [streamingText, setStreamingText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messageCountRef = useRef(0);

  const initMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
    messageCountRef.current = msgs.length;
  }, []);

  const send = useCallback(async (userText: string, allMessages: ChatMessage[]) => {
    if (!isChatModelLoaded()) {
      setErrorMsg('No model loaded. Go to Settings → download a model first.');
      return;
    }

    setStatus('thinking');
    setErrorMsg(null);
    setStreamingText('');

    const userMsg = await addMessage(sessionId, 'user', userText);
    const updatedMessages = [...allMessages, userMsg];
    setMessages(updatedMessages);
    messageCountRef.current = updatedMessages.length;

    // Auto-title on first message
    if (allMessages.length === 0) {
      generateCompletion(
        [{ role: 'user', content: `${TITLE_PROMPT}\n\nMessage: ${userText}` }],
        '',
      )
        .then((title) => updateSessionTitle(sessionId, title.trim().slice(0, 60)))
        .catch(() => {});
    }

    try {
      const { contextBlock, sourceIds } = await buildRAGContext(userText, mode);
      const systemPrompt = buildModeSystemPrompt(mode, contextBlock);

      const historyForLLM = updatedMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      setStatus('generating');

      // We pass the system prompt via the messages array (first message as system)
      const messagesWithSystem = [
        { role: 'system', content: systemPrompt },
        ...historyForLLM,
      ];

      let accumulated = '';
      let responseText = await generateCompletion(
        messagesWithSystem,
        '', // context is already baked into system prompt above
        (token) => {
          accumulated += token;
          setStreamingText(accumulated);
        },
      );

      // ── Tool use ─────────────────────────────────────────────────────────
      const toolMatches = [...responseText.matchAll(TOOL_RE)];
      let toolResults = '';
      const remindersCreated: string[] = [];

      for (const match of toolMatches) {
        const [, toolName, arg] = match;

        if (toolName === 'web_search') {
          const results = await webSearch(arg);
          toolResults += `\nWeb search for "${arg}":\n${formatSearchResults(results)}\n`;
        } else if (toolName === 'fetch_url') {
          const content = await fetchUrl(arg);
          toolResults += `\nPage content from ${arg}:\n${content}\n`;
        } else if (toolName === 'set_reminder') {
          const parsed = parseReminderToolCall(arg);
          if (parsed?.title && parsed.scheduled_at) {
            const reminder = await createReminder(parsed as any);
            await scheduleReminder(reminder).catch(() => {});
            remindersCreated.push(
              `"${reminder.title}" at ${new Date(reminder.scheduled_at).toLocaleString()}`,
            );
          }
        }
      }

      if (toolResults) {
        setStreamingText('');
        accumulated = '';
        const augmentedMessages = [
          { role: 'system', content: systemPrompt },
          ...historyForLLM,
          { role: 'assistant' as const, content: responseText },
          {
            role: 'user' as const,
            content: `Tool results:\n${toolResults}\n\nNow give a final helpful answer based on these results.`,
          },
        ];
        responseText = await generateCompletion(
          augmentedMessages,
          '',
          (token) => {
            accumulated += token;
            setStreamingText(accumulated);
          },
        );
      }

      // Append reminder confirmation to response
      if (remindersCreated.length > 0) {
        const confirmLine = `\n\n✅ Reminder set: ${remindersCreated.join(', ')}`;
        if (!responseText.includes('Reminder set')) {
          responseText += confirmLine;
        }
      }

      setStreamingText('');
      const assistantMsg = await addMessage(sessionId, 'assistant', responseText, sourceIds);
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      setStatus('idle');

      // ── Background memory & summarization (fire-and-forget) ──────────────
      runBackgroundMemoryTasks(sessionId, finalMessages, mode).catch(() => {});
    } catch (e) {
      setStreamingText('');
      setErrorMsg(String(e));
      setStatus('error');
    }
  }, [sessionId, mode]);

  return { messages, status, streamingText, errorMsg, initMessages, send };
}

async function runBackgroundMemoryTasks(
  sessionId: number,
  messages: ChatMessage[],
  mode: AssistantMode,
): Promise<void> {
  if (!isChatModelLoaded()) return;

  // ── 1. Rule-based fast fact extraction (no LLM cost) ──────────────────
  const fastFacts = extractFactsFromMessages(messages);
  if (fastFacts.length > 0) {
    const existingChunks = await getAllChunks();
    for (const fact of fastFacts) {
      const embedding = isEmbedModelLoaded() ? await embedText(fact.content).catch(() => []) : [];
      await upsertMemoryFact(fact.content, fact.category, embedding, existingChunks).catch(() => {});
    }
  }

  // ── 2. LLM-based deep extraction every 10 messages ────────────────────
  if (messages.length > 0 && messages.length % 10 === 0) {
    try {
      const prompt = buildExtractionPrompt(messages.slice(-20));
      const llmOutput = await generateCompletion([{ role: 'user', content: prompt }], '');
      const deepFacts = parseExtractedFacts(llmOutput);
      if (deepFacts.length > 0) {
        const existingChunks = await getAllChunks();
        for (const fact of deepFacts) {
          const embedding = isEmbedModelLoaded() ? await embedText(fact.content).catch(() => []) : [];
          await upsertMemoryFact(fact.content, fact.category, embedding, existingChunks).catch(() => {});
        }
      }
    } catch {
      // Non-critical
    }
  }

  // ── 3. Summarise session when it gets long ────────────────────────────
  if (shouldSummarize(messages) && messages.length % 8 === 0) {
    try {
      const allMsgs = await getMessages(sessionId);
      const sessionTitle = `${mode} session`;
      const summaryPrompt = buildSummaryPrompt(allMsgs, sessionTitle);
      const summary = await generateCompletion([{ role: 'user', content: summaryPrompt }], '');
      const trimmed = summary.trim();

      // Store summary in session record
      await updateSessionSummary(sessionId, trimmed);

      // Also store as a KB chunk so it's searchable
      const embedding = isEmbedModelLoaded() ? await embedText(trimmed).catch(() => []) : [];
      const existingChunks = await getAllChunks();
      await upsertMemoryFact(
        `Conversation summary (${new Date().toLocaleDateString()}): ${trimmed}`,
        'general',
        embedding,
        existingChunks,
      );
    } catch {
      // Non-critical
    }
  }
}
