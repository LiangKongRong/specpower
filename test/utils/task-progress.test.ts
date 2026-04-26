import { describe, it, expect } from 'vitest';
import {
  parseTask,
  toggleTask,
  countTasks,
} from '../../src/utils/task-progress.js';

describe('task-progress utilities', () => {
  describe('parseTask', () => {
    it('parses a pending task', () => {
      const result = parseTask('- [ ] 1.1 Task name');
      expect(result).toEqual({ id: '1.1', status: 'pending', text: 'Task name' });
    });

    it('parses a completed task', () => {
      const result = parseTask('- [x] 1.1 Task name');
      expect(result).toEqual({ id: '1.1', status: 'completed', text: 'Task name' });
    });

    it('parses a task with uppercase X', () => {
      const result = parseTask('- [X] 2.3 Another task');
      expect(result).toEqual({ id: '2.3', status: 'completed', text: 'Another task' });
    });

    it('parses a task with multi-level numbering', () => {
      const result = parseTask('- [ ] 10.2.1 Deep task');
      expect(result).toEqual({ id: '10.2.1', status: 'pending', text: 'Deep task' });
    });

    it('returns null for non-task lines', () => {
      expect(parseTask('Just a paragraph')).toBeNull();
      expect(parseTask('## Heading')).toBeNull();
      expect(parseTask('')).toBeNull();
    });

    it('handles tasks using asterisk bullet', () => {
      const result = parseTask('* [ ] 3.1 Star task');
      expect(result).toEqual({ id: '3.1', status: 'pending', text: 'Star task' });
    });
  });

  describe('toggleTask', () => {
    it('flips a pending task to completed', () => {
      const content = '- [ ] 1.1 First task\n- [ ] 1.2 Second task';
      const result = toggleTask('1.1', content);
      expect(result).toContain('- [x] 1.1 First task');
      expect(result).toContain('- [ ] 1.2 Second task');
    });

    it('flips a completed task to pending', () => {
      const content = '- [x] 1.1 First task\n- [ ] 1.2 Second task';
      const result = toggleTask('1.1', content);
      expect(result).toContain('- [ ] 1.1 First task');
      expect(result).toContain('- [ ] 1.2 Second task');
    });

    it('returns content unchanged when task id not found', () => {
      const content = '- [ ] 1.1 First task';
      const result = toggleTask('9.9', content);
      expect(result).toBe(content);
    });
  });

  describe('countTasks', () => {
    it('counts tasks in content', () => {
      const content = [
        '# Tasks',
        '- [x] 1.1 Done task',
        '- [ ] 1.2 Pending task',
        '- [x] 1.3 Another done',
        'Some text',
      ].join('\n');

      const result = countTasks(content);
      expect(result).toEqual({ total: 3, completed: 2, pending: 1 });
    });

    it('returns zeros for content with no tasks', () => {
      const content = '# Just a heading\nSome text\n';
      const result = countTasks(content);
      expect(result).toEqual({ total: 0, completed: 0, pending: 0 });
    });

    it('handles empty content', () => {
      const result = countTasks('');
      expect(result).toEqual({ total: 0, completed: 0, pending: 0 });
    });

    it('counts all pending correctly', () => {
      const content = '- [ ] 1.1 A\n- [ ] 1.2 B\n';
      const result = countTasks(content);
      expect(result).toEqual({ total: 2, completed: 0, pending: 2 });
    });
  });
});
