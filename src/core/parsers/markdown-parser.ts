/**
 * Markdown delta-spec parser.
 *
 * Parses a delta-spec markdown file into structured data with
 * ADDED, MODIFIED, REMOVED, and RENAMED sections.
 */

export interface Scenario {
  readonly name: string;
  readonly when: readonly string[];
  readonly then: readonly string[];
}

export interface RequirementBlock {
  readonly name: string;
  readonly description: string;
  readonly scenarios: readonly Scenario[];
}

export interface RemovedRequirement {
  readonly name: string;
  readonly reason: string;
  readonly migration: string;
}

export interface RenamedRequirement {
  readonly from: string;
  readonly to: string;
}

export interface DeltaSpec {
  readonly added: readonly RequirementBlock[];
  readonly modified: readonly RequirementBlock[];
  readonly removed: readonly RemovedRequirement[];
  readonly renamed: readonly RenamedRequirement[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SECTION_HEADER = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i;
const REQUIREMENT_HEADER = /^###\s+Requirement:\s*(.+)\s*$/;
const SCENARIO_HEADER = /^####\s+Scenario:\s*(.+)\s*$/;
const WHEN_LINE = /^-\s+\*\*WHEN\*\*\s+(.+)$/;
const THEN_LINE = /^-\s+\*\*THEN\*\*\s+(.+)$/;
const REASON_LINE = /^\*\*Reason\*\*:\s*(.+)$/;
const MIGRATION_LINE = /^\*\*Migration\*\*:\s*(.+)$/;
const FROM_LINE = /^FROM:\s*(.+)$/;
const TO_LINE = /^TO:\s*(.+)$/;

interface RawSection {
  readonly kind: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED';
  readonly lines: readonly string[];
}

function splitSections(content: string): readonly RawSection[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const sections: RawSection[] = [];
  let current: { kind: RawSection['kind']; lines: string[] } | null = null;

  for (const line of lines) {
    const match = SECTION_HEADER.exec(line);
    if (match) {
      if (current) {
        sections.push({ kind: current.kind, lines: current.lines });
      }
      current = {
        kind: match[1].toUpperCase() as RawSection['kind'],
        lines: [],
      };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    sections.push({ kind: current.kind, lines: current.lines });
  }

  return sections;
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

function parseRequirementBlocks(lines: readonly string[]): readonly RequirementBlock[] {
  const blocks: RequirementBlock[] = [];
  let currentName: string | null = null;
  let blockLines: string[] = [];

  const flush = (): void => {
    if (currentName !== null) {
      const descriptionLines: string[] = [];
      const scenarioLines: string[] = [];
      let inScenario = false;

      for (const l of blockLines) {
        if (SCENARIO_HEADER.test(l)) {
          inScenario = true;
        }
        if (inScenario) {
          scenarioLines.push(l);
        } else {
          descriptionLines.push(l);
        }
      }

      blocks.push({
        name: currentName,
        description: descriptionLines
          .join('\n')
          .trim(),
        scenarios: parseScenarios(scenarioLines),
      });
    }
  };

  for (const line of lines) {
    const reqMatch = REQUIREMENT_HEADER.exec(line);
    if (reqMatch) {
      flush();
      currentName = reqMatch[1].trim();
      blockLines = [];
      continue;
    }
    blockLines.push(line);
  }

  flush();
  return blocks;
}

function parseRemovedRequirements(lines: readonly string[]): readonly RemovedRequirement[] {
  const removed: RemovedRequirement[] = [];
  let currentName: string | null = null;
  let reason = '';
  let migration = '';

  const flush = (): void => {
    if (currentName !== null) {
      removed.push({ name: currentName, reason, migration });
    }
  };

  for (const line of lines) {
    const reqMatch = REQUIREMENT_HEADER.exec(line);
    if (reqMatch) {
      flush();
      currentName = reqMatch[1].trim();
      reason = '';
      migration = '';
      continue;
    }

    const reasonMatch = REASON_LINE.exec(line);
    if (reasonMatch) {
      reason = reasonMatch[1].trim();
      continue;
    }

    const migrationMatch = MIGRATION_LINE.exec(line);
    if (migrationMatch) {
      migration = migrationMatch[1].trim();
    }
  }

  flush();
  return removed;
}

function parseRenamedRequirements(lines: readonly string[]): readonly RenamedRequirement[] {
  const renamed: RenamedRequirement[] = [];
  let from: string | null = null;

  for (const line of lines) {
    const fromMatch = FROM_LINE.exec(line);
    if (fromMatch) {
      from = fromMatch[1].trim();
      continue;
    }

    const toMatch = TO_LINE.exec(line);
    if (toMatch && from !== null) {
      renamed.push({ from, to: toMatch[1].trim() });
      from = null;
    }
  }

  return renamed;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a delta-spec markdown file into structured data.
 */
export function parseDeltaSpec(content: string): DeltaSpec {
  const sections = splitSections(content);

  let added: readonly RequirementBlock[] = [];
  let modified: readonly RequirementBlock[] = [];
  let removed: readonly RemovedRequirement[] = [];
  let renamed: readonly RenamedRequirement[] = [];

  for (const section of sections) {
    switch (section.kind) {
      case 'ADDED':
        added = parseRequirementBlocks(section.lines);
        break;
      case 'MODIFIED':
        modified = parseRequirementBlocks(section.lines);
        break;
      case 'REMOVED':
        removed = parseRemovedRequirements(section.lines);
        break;
      case 'RENAMED':
        renamed = parseRenamedRequirements(section.lines);
        break;
    }
  }

  return { added, modified, removed, renamed };
}
