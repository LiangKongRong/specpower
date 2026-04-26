import type { Artifact } from './types.js';

/**
 * Status of a single artifact.
 */
export interface ArtifactStatusEntry {
  readonly id: string;
  readonly status: 'done' | 'ready' | 'blocked';
  readonly missingDeps?: readonly string[];
}

/**
 * JSON-friendly status object for all artifacts.
 */
export interface StatusOutput {
  readonly artifacts: readonly ArtifactStatusEntry[];
}

/**
 * Formats artifact statuses as a structured JSON-friendly object.
 *
 * @param artifacts - The artifact definitions from the schema
 * @param completed - Array of completed artifact IDs
 * @returns Structured status with each artifact's state
 */
export function formatStatus(
  artifacts: readonly Artifact[],
  completed: readonly string[]
): StatusOutput {
  const completedSet = new Set(completed);

  const statuses: ArtifactStatusEntry[] = artifacts.map(artifact => {
    if (completedSet.has(artifact.id)) {
      return { id: artifact.id, status: 'done' as const };
    }

    const missingDeps = artifact.requires.filter(req => !completedSet.has(req));

    if (missingDeps.length === 0) {
      return { id: artifact.id, status: 'ready' as const };
    }

    return {
      id: artifact.id,
      status: 'blocked' as const,
      missingDeps,
    };
  });

  return { artifacts: statuses };
}

/**
 * Formats artifact statuses as human-readable checkbox text.
 *
 * Output format:
 *   [x] proposal
 *   [ ] specs (blocked by: proposal)
 *
 * @param artifacts - The artifact definitions from the schema
 * @param completed - Array of completed artifact IDs
 * @returns Checkbox-style text string
 */
export function formatStatusHuman(
  artifacts: readonly Artifact[],
  completed: readonly string[]
): string {
  const completedSet = new Set(completed);

  const lines = artifacts.map(artifact => {
    const checkbox = completedSet.has(artifact.id) ? '[x]' : '[ ]';

    const missingDeps = artifact.requires.filter(req => !completedSet.has(req));
    const suffix = missingDeps.length > 0
      ? ` (blocked by: ${missingDeps.join(', ')})`
      : '';

    return `${checkbox} ${artifact.id}${suffix}`;
  });

  return lines.join('\n');
}
