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
}

const CASE_LINE = /^-\s+\*\*Case\*\*\s+(?<id>T\d+):\s+(?<desc>.+?)\s+\[(?<mark>positive|negative)\]\s*$/;
const FIELD_LINE = /^\s+-\s+(?<k>Input|Expected|it\(\)|file):\s*(?<v>.+?)\s*$/;
const CAPABILITY = /^##\s+Capability:\s*(?<cap>.+?)\s*$/;
const REQ_SCEN = /^###\s+Requirement:\s*(?<req>.+?)\s+→\s+Scenario:\s*(?<scen>.+?)\s*$/;

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
    });
    cur = null;
  };

  for (const line of lines) {
    const cm = CAPABILITY.exec(line);
    if (cm) { flush(); cap = cm.groups!.cap; continue; }
    const rsm = REQ_SCEN.exec(line);
    if (rsm) { flush(); req = rsm.groups!.req; scen = rsm.groups!.scen; continue; }
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
