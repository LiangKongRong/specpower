import { describe, it, expect } from 'vitest';
import { loadTemplate } from '../../../src/core/templates/index.js';

describe('template system', () => {
  it('loadTemplate("proposal") returns string containing "## Why"', async () => {
    const content = await loadTemplate('proposal');
    expect(typeof content).toBe('string');
    expect(content).toContain('## Why');
  });

  it('loadTemplate("nonexistent") throws error containing "not found"', async () => {
    // @ts-expect-error — intentionally passing invalid template id
    await expect(loadTemplate('nonexistent')).rejects.toThrow(/not found/i);
  });
});
