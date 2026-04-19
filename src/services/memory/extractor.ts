import { ChatMessage } from '@/types/chat';

export type FactCategory = 'health' | 'finance' | 'personal' | 'preference' | 'goal' | 'general';

export interface ExtractedFact {
  content: string;
  category: FactCategory;
  confidence: number;
}

// ── Rule-based fast extraction (no LLM needed) ─────────────────────────────

const FACT_PATTERNS: Array<{ pattern: RegExp; category: FactCategory; template: string }> = [
  // Health
  { pattern: /i (?:have|suffer from|was diagnosed with) ([^.!?,]{3,60})/i, category: 'health', template: 'User has {1}' },
  { pattern: /i (?:take|am taking) ([^.!?,]{3,40}) (?:medication|medicine|pills?|mg)/i, category: 'health', template: 'User takes {1}' },
  { pattern: /my (?:blood pressure|bp) is ([^.!?,]{2,20})/i, category: 'health', template: 'Blood pressure: {1}' },
  { pattern: /i (?:weigh|am) (\d+\s*(?:kg|lbs?|pounds?))/i, category: 'health', template: 'User weight: {1}' },
  { pattern: /i am (\d+) years old/i, category: 'personal', template: 'User age: {1}' },
  { pattern: /my (?:doctor|physician) (?:is|told me) ([^.!?,]{3,60})/i, category: 'health', template: 'Medical: {1}' },
  { pattern: /i (?:exercise|work out) ([^.!?,]{3,50})/i, category: 'health', template: 'Exercise habit: {1}' },
  { pattern: /i (?:smoke|drink|vape)/i, category: 'health', template: 'Health behaviour noted' },
  { pattern: /(?:allergic to|allergy to) ([^.!?,]{3,40})/i, category: 'health', template: 'Allergy: {1}' },

  // Finance
  { pattern: /(?:i earn|my salary is|i make) ([^.!?,]{3,40})/i, category: 'finance', template: 'Income: {1}' },
  { pattern: /(?:my budget|monthly budget) (?:is|for) ([^.!?,]{3,60})/i, category: 'finance', template: 'Budget: {1}' },
  { pattern: /i (?:spend|pay) ([^.!?,]{3,50}) (?:on|for) ([^.!?,]{3,40})/i, category: 'finance', template: 'Expense: {1} on {2}' },
  { pattern: /(?:i (?:owe|have) a? ?(?:debt|loan|mortgage) of) ([^.!?,]{3,40})/i, category: 'finance', template: 'Debt: {1}' },
  { pattern: /i (?:save|invest|put away) ([^.!?,]{3,40}) (?:per month|monthly|each month)/i, category: 'finance', template: 'Savings: {1}/month' },
  { pattern: /(?:my (?:bank|account|savings)) (?:has|balance is) ([^.!?,]{3,40})/i, category: 'finance', template: 'Balance: {1}' },
  { pattern: /i (?:invest(?:ed|ing)? in) ([^.!?,]{3,60})/i, category: 'finance', template: 'Investment: {1}' },

  // Personal
  { pattern: /(?:i live in|i'm (?:from|in|based in)) ([^.!?,]{2,40})/i, category: 'personal', template: 'Location: {1}' },
  { pattern: /i (?:work (?:at|for)|am employed at) ([^.!?,]{3,60})/i, category: 'personal', template: 'Employer: {1}' },
  { pattern: /i (?:have|am a parent to) (\d+) (?:kids?|children|sons?|daughters?)/i, category: 'personal', template: 'Has {1} children' },
  { pattern: /i (?:am|was) (?:married|divorced|single|widowed)/i, category: 'personal', template: 'Relationship status noted' },
  { pattern: /my (?:partner|wife|husband|spouse) (?:is|works as) ([^.!?,]{3,60})/i, category: 'personal', template: 'Partner info: {1}' },
  { pattern: /my name is ([^.!?,]{2,30})/i, category: 'personal', template: 'Name: {1}' },

  // Preferences
  { pattern: /i (?:prefer|love|like|enjoy) ([^.!?,]{3,60})/i, category: 'preference', template: 'Prefers: {1}' },
  { pattern: /i (?:hate|dislike|don't like) ([^.!?,]{3,60})/i, category: 'preference', template: 'Dislikes: {1}' },
  { pattern: /my (?:favourite|favorite) ([^.!?,]{2,30}) is ([^.!?,]{2,40})/i, category: 'preference', template: 'Favourite {1}: {2}' },

  // Goals
  { pattern: /(?:i want to|my goal is to|i (?:am )?trying to) ([^.!?,]{5,80})/i, category: 'goal', template: 'Goal: {1}' },
  { pattern: /(?:i (?:plan|intend) to) ([^.!?,]{5,80})/i, category: 'goal', template: 'Plan: {1}' },
];

export function extractFactsFromMessages(messages: ChatMessage[]): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const userMessages = messages.filter((m) => m.role === 'user');

  for (const msg of userMessages) {
    const text = msg.content;

    for (const { pattern, category, template } of FACT_PATTERNS) {
      const match = text.match(pattern);
      if (!match) continue;

      let content = template;
      for (let i = 1; i < match.length; i++) {
        if (match[i]) content = content.replace(`{${i}}`, match[i].trim());
      }

      // Skip if any placeholder was not replaced
      if (content.length < 8 || /\{\d+\}/.test(content)) continue;

      facts.push({ content, category, confidence: 0.85 });
    }
  }

  return deduplicateFacts(facts);
}

function deduplicateFacts(facts: ExtractedFact[]): ExtractedFact[] {
  const seen = new Set<string>();
  return facts.filter((f) => {
    const key = f.content.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── LLM-based deep extraction prompt ──────────────────────────────────────

export function buildExtractionPrompt(messages: ChatMessage[]): string {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  return `Analyze this conversation and extract NEW factual information about the user.
Focus on: health conditions, medications, finances, location, family, work, goals, and preferences.
Only extract FACTS explicitly stated by the user (not hypotheticals or questions).

Conversation:
${conversation.slice(0, 3000)}

Respond with a JSON array of facts, each with { "content": "fact as a sentence", "category": "health|finance|personal|preference|goal" }.
If no new facts, respond with [].
JSON:`;
}

export function parseExtractedFacts(llmOutput: string): ExtractedFact[] {
  try {
    const jsonMatch = llmOutput.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((f: any) => f && typeof f.content === 'string' && f.content.length > 5)
      .map((f: any) => ({
        content: String(f.content).trim(),
        category: validateCategory(f.category),
        confidence: 0.9,
      }));
  } catch {
    return [];
  }
}

function validateCategory(cat: string): FactCategory {
  const valid: FactCategory[] = ['health', 'finance', 'personal', 'preference', 'goal', 'general'];
  return valid.includes(cat as FactCategory) ? (cat as FactCategory) : 'general';
}
