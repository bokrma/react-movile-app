import { parseReminderToolCall, parseDatetime } from '@/services/db/reminders';

describe('parseDatetime', () => {
  const NOW = Date.now();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('parses ISO 8601 datetime', () => {
    const ts = parseDatetime('2025-06-20T14:30:00Z');
    const d = new Date(ts);
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(5); // June
    expect(d.getUTCDate()).toBe(20);
  });

  it('parses "in X minutes"', () => {
    const ts = parseDatetime('in 30 minutes');
    const diff = ts - Date.now();
    expect(diff).toBeCloseTo(30 * 60_000, -4);
  });

  it('parses "in X hours"', () => {
    const ts = parseDatetime('in 2 hours');
    const diff = ts - Date.now();
    expect(diff).toBeCloseTo(2 * 3_600_000, -4);
  });

  it('parses "in X days"', () => {
    const ts = parseDatetime('in 3 days');
    const diff = ts - Date.now();
    expect(diff).toBeCloseTo(3 * 86_400_000, -4);
  });

  it('parses "tomorrow at HH:MM"', () => {
    const ts = parseDatetime('tomorrow at 09:00');
    const d = new Date(ts);
    // Should be tomorrow at 9am local
    const tomorrow = new Date(Date.now() + 86_400_000);
    expect(d.getDate()).toBe(tomorrow.getDate());
  });

  it('parses "today at HH:MM" — returns future time', () => {
    const ts = parseDatetime('today at 15:00');
    expect(ts).toBeGreaterThan(Date.now());
  });

  it('returns ~1 hour from now for empty input', () => {
    const ts = parseDatetime('');
    const diff = ts - Date.now();
    expect(diff).toBeCloseTo(3_600_000, -4);
  });

  it('returns ~1 hour from now for unparseable input', () => {
    const ts = parseDatetime('next purple moon');
    const diff = ts - Date.now();
    expect(diff).toBeCloseTo(3_600_000, -4);
  });
});

describe('parseReminderToolCall', () => {
  it('parses JSON format', () => {
    const arg = '{"title": "Take medication", "at": "in 2 hours", "category": "health", "body": "Metformin 500mg"}';
    const result = parseReminderToolCall(arg);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Take medication');
    expect(result!.body).toBe('Metformin 500mg');
    expect(result!.category).toBe('health');
  });

  it('parses comma-separated format', () => {
    const arg = 'Doctor appointment, in 3 days, weekly';
    const result = parseReminderToolCall(arg);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Doctor appointment');
    expect(result!.repeat_interval).toBe('weekly');
  });

  it('returns null for empty input', () => {
    expect(parseReminderToolCall('')).toBeNull();
  });

  it('returns null for comma-separated with only one part', () => {
    expect(parseReminderToolCall('just a title')).toBeNull();
  });

  it('accepts "at" and "time" aliases in JSON', () => {
    const arg = '{"title": "Budget review", "time": "in 1 day", "category": "finance"}';
    const result = parseReminderToolCall(arg);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Budget review');
    expect(result!.category).toBe('finance');
  });

  it('uses default category when not specified', () => {
    const arg = '{"title": "Check email", "at": "in 1 hour"}';
    const result = parseReminderToolCall(arg);
    expect(result!.category).toBe('general');
  });

  it('parses repeat interval from JSON', () => {
    const arg = '{"title": "Daily standup", "at": "tomorrow at 09:00", "repeat": "daily"}';
    const result = parseReminderToolCall(arg);
    expect(result!.repeat_interval).toBe('daily');
  });
});
