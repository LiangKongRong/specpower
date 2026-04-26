/**
 * Validation constants.
 *
 * Regex patterns and heading markers used during spec validation.
 */

export const SECTION_HEADER = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i;
export const REQUIREMENT_HEADER = /^###\s+Requirement:\s*(.+)\s*$/;
export const SCENARIO_HEADER_CORRECT = /^####\s+Scenario:\s*(.+)\s*$/;
export const SCENARIO_HEADER_WRONG_LEVEL = /^###\s+Scenario:\s*(.+)\s*$/;
export const WHEN_LINE = /^-\s+\*\*WHEN\*\*\s+(.+)$/;
export const THEN_LINE = /^-\s+\*\*THEN\*\*\s+(.+)$/;
export const REASON_LINE = /^\*\*Reason\*\*:\s*(.+)$/;
export const FROM_LINE = /^FROM:\s*(.+)$/;
export const TO_LINE = /^TO:\s*(.+)$/;
