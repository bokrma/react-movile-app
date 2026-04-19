import { AssistantMode } from '@/services/ai/scoring';

export interface ModeConfig {
  id: AssistantMode;
  label: string;
  icon: string;
  color: string;
  systemPromptAddition: string;
  preferredCategories: string[];
  tools: string[];
  memoryCategories: string[];
}

export const ASSISTANT_MODES: Record<AssistantMode, ModeConfig> = {
  general: {
    id: 'general',
    label: 'General Assistant',
    icon: 'sparkles',
    color: '#a855f7',
    systemPromptAddition: `You are a knowledgeable, helpful general assistant. You help with any task including research, writing, analysis, coding, and daily planning.`,
    preferredCategories: ['general', 'personal', 'preference', 'goal'],
    tools: ['web_search', 'fetch_url', 'set_reminder'],
    memoryCategories: ['personal', 'preference', 'goal'],
  },
  health: {
    id: 'health',
    label: 'Health Assistant',
    icon: 'heart',
    color: '#ef4444',
    systemPromptAddition: `You are a personal health and wellness assistant. You help track health metrics, medications, fitness goals, symptoms, and well-being.

IMPORTANT DISCLAIMERS:
- You are not a medical professional. Always recommend consulting a doctor for medical decisions.
- Do not diagnose conditions or prescribe treatments.
- You can provide general health education, track self-reported data, and remind about medications/appointments.

You excel at:
- Tracking symptoms, vitals, medications
- Suggesting healthy habits and fitness routines
- Reminding about medication times and doctor appointments
- Analysing health patterns from user-provided data
- Providing evidence-based wellness information`,
    preferredCategories: ['health', 'fitness', 'medication', 'mental_health', 'personal'],
    tools: ['web_search', 'fetch_url', 'set_reminder'],
    memoryCategories: ['health', 'personal'],
  },
  finance: {
    id: 'finance',
    label: 'Finance Assistant',
    icon: 'card',
    color: '#22c55e',
    systemPromptAddition: `You are a personal finance assistant. You help with budgeting, expense tracking, savings goals, investment concepts, and financial planning.

IMPORTANT:
- You are not a licensed financial advisor. Recommend professional advice for major decisions.
- You can help organise financial data, create budgets, explain financial concepts, and track goals.

You excel at:
- Budget planning and expense categorisation
- Savings goal tracking
- Explaining investment concepts (stocks, ETFs, bonds, crypto basics)
- Debt payoff strategies (avalanche, snowball)
- Financial habit coaching
- Bill and payment reminders`,
    preferredCategories: ['finance', 'budget', 'expense', 'investment', 'personal'],
    tools: ['web_search', 'fetch_url', 'set_reminder'],
    memoryCategories: ['finance', 'personal'],
  },
};

export const MODE_LIST = Object.values(ASSISTANT_MODES);

export function buildModeSystemPrompt(mode: AssistantMode, knowledgeContext: string): string {
  const config = ASSISTANT_MODES[mode];

  const toolDocs = `
## Available Tools
You can call these tools by including them in your response:
- [TOOL:web_search(query)] — search the internet for current information
- [TOOL:fetch_url(url)] — read the content of a web page
- [TOOL:set_reminder({"title":"...", "at":"ISO datetime or relative", "repeat":"daily|weekly|monthly", "category":"health|finance|general", "body":"..."})] — create a reminder

Use tools only when needed. For reminders, confirm with the user before creating.`;

  const knowledgePart = knowledgeContext
    ? `\n\n## What I Know About You\n${knowledgeContext}`
    : '';

  return `${config.systemPromptAddition}\n${toolDocs}${knowledgePart}`;
}
