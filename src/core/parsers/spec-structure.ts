/**
 * Spec structure parser.
 *
 * Parses a main spec markdown file into a structured ParsedSpec
 * containing typed requirements and their scenarios.
 */

import type { Scenario } from './markdown-parser.js';

export interface Requirement {
  readonly name: string;
  readonly description: string;
  readonly scenarios: readonly Scenario[];
}

export interface ParsedSpec {
  readonly requirements: readonly Requirement[];
}

const REQUIREMENT_HEADER = /^###\s+Requirement:\s*(.+)\s*$/;
const SCENARIO_HEADER = /^####\s+Scenario:\s*(.+)\s*$/;
const SECTION_BOUNDARY = /^##\s+/;
const WHEN_LINE = /^-\s+\*\*WHEN\*\*\s+(.+)$/;
const THEN_LINE = /^-\s+\*\*THEN\*\*\s+(.+)$/;

/**
 * Parse a main spec markdown file into a ParsedSpec.
 *
 * Extracts all requirements from the `## Requirements` section,
 * including their descriptions and scenarios.
 */
export function parseMainSpec(content: string): ParsedSpec {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  // Find the ## Requirements section
  const reqSectionIndex = lines.findIndex(
    (line) => /^##\s+Requirements\s*$/i.test(line)
  );

  if (reqSectionIndex === -1) {
    return { requirements: [] };
  }

  // Find the end of the Requirements section
  let endIndex = lines.length;
  for (let i = reqSectionIndex + 1; i < lines.length; i++) {
    if (SECTION_BOUNDARY.test(lines[i]) && !/^##\s+Requirements/i.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const sectionLines = lines.slice(reqSectionIndex + 1, endIndex);
  return { requirements: parseRequirements(sectionLines) };
}

function parseRequirements(lines: readonly string[]): readonly Requirement[] {
  const requirements: Requirement[] = [];
  let currentName: string | null = null;
  let descriptionLines: string[] = [];
  let scenarioLines: string[] = [];
  let inScenario = false;

  const flush = (): void => {
    if (currentName !== null) {
      requirements.push({
        name: currentName,
        description: descriptionLines.join('\n').trim(),
        scenarios: parseScenarios(scenarioLines),
      });
    }
  };

  for (const line of lines) {
    const reqMatch = REQUIREMENT_HEADER.exec(line);
    if (reqMatch) {
      flush();
      currentName = reqMatch[1].trim();
      descriptionLines = [];
      scenarioLines = [];
      inScenario = false;
      continue;
    }

    if (currentName === null) continue;

    if (SCENARIO_HEADER.test(line)) {
      inScenario = true;
    }

    if (inScenario) {
      scenarioLines.push(line);
    } else {
      descriptionLines.push(line);
    }
  }

  flush();
  return requirements;
}

function parseScenarios(lines: readonly string[]): readonly Scenario[] {
  const scenarios: Scenario[] = [];
  let current: { name: string; when: string[]; then: string[] } | null = null;

  for (const line of lines) {
    const scenarioMatch = SCENARIO_HEADER.exec(line);
    if (scenarioMatch) {
      if (current) {
        scenarios.push({ ...current });
      }
      current = { name: scenarioMatch[1].trim(), when: [], then: [] };
      continue;
    }

    if (!current) continue;

    const whenMatch = WHEN_LINE.exec(line);
    if (whenMatch) {
      current.when.push(whenMatch[1].trim());
      continue;
    }

    const thenMatch = THEN_LINE.exec(line);
    if (thenMatch) {
      current.then.push(thenMatch[1].trim());
    }
  }

  if (current) {
    scenarios.push({ ...current });
  }

  return scenarios;
}
