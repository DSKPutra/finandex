// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Mock-eval scenario types. A scenario scripts the tool calls a model would make for an eval item and renders the
// final answer FROM THE TOOL RESULTS (never from the expected values), so the eval verifies the tools end to end.
import type { Locale } from '../../src/shared/format.ts';

export interface Call {
  tool: string;
  input: Record<string, unknown>;
}
export interface ToolResult {
  tool: string;
  input: Record<string, unknown>;
  ok: boolean;
  /** parsed JSON content of the tool_result (the model copy); for errors, `{ error: message }` */
  data: any;
}
export interface Scenario {
  /** tool calls per model turn; a function receives the results so far (for dependent calls) */
  steps: (Call[] | ((prev: ToolResult[]) => Call[]))[];
  /** final answer text built from the tool results */
  answer: (r: ToolResult[], locale: Locale) => string;
  /** the item cannot pass yet because an input dataset was not supplied (reported, not hidden) */
  pendingData?: string;
}
export type ScenarioSet = Record<string, Scenario>;
