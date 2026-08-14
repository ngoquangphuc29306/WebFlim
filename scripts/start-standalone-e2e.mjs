import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const standaloneRoot = resolve(projectRoot, '.next', 'standalone');
const standaloneNextRoot = resolve(standaloneRoot, '.next');

cpSync(resolve(projectRoot, '.next', 'static'), resolve(standaloneNextRoot, 'static'), {
  recursive: true,
});

const publicDir = resolve(projectRoot, 'public');
if (existsSync(publicDir)) {
  cpSync(publicDir, resolve(standaloneRoot, 'public'), { recursive: true });
}

const server = spawn(process.execPath, ['server.js'], {
  cwd: standaloneRoot,
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || '127.0.0.1',
    PORT: process.env.PORT || '3100',
  },
  stdio: 'inherit',
});

const shutdown = () => {
  if (!server.killed) server.kill();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
