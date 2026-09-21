import { promises as fs } from 'node:fs';

export interface TestCase {
  readonly id: string;
  readonly capability: string;
  readonly requirement: string;
  readonly scenarioRef: string;
  readonly mark: 'positive' | 'negative';
  readonly input: string;
  readonly expected: string;
  readonly itName: string;
  readonly file?: string;
  /**
   * Optional: the product source file(s) this Case's test exercises, used by
   * `/specpower:verify` Pass 5 to attribute per-file branch coverage back to
   * the Scenario. One or more comma/space-separated paths relative to the
   * project root (e.g. `src/cli/commands/init.ts`). When omitted, the Case is
   * not attributed a coverage figure (Pass 5 reports `no covers:`).
   */
  readonly covers?: string;
  /**
   * Optional (for `[negative]` Cases): the product error branch this Case tests
   * — a short stable identifier of the branch in the function-under-test (e.g.
   * `validate-null-name`, `auth-reject`, `duplicate-device`). Used by
   * `checkCoverage` to count DISTINCT error branches (not Cases) for the
   * negative-ratio floor, so a requirement with 1 error branch cannot pad its
   * ratio by adding multiple negative Cases that all test that same branch.
   * A reviewer cross-checks `branch:` against the actual code branches.
   * When omitted on a negative Case, the Case is counted individually (legacy
   * behavior) but a `missing-branch-tag` warning is emitted so the reviewer
   * knows the distinct-branch floor is not enforced for that Case.
   */
  readonly branch?: string;
}

const CASE_LINE = /^-\s+\*\*Case\*\*\s+(?<id>T\d+):\s+(?<desc>.+?)\s+\[(?<mark>positive|negative)\]\s*$/;
const FIELD_LINE = /^\s+-\s+(?<k>Input|Expected|it\(\)|file|covers|branch):\s*(?<v>.+?)\s*$/;
const CAPABILITY = /^##\s+Capability:\s*(?<cap>.+?)\s*$/;
const REQ_SCEN = /^###\s+Requirement:\s*(?<req>.+?)\s+→\s+Scenario:\s*(?<scen>.+?)\s*$/;
// Strip trailing metadata markers ([testable]/[negative]) from requirement and
// scenario names in test-plan headers, so they match spec scenario names (which
// are also stripped). Without this, a test-plan `### Requirement: Foo [testable] →`
// would never match a spec scenario under requirement `Foo`.
const TESTABLE_MARKER = /\s+\[testable\]\s*$/i;
const NEGATIVE_MARKER = /\s+\[negative\]\s*$/i;

export function parseTestPlan(content: string): TestCase[] {
  const lines = content.split(/\r?\n/);
  const cases: TestCase[] = [];
  let cap = '';
  let req = '';
  let scen = '';
  let cur: (TestCase & { _fields: Record<string, string> }) | null = null;

  const flush = () => {
    if (!cur) return;
    cases.push({
      id: cur.id, capability: cap, requirement: req, scenarioRef: scen,
      mark: cur.mark, input: cur._fields['Input'] ?? '',
      expected: cur._fields['Expected'] ?? '',
      itName: cur._fields['it()'] ?? '',
      file: cur._fields['file'],
      covers: cur._fields['covers'],
      branch: cur._fields['branch'],
    });
    cur = null;
  };

  for (const line of lines) {
    const cm = CAPABILITY.exec(line);
    if (cm) { flush(); cap = cm.groups!.cap; continue; }
    const rsm = REQ_SCEN.exec(line);
    if (rsm) { flush(); req = rsm.groups!.req.replace(TESTABLE_MARKER, '').trim(); scen = rsm.groups!.scen.replace(NEGATIVE_MARKER, '').trim(); continue; }
    const cl = CASE_LINE.exec(line);
    if (cl) {
      flush();
      cur = {
        id: cl.groups!.id, capability: cap, requirement: req, scenarioRef: scen,
        mark: cl.groups!.mark as 'positive' | 'negative',
        input: '', expected: '', itName: '', _fields: {},
      };
      continue;
    }
    if (cur) {
      const fl = FIELD_LINE.exec(line);
      if (fl) cur._fields[fl.groups!.k] = fl.groups!.v;
    }
  }
  flush();
  return cases;
}

export async function parseTestPlanFile(path: string): Promise<TestCase[]> {
  const content = await fs.readFile(path, 'utf-8');
  return parseTestPlan(content);
}

/**
 * Matches a line that looks like a Case header (`- **Case** ...`) so we can
 * inspect the id portion without also matching the stricter `CASE_LINE`
 * (which requires `T<n>`).
 */
const CASE_PREFIX = /^-\s+\*\*Case\*\*\s+(?<rest>.+?)\s*$/;

/**
 * Scan test-plan content for Case lines whose id is missing or not of the
 * form `T<n>`. Such lines are silently skipped by `parseTestPlan` (the
 * `CASE_LINE` regex requires `T\d+`), so this function surfaces them so the
 * validator can reject them instead of dropping coverage.
 *
 * Returns 1-based line numbers and the raw line text for each malformed Case.
 */
export function findMalformedCases(
  content: string,
): { line: number; raw: string }[] {
  const lines = content.split(/\r?\n/);
  const out: { line: number; raw: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = CASE_PREFIX.exec(lines[i]);
    if (!m) continue;
    // The id is the token up to the first ':' (or the whole rest if no colon).
    const rest = m.groups!.rest;
    const colonIdx = rest.indexOf(':');
    const idPart = colonIdx === -1 ? rest : rest.slice(0, colonIdx);
    if (!/^T\d+$/.test(idPart.trim())) {
      out.push({ line: i + 1, raw: lines[i] });
    }
  }
  return out;
}
