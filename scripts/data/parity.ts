// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// test:parity (§15.7): (1) run kit/reference/*.py on the extracted inputs into a temp dir and compare with kit/golden;
// (2) run the TypeScript ETL golden test. Together they prove Python reference == golden == TypeScript ETL.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const out = mkdtempSync(join(tmpdir(), 'finandex-parity-'));
const py = process.env.PYTHON ?? 'python3';
execFileSync(py, [join(ROOT, 'scripts/data/parity/run_reference.py'), ROOT, out], { stdio: 'inherit' });
execFileSync(py, [join(ROOT, 'scripts/data/parity/cmp_golden.py'), out, join(ROOT, 'kit/golden')], { stdio: 'inherit' });
execFileSync('npx', ['vitest', 'run', '--project', 'golden'], { cwd: ROOT, stdio: 'inherit' });
console.log('test:parity OK');
