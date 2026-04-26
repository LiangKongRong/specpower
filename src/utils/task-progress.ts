/**
 * Represents a parsed task line from a markdown task list.
 */
export interface ParsedTask {
  readonly id: string;
  readonly status: 'pending' | 'completed';
  readonly text: string;
}

/**
 * Summary of task counts in a document.
 */
export interface TaskCount {
  readonly total: number;
  readonly completed: number;
  readonly pending: number;
}

// Matches lines like: - [ ] 1.1 Task name  or  * [x] 2.3 Another task
const TASK_LINE_PATTERN = /^[-*]\s+\[([\sx])\]\s+(\d+(?:\.\d+)*)\s+(.+)$/i;

// Matches any task checkbox line (for counting)
const TASK_CHECKBOX_PATTERN = /^[-*]\s+\[[\sx]\]/i;
const COMPLETED_CHECKBOX_PATTERN = /^[-*]\s+\[x\]/i;

/**
 * Parses a single line into a ParsedTask, or returns null if the line is not a task.
 *
 * @param line - A single line of markdown text
 * @returns The parsed task, or null for non-task lines
 */
export function parseTask(line: string): ParsedTask | null {
  const match = line.match(TASK_LINE_PATTERN);
  if (!match) {
    return null;
  }

  const [, checkbox, id, text] = match;
  const status: 'pending' | 'completed' =
    checkbox.toLowerCase() === 'x' ? 'completed' : 'pending';

  return { id, status, text };
}

/**
 * Toggles the checkbox state of a task identified by its id.
 * Returns a new string with the toggled content (immutable).
 *
 * @param taskId - The task id to toggle (e.g. "1.1")
 * @param content - The full markdown content
 * @returns New content with the task toggled, or the original content if not found
 */
export function toggleTask(taskId: string, content: string): string {
  const lines = content.split('\n');
  const updatedLines = lines.map((line) => {
    const task = parseTask(line);
    if (task === null || task.id !== taskId) {
      return line;
    }

    if (task.status === 'pending') {
      return line.replace(/\[ \]/, '[x]');
    }
    return line.replace(/\[[xX]\]/, '[ ]');
  });

  return updatedLines.join('\n');
}

/**
 * Counts total, completed, and pending tasks in markdown content.
 *
 * @param content - The full markdown content
 * @returns An object with total, completed, and pending counts
 */
export function countTasks(content: string): TaskCount {
  const lines = content.split('\n');
  let total = 0;
  let completed = 0;

  for (const line of lines) {
    if (TASK_CHECKBOX_PATTERN.test(line)) {
      total++;
      if (COMPLETED_CHECKBOX_PATTERN.test(line)) {
        completed++;
      }
    }
  }

  return { total, completed, pending: total - completed };
}
