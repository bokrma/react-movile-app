import {
  extractFactsFromMessages, parseExtractedFacts,
  buildExtractionPrompt, FactCategory,
} from '@/services/memory/extractor';
import {
  buildSummaryPrompt, shouldSummarize, parseSummary,
} from '@/services/memory/summarizer';
import { ChatMessage } from '@/types/chat';

function makeMsg(role: 'user' | 'assistant', content: string, id = 1): ChatMessage {
  return { id, session_id: 1, role, content, sources: [], created_at: Date.now() };
}

describe('extractFactsFromMessages', () => {
  it('extracts age from user message', () => {
    const msgs = [makeMsg('user', 'I am 35 years old')];
    const facts = extractFactsFromMessages(msgs);
    expect(facts.some((f) => f.content.includes('35') && f.category === 'personal')).toBe(true);
  });

  it('extracts health condition', () => {
    const msgs = [makeMsg('user', 'I have type 2 diabetes')];
    const facts = extractFactsFromMessages(msgs);
    expect(facts.some((f) => f.category === 'health')).toBe(true);
  });

  it('extracts medication', () => {
    const msgs = [makeMsg('user', 'I take metformin medication daily')];
    const facts = extractFactsFromMessages(msgs);
    expect(facts.some((f) => f.category === 'health' && f.content.toLowerCase().includes('metformin'))).toBe(true);
  });

  it('extracts location', () => {
    const msgs = [makeMsg('user', "I live in New York City")];
    const facts = extractFactsFromMessages(msgs);
    expect(facts.some((f) => f.category === 'personal' && f.content.includes('New York'))).toBe(true);
  });

  it('extracts financial information', () => {
    const msgs = [makeMsg('user', 'I earn $5000 per month')];
    const facts = extractFactsFromMessages(msgs);
    expect(facts.some((f) => f.category === 'finance')).toBe(true);
  });

  it('extracts preferences', () => {
    const msgs = [makeMsg('user', 'I love hiking and outdoor activities')];
    const facts = extractFactsFromMessages(msgs);
    expect(facts.some((f) => f.category === 'preference')).toBe(true);
  });

  it('ignores assistant messages', () => {
    const msgs = [makeMsg('assistant', 'I have type 2 diabetes — did you know?')];
    const facts = extractFactsFromMessages(msgs);
    // AI messages should not generate user facts
    expect(facts.length).toBe(0);
  });

  it('deduplicates identical facts', () => {
    const msgs = [
      makeMsg('user', 'I live in London', 1),
      makeMsg('user', 'I live in London', 2),
    ];
    const facts = extractFactsFromMessages(msgs);
    const locationFacts = facts.filter((f) => f.content.includes('London'));
    expect(locationFacts.length).toBe(1);
  });

  it('extracts goal', () => {
    const msgs = [makeMsg('user', 'I want to lose 10kg in 3 months')];
    const facts = extractFactsFromMessages(msgs);
    expect(facts.some((f) => f.category === 'goal')).toBe(true);
  });

  it('returns empty array for empty messages', () => {
    expect(extractFactsFromMessages([])).toEqual([]);
  });
});

describe('parseExtractedFacts', () => {
  it('parses valid JSON array from LLM output', () => {
    const output = `[
      {"content": "User has hypertension", "category": "health"},
      {"content": "User prefers concise answers", "category": "preference"}
    ]`;
    const facts = parseExtractedFacts(output);
    expect(facts.length).toBe(2);
    expect(facts[0].content).toBe('User has hypertension');
    expect(facts[0].category).toBe('health');
    expect(facts[1].category).toBe('preference');
  });

  it('handles LLM output with text before/after JSON', () => {
    const output = `Here are the facts I found:
    [{"content": "User is 42 years old", "category": "personal"}]
    That's all.`;
    const facts = parseExtractedFacts(output);
    expect(facts.length).toBe(1);
    expect(facts[0].content).toBe('User is 42 years old');
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseExtractedFacts('No facts here at all.')).toEqual([]);
  });

  it('returns empty array for empty response', () => {
    expect(parseExtractedFacts('[]')).toEqual([]);
  });

  it('validates category field', () => {
    const output = '[{"content": "Some fact", "category": "invalid_category"}]';
    const facts = parseExtractedFacts(output);
    expect(facts[0].category).toBe('general');
  });

  it('filters out facts with short content', () => {
    const output = '[{"content": "hi", "category": "personal"}]';
    expect(parseExtractedFacts(output)).toEqual([]);
  });

  it('assigns confidence 0.9 to all parsed facts', () => {
    const output = '[{"content": "User works as a software engineer", "category": "personal"}]';
    const facts = parseExtractedFacts(output);
    expect(facts[0].confidence).toBe(0.9);
  });
});

describe('buildExtractionPrompt', () => {
  it('includes conversation content in prompt', () => {
    const msgs = [
      makeMsg('user', 'I have high blood pressure'),
      makeMsg('assistant', 'That is an important health concern.'),
    ];
    const prompt = buildExtractionPrompt(msgs);
    expect(prompt).toContain('high blood pressure');
    expect(prompt).toContain('User:');
    expect(prompt).toContain('AI:');
  });

  it('truncates very long conversations', () => {
    const longMsg = makeMsg('user', 'x'.repeat(5000));
    const prompt = buildExtractionPrompt([longMsg]);
    expect(prompt.length).toBeLessThan(6000); // not excessively long
  });
});

describe('shouldSummarize', () => {
  it('returns false for short conversations', () => {
    const msgs = Array.from({ length: 5 }, (_, i) => makeMsg('user', 'hi', i));
    expect(shouldSummarize(msgs)).toBe(false);
  });

  it('returns true for conversations with 6+ messages', () => {
    const msgs = Array.from({ length: 6 }, (_, i) => makeMsg('user', 'hi', i));
    expect(shouldSummarize(msgs)).toBe(true);
  });
});

describe('parseSummary', () => {
  it('trims whitespace from summary', () => {
    expect(parseSummary('  hello  ')).toBe('hello');
  });

  it('truncates very long summaries', () => {
    const long = 'a'.repeat(2000);
    expect(parseSummary(long).length).toBeLessThanOrEqual(1000);
  });
});

describe('buildSummaryPrompt', () => {
  it('includes session title and messages', () => {
    const msgs = [
      makeMsg('user', 'I need help with my diet'),
      makeMsg('assistant', 'I can help with nutritional advice.'),
    ];
    const prompt = buildSummaryPrompt(msgs, 'Health Chat');
    expect(prompt).toContain('Health Chat');
    expect(prompt).toContain('diet');
  });
});
