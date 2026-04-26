import { describe, it, expect } from 'vitest';
import {
  extractRequirementName,
  extractRequirementBlock,
} from '../../../src/core/parsers/requirement-blocks.js';

describe('requirement-blocks', () => {
  describe('extractRequirementName', () => {
    it('extracts the name from a requirement header', () => {
      const result = extractRequirementName('### Requirement: User Auth');
      expect(result).toBe('User Auth');
    });
  });

  describe('extractRequirementBlock', () => {
    it('extracts full block from ### through scenarios until next ### or ##', () => {
      const content = [
        '## Requirements',
        '',
        '### Requirement: User Auth',
        'Users must authenticate before access.',
        '',
        '#### Scenario: Valid login',
        '- **WHEN** user enters valid credentials',
        '- **THEN** system grants access',
        '',
        '### Requirement: Data Export',
        'Users can export data.',
      ].join('\n');

      const block = extractRequirementBlock(content, 'User Auth');
      expect(block).toContain('### Requirement: User Auth');
      expect(block).toContain('Users must authenticate before access.');
      expect(block).toContain('#### Scenario: Valid login');
      expect(block).toContain('system grants access');
      expect(block).not.toContain('Data Export');
    });

    it('extracts block that includes multiple scenarios', () => {
      const content = [
        '### Requirement: Multi Scenario',
        'Feature with multiple scenarios.',
        '',
        '#### Scenario: First',
        '- **WHEN** user does A',
        '- **THEN** result is X',
        '',
        '#### Scenario: Second',
        '- **WHEN** user does B',
        '- **THEN** result is Y',
        '',
        '## Next Section',
      ].join('\n');

      const block = extractRequirementBlock(content, 'Multi Scenario');
      expect(block).toContain('#### Scenario: First');
      expect(block).toContain('#### Scenario: Second');
      expect(block).toContain('result is Y');
      expect(block).not.toContain('Next Section');
    });
  });
});
