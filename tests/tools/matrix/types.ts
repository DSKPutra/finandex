// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tool-matrix fixtures: calls that exercise every tool and its main branches.
import type { DexId } from '../../../src/config/dex-registry.ts';

export interface MatrixCall {
  tool: string;
  input: Record<string, unknown>;
  /** the call must fail with an instructive ToolError (is_error path) */
  error?: boolean;
  /** optional extra assertion on the model copy */
  check?: (data: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}
export type Matrix = Partial<Record<DexId, MatrixCall[]>>;
