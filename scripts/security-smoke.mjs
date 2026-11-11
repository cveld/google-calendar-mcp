import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Built-artifact protocol check. Synthetic client configuration only: no login,
// tokens, Calendar requests, or writes to the user's real credential directory.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'calendar-mcp-smoke-'));
const credentials = path.join(dir, 'synthetic-client.json');
const client = new Client({ name: 'offline-security-smoke', version: '1.0.0' });
let timer;
try {
  await fs.writeFile(credentials, JSON.stringify({
    installed: {
      project_id: 'synthetic-offline-test',
      client_id: 'synthetic-client',
      client_secret: 'synthetic-not-a-real-secret',
      redirect_uris: ['http://127.0.0.1']
    }
  }));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(root, 'build', 'index.js')],
    cwd: root,
    stderr: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TRANSPORT: 'stdio',
      GOOGLE_OAUTH_CREDENTIALS: credentials,
      GOOGLE_SERVICE_ACCOUNT_KEY: '',
      GOOGLE_APPLICATION_CREDENTIALS: '',
      GOOGLE_CALENDAR_MCP_TOKEN_PATH: path.join(dir, 'tokens.json'),
      GOOGLE_CALENDAR_MCP_TOKEN_PROTECTION: process.platform === 'win32' ? 'dpapi' : 'plaintext',
      GOOGLE_CALENDAR_MCP_SCOPE_PROFILE: 'owned',
      ENABLED_TOOLS: 'list-calendars,list-events,get-event,create-event,update-event,get-current-time'
    }
  });
  transport.stderr?.on('data', () => {});
  await Promise.race([
    client.connect(transport),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('MCP initialization timed out')), 15000); })
  ]);
  clearTimeout(timer);
  const names = (await client.listTools()).tools.map(tool => tool.name);
  assert(names.includes('create-event'));
  assert(names.includes('update-event'));
  assert(names.includes('manage-accounts'));
  assert(!names.includes('delete-event'));
  assert(!names.includes('respond-to-event'));
  assert.equal(await fs.access(path.join(dir, 'tokens.json')).then(() => true, () => false), false);
  console.log('Built STDIO MCP initialized; tool allowlist verified; no tokens created.');
} finally {
  clearTimeout(timer);
  await client.close();
  await fs.unlink(credentials).catch(() => {});
  // No recursive cleanup of a computed path.
  await fs.rmdir(dir);
}
