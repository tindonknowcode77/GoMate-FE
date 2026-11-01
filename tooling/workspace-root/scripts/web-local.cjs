const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'GoMate-FE');
let active;
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  stopping = true;
  active?.kill(signal);
});

function run(args, cwd, env) {
  return new Promise((resolve, reject) => {
    active = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
    active.once('error', reject);
    active.once('exit', (code, signal) => {
      active = null;
      if (stopping) resolve();
      else if (code === 0) resolve();
      else reject(new Error(`Process exited with ${signal || code}`));
    });
  });
}

(async () => {
  console.log('Building current frontend source for http://localhost:3000 (API: /api)...');
  await run([path.join(frontend, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', 'dist', '--clear'], frontend, { EXPO_PUBLIC_API_BASE_URL: '/api' });
  if (stopping || process.argv.includes('--build-only')) return;
  console.log('Open http://localhost:3000/portal or http://localhost:3000');
  await run(['--watch', '--env-file-if-exists=.env', 'src/server.js'], path.join(root, 'GoMate-BE'), { PORT: '3000' });
})().catch(error => { console.error(error.message); process.exitCode = 1; });
