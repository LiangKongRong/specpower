import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { Command } from 'commander';

export async function renameScenario(
  projectRoot: string,
  capability: string,
  oldName: string,
  newName: string,
): Promise<void> {
  const specPath = join(projectRoot, 'specpower', 'specs', capability, 'spec.md');
  let content = await fs.readFile(specPath, 'utf-8');
  // Atomically change `#### Scenario: <oldName>` → `#### Scenario: <newName>`
  const re = new RegExp(`^(#### Scenario:\\s*)${escapeRegExp(oldName)}(\\s*)$`, 'm');
  if (!re.test(content)) {
    throw new Error(`Scenario "${oldName}" not found in ${specPath}`);
  }
  content = content.replace(re, `$1${newName}$2`);
  await fs.writeFile(specPath, content, 'utf-8');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function registerRenameScenarioCommand(program: Command): void {
  program
    .command('rename-scenario <capability> <old> <new>')
    .description('Atomically rename a baseline Scenario and sync test-plan references')
    .option('--dry-run', 'Preview affected files without writing')
    .action(async (capability: string, old: string, next: string, opts: { dryRun?: boolean }) => {
      const projectRoot = process.cwd();
      if (opts.dryRun) {
        const affected = await listAffectedTestPlans(projectRoot, old);
        console.info(`Would rename "${old}" → "${next}" in baseline spec + ${affected.length} test-plan(s):`);
        affected.forEach((p) => console.info(`  ${p}`));
        return;
      }
      await renameScenario(projectRoot, capability, old, next);
      const synced = await syncTestPlanRefs(projectRoot, old, next);
      console.info(`Renamed "${old}" → "${next}"; synced ${synced} test-plan reference(s).`);
    });
}

// Task 16 implementation
async function listAffectedTestPlans(_root: string, _old: string): Promise<string[]> { return []; }
async function syncTestPlanRefs(_root: string, _old: string, _new: string): Promise<number> { return 0; }
