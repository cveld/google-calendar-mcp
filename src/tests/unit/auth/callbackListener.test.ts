import { describe, expect, it } from 'vitest';
import { OAuth2Client } from 'google-auth-library';
import { AuthServer } from '../../../auth/server.js';
import type { AddressInfo } from 'net';

describe('real callback listener', () => {
  it('binds an actual socket to IPv4 loopback only without initiating OAuth', async () => {
    const server = new AuthServer(new OAuth2Client('synthetic-id', 'synthetic-secret'));
    const internal = server as unknown as {
      portRange: { start: number; end: number };
      startServerOnAvailablePort(): Promise<number | null>;
      server: { address(): AddressInfo };
    };
    // Ask the OS for an unused port; do not interfere with a real OAuth session.
    internal.portRange = { start: 0, end: 0 };
    try {
      expect(await internal.startServerOnAvailablePort()).toBe(0);
      expect(internal.server.address().address).toBe('127.0.0.1');
      expect(internal.server.address().family).toBe('IPv4');
    } finally {
      await server.stop();
    }
  });
});
