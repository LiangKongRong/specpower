/**
 * Change parser.
 *
 * Higher-level API that delegates to the markdown delta-spec parser.
 * Produces a DeltaPlan from a delta-spec file's content.
 */

import { parseDeltaSpec } from './markdown-parser.js';
import type {
  RequirementBlock,
  RemovedRequirement,
  RenamedRequirement,
} from './markdown-parser.js';

export interface DeltaPlan {
  readonly added: readonly RequirementBlock[];
  readonly modified: readonly RequirementBlock[];
  readonly removed: readonly RemovedRequirement[];
  readonly renamed: readonly RenamedRequirement[];
}

/**
 * Parse a delta-spec markdown file into a DeltaPlan.
 *
 * This is a thin wrapper around `parseDeltaSpec` that produces
 * the `DeltaPlan` type used by the rest of the system.
 */
export function parseDeltaSpecFile(content: string): DeltaPlan {
  const spec = parseDeltaSpec(content);
  return {
    added: spec.added,
    modified: spec.modified,
    removed: spec.removed,
    renamed: spec.renamed,
  };
}
