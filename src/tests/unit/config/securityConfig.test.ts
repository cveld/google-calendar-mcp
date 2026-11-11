import { describe, expect, it } from 'vitest';
import { platform } from 'os';
import { getOAuthScopes, getTokenProtection, loadAppConfig } from '../../../config/AppConfig.js';

describe('security configuration', () => {
  it('does not request Calendar administration in any scope profile', () => {
    for (const profile of ['standard', 'owned', 'readonly']) {
      const scopes = getOAuthScopes({ GOOGLE_CALENDAR_MCP_SCOPE_PROFILE: profile });
      expect(scopes).not.toContain('https://www.googleapis.com/auth/calendar');
      expect(scopes).not.toContain('https://www.googleapis.com/auth/calendar.acls');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar.calendars.readonly');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
    }
  });
  it('supports owned-calendar events and read-only events', () => {
    expect(getOAuthScopes({ GOOGLE_CALENDAR_MCP_SCOPE_PROFILE: 'owned' })[0])
      .toBe('https://www.googleapis.com/auth/calendar.events.owned');
    expect(getOAuthScopes({ GOOGLE_CALENDAR_MCP_SCOPE_PROFILE: 'readonly' })[0])
      .toBe('https://www.googleapis.com/auth/calendar.events.readonly');
  });
  it('rejects invalid and empty profiles instead of expanding permissions', () => {
    for (const value of ['', 'full', 'invalid']) {
      expect(() => getOAuthScopes({ GOOGLE_CALENDAR_MCP_SCOPE_PROFILE: value })).toThrow('SCOPE_PROFILE');
    }
  });
  it('validates encryption without silent fallback', () => {
    expect(getTokenProtection({})).toBe('plaintext');
    expect(() => getTokenProtection({ GOOGLE_CALENDAR_MCP_TOKEN_PROTECTION: '' })).toThrow('TOKEN_PROTECTION');
    if (platform() === 'win32') {
      expect(getTokenProtection({ GOOGLE_CALENDAR_MCP_TOKEN_PROTECTION: 'dpapi' })).toBe('dpapi');
    } else {
      expect(() => getTokenProtection({ GOOGLE_CALENDAR_MCP_TOKEN_PROTECTION: 'dpapi' })).toThrow('requires Windows');
    }
  });
  it('resolves the settings at startup', () => {
    const config = loadAppConfig([], { GOOGLE_CALENDAR_MCP_SCOPE_PROFILE: 'owned' });
    expect(config.oauthScopes).toEqual(getOAuthScopes({ GOOGLE_CALENDAR_MCP_SCOPE_PROFILE: 'owned' }));
    expect(config.tokenProtection).toBe('plaintext');
  });
});
