// Test the pure utility functions exported from the knowledge service
// (DB interactions are tested via integration, pure functions tested here)
import { cosineSimilarity } from '@/services/ai/scoring';

describe('Knowledge DB utilities (via scoring)', () => {
  describe('cosineSimilarity used for deduplication', () => {
    it('identifies duplicate facts at threshold 0.92', () => {
      const vec1 = Array(16).fill(0).map((_, i) => Math.sin(i));
      const vec2 = vec1.map((v) => v + 0.001); // very similar
      const sim = cosineSimilarity(vec1, vec2);
      expect(sim).toBeGreaterThan(0.92);
    });

    it('identifies dissimilar facts below threshold', () => {
      const vec1 = [1, 0, 0, 0, 0, 0, 0, 0];
      const vec2 = [0, 0, 0, 0, 0, 0, 0, 1];
      const sim = cosineSimilarity(vec1, vec2);
      expect(sim).toBeLessThan(0.92);
    });
  });
});
