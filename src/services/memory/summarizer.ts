import { ChatMessage } from '@/types/chat';

export function buildSummaryPrompt(messages: ChatMessage[], sessionTitle: string): string {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  return `Summarize this conversation titled "${sessionTitle}" in 3-5 concise bullet points.
Focus on: key topics discussed, decisions made, information the user shared, and any action items.
Write from a third-person perspective about the user.

Conversation:
${conversation.slice(0, 4000)}

Summary (bullet points):`;
}

export function buildHealthBriefPrompt(messages: ChatMessage[]): string {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  return `Extract a health-focused brief from this conversation.
Include: symptoms mentioned, medications discussed, health goals, medical advice given.
Be factual and concise.

${conversation.slice(0, 3000)}

Health brief:`;
}

export function buildFinanceBriefPrompt(messages: ChatMessage[]): string {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  return `Extract a finance-focused brief from this conversation.
Include: financial goals, expenses discussed, budgets, investment topics, action items.
Be factual and concise.

${conversation.slice(0, 3000)}

Finance brief:`;
}

export function parseSummary(llmOutput: string): string {
  // Trim and normalize the AI's summary output
  return llmOutput.trim().slice(0, 1000);
}

export function shouldSummarize(messages: ChatMessage[]): boolean {
  return messages.length >= 6;
}
