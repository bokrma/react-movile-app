import { formatSearchResults, SearchResult } from '@/services/ai/webSearch';

describe('formatSearchResults', () => {
  it('formats results with title, snippet, and URL', () => {
    const results: SearchResult[] = [
      { title: 'Test Title', snippet: 'This is a snippet.', url: 'https://example.com' },
    ];
    const formatted = formatSearchResults(results);
    expect(formatted).toContain('Test Title');
    expect(formatted).toContain('This is a snippet.');
    expect(formatted).toContain('https://example.com');
    expect(formatted).toContain('1.');
  });

  it('numbers multiple results correctly', () => {
    const results: SearchResult[] = [
      { title: 'A', snippet: 'Snippet A', url: 'https://a.com' },
      { title: 'B', snippet: 'Snippet B', url: 'https://b.com' },
    ];
    const formatted = formatSearchResults(results);
    expect(formatted).toContain('1.');
    expect(formatted).toContain('2.');
  });

  it('returns "No search results found." for empty array', () => {
    expect(formatSearchResults([])).toBe('No search results found.');
  });
});
