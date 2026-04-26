/**
 * Specs apply.
 *
 * Applies a delta spec to a main spec, producing an updated main spec.
 * Handles ADDED, MODIFIED, REMOVED, and RENAMED operations on
 * requirement blocks identified by `### Requirement: <name>` headers.
 */

import { parseDeltaSpec } from './parsers/markdown-parser.js';
import type { RequirementBlock, RemovedRequirement, RenamedRequirement } from './parsers/markdown-parser.js';

const REQUIREMENT_HEADER = /^###\s+Requirement:\s*(.+)\s*$/;

// ---------------------------------------------------------------------------
// Helpers for markdown block manipulation
// ---------------------------------------------------------------------------

interface BlockSpan {
  readonly name: string;
  readonly startIndex: number;
  readonly endIndex: number;
}

/**
 * Find all requirement block spans in lines array.
 * Each span covers from the `### Requirement:` line to just before
 * the next requirement header or end-of-content.
 */
function findBlockSpans(lines: readonly string[]): readonly BlockSpan[] {
  const spans: BlockSpan[] = [];
  let currentName: string | null = null;
  let currentStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const match = REQUIREMENT_HEADER.exec(lines[i]);
    if (match) {
      if (currentName !== null) {
        spans.push({ name: currentName, startIndex: currentStart, endIndex: i });
      }
      currentName = match[1].trim();
      currentStart = i;
    }
  }

  if (currentName !== null) {
    spans.push({ name: currentName, startIndex: currentStart, endIndex: lines.length });
  }

  return spans;
}

/**
 * Rebuild a requirement block's markdown from a parsed RequirementBlock.
 */
function blockToMarkdown(block: RequirementBlock): string {
  const parts: string[] = [`### Requirement: ${block.name}`];

  if (block.description.trim()) {
    parts.push(block.description);
  }

  for (const scenario of block.scenarios) {
    parts.push('');
    parts.push(`#### Scenario: ${scenario.name}`);
    for (const w of scenario.when) {
      parts.push(`- **WHEN** ${w}`);
    }
    for (const t of scenario.then) {
      parts.push(`- **THEN** ${t}`);
    }
  }

  return parts.join('\n');
}

/**
 * Remove a requirement block from the lines array by name.
 * Returns a new array without the block, trimming excess blank lines.
 */
function removeBlock(lines: readonly string[], name: string): readonly string[] {
  const spans = findBlockSpans(lines);
  const target = spans.find((s) => s.name === name);

  if (!target) {
    return lines;
  }

  const before = lines.slice(0, target.startIndex);
  const after = lines.slice(target.endIndex);

  // Trim trailing blank lines from before and leading blank lines from after
  const trimmedBefore = trimTrailingBlanks(before);
  const trimmedAfter = trimLeadingBlanks(after);

  if (trimmedBefore.length === 0) {
    return trimmedAfter;
  }

  if (trimmedAfter.length === 0) {
    return trimmedBefore;
  }

  return [...trimmedBefore, '', ...trimmedAfter];
}

/**
 * Replace a requirement block's content in the lines array.
 * Returns a new array with the block replaced.
 */
function replaceBlock(
  lines: readonly string[],
  name: string,
  newBlock: RequirementBlock,
): readonly string[] {
  const spans = findBlockSpans(lines);
  const target = spans.find((s) => s.name === name);

  if (!target) {
    throw new Error(`Requirement "${name}" not found in main spec`);
  }

  const before = lines.slice(0, target.startIndex);
  const after = lines.slice(target.endIndex);
  const replacement = blockToMarkdown(newBlock).split('\n');

  return [...before, ...replacement, ...after];
}

/**
 * Rename a requirement header in the lines array.
 * Returns a new array with the header renamed.
 */
function renameBlock(
  lines: readonly string[],
  fromName: string,
  toName: string,
): readonly string[] {
  return lines.map((line) => {
    const match = REQUIREMENT_HEADER.exec(line);
    if (match && match[1].trim() === fromName) {
      return `### Requirement: ${toName}`;
    }
    return line;
  });
}

/**
 * Append a requirement block to the end of the lines array.
 */
function appendBlock(
  lines: readonly string[],
  block: RequirementBlock,
): readonly string[] {
  const trimmed = trimTrailingBlanks([...lines]);
  const markdown = blockToMarkdown(block);

  return [...trimmed, '', ...markdown.split('\n')];
}

function trimTrailingBlanks(lines: readonly string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }
  return result;
}

function trimLeadingBlanks(lines: readonly string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[0].trim() === '') {
    result.shift();
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply a delta spec to a main spec.
 *
 * Operations are applied in this order:
 * 1. RENAMED - rename requirement headers
 * 2. REMOVED - delete requirement blocks
 * 3. MODIFIED - replace requirement blocks
 * 4. ADDED - append new requirement blocks
 *
 * @param mainSpecContent - The raw markdown of the main spec
 * @param deltaContent - The raw markdown of the delta spec
 * @returns The updated main spec markdown
 * @throws When a MODIFIED target does not exist in the main spec
 */
export function applyDeltaSpec(mainSpecContent: string, deltaContent: string): string {
  const delta = parseDeltaSpec(deltaContent);
  const normalized = mainSpecContent.replace(/\r\n?/g, '\n');
  let lines: readonly string[] = normalized.split('\n');

  // 1. Apply RENAMED
  for (const rename of delta.renamed) {
    lines = renameBlock(lines, rename.from, rename.to);
  }

  // 2. Apply REMOVED
  for (const removed of delta.removed) {
    lines = removeBlock(lines, removed.name);
  }

  // 3. Apply MODIFIED
  for (const modified of delta.modified) {
    lines = replaceBlock(lines, modified.name, modified);
  }

  // 4. Apply ADDED
  for (const added of delta.added) {
    lines = appendBlock(lines, added);
  }

  return trimLeadingBlanks(trimTrailingBlanks([...lines])).join('\n') + '\n';
}
