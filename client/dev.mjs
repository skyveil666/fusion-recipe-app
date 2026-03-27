// Wrapper that sets CWD to client/ before starting Vite,
// so Tailwind resolves content paths correctly.
import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
process.chdir(dir);

const vite = spawn(
  process.execPath,
  [resolve(dir, 'node_modules/vite/bin/vite.js'), '--host'],
  { stdio: 'inherit', cwd: dir }
);

vite.on('exit', (code) => process.exit(code ?? 0));
