export {
  directoryExists,
  fileExists,
  readFile,
  writeFile,
  ensureDir,
} from './file-system.js';

export {
  readChangeMetadata,
  writeChangeMetadata as writeChangeMetadataToDir,
} from './change-metadata.js';

export type { ChangeMetadata } from './change-metadata.js';

export {
  getChangeDir,
  getChangeMetadata,
  writeChangeMetadata,
  listChanges,
} from './change-utils.js';

export {
  parseTask,
  toggleTask,
  countTasks,
} from './task-progress.js';

export type { ParsedTask, TaskCount } from './task-progress.js';

export {
  findProjectRoot,
  requireProjectRoot,
} from './project-root.js';
