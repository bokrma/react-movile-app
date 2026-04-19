import { ASSISTANT_MODES, buildModeSystemPrompt, MODE_LIST } from '@/constants/AssistantModes';

describe('AssistantModes', () => {
  it('defines all three modes', () => {
    expect(ASSISTANT_MODES.general).toBeDefined();
    expect(ASSISTANT_MODES.health).toBeDefined();
    expect(ASSISTANT_MODES.finance).toBeDefined();
  });

  it('MODE_LIST has 3 entries', () => {
    expect(MODE_LIST.length).toBe(3);
  });

  it('health mode system prompt includes disclaimer', () => {
    expect(ASSISTANT_MODES.health.systemPromptAddition).toContain('medical professional');
  });

  it('finance mode system prompt includes disclaimer', () => {
    expect(ASSISTANT_MODES.finance.systemPromptAddition).toContain('financial advisor');
  });

  it('all modes have icons and colors', () => {
    for (const mode of MODE_LIST) {
      expect(mode.icon).toBeTruthy();
      expect(mode.color).toMatch(/^#/);
    }
  });
});

describe('buildModeSystemPrompt', () => {
  it('includes tool documentation', () => {
    const prompt = buildModeSystemPrompt('general', '');
    expect(prompt).toContain('[TOOL:web_search');
    expect(prompt).toContain('[TOOL:set_reminder');
  });

  it('injects knowledge context when provided', () => {
    const prompt = buildModeSystemPrompt('health', 'User has diabetes');
    expect(prompt).toContain('User has diabetes');
    expect(prompt).toContain('What I Know About You');
  });

  it('omits knowledge section when context is empty', () => {
    const prompt = buildModeSystemPrompt('general', '');
    expect(prompt).not.toContain('What I Know About You');
  });

  it('health mode adds health-specific instructions', () => {
    const prompt = buildModeSystemPrompt('health', '');
    expect(prompt).toContain('wellness');
  });

  it('finance mode adds finance-specific instructions', () => {
    const prompt = buildModeSystemPrompt('finance', '');
    expect(prompt).toContain('budget');
  });
});
