/**
 * Requirement-blocks parser.
 *
 * Utilities for extracting individual requirement names and blocks
 * from markdown content.
 */

const REQUIREMENT_HEADER = /^###\s+Requirement:\s*(.+)\s*$/;
const SECTION_BOUNDARY = /^##\s+/;
const NEXT_REQUIREMENT = /^###\s+Requirement:\s*/;

/**
 * Extract the requirement name from a `### Requirement: <name>` header line.
 * Returns the trimmed name, or an empty string if the line is not a valid header.
 */
export function extractRequirementName(header: string): string {
  const match = REQUIREMENT_HEADER.exec(header.trim());
  return match ? match[1].trim() : '';
}

/**
 * Extract the full block for a named requirement from markdown content.
 *
 * The block starts at `### Requirement: <name>` and extends through all
 * content (including scenarios) until the next `### Requirement:` header,
 * a `## ` section header, or end-of-content.
 *
 * Returns the block as a trimmed string, or an empty string if not found.
 */
export function extractRequirementBlock(content: string, name: string): string {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  // Find the header line for this requirement
  const targetPattern = new RegExp(
    `^###\\s+Requirement:\\s*${escapeRegExp(name)}\\s*$`
  );

  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (targetPattern.test(lines[i])) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    return '';
  }

  // Collect lines until a boundary
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (NEXT_REQUIREMENT.test(lines[i]) || SECTION_BOUNDARY.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join('\n').trimEnd();
}

/**
 * Escape special regex characters in a string for use in a RegExp constructor.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
