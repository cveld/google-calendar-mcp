import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { GaxiosError } from 'gaxios';
import { isInvalidGrantError } from '../../../auth/tokenManager.js';

const requireHere = createRequire(import.meta.url);

describe('Google SDK gaxios error compatibility', () => {
  it.each(['google-auth-library', 'googleapis-common'])(
    'recognizes CommonJS errors created by %s in ESM application error handling',
    (consumer) => {
      const requireFromSdk = createRequire(requireHere.resolve(consumer));
      const { GaxiosError: SdkGaxiosError } = requireFromSdk('gaxios');
      // Exercise the SDK's actual dependency, not an error constructed using
      // the application's own import. No HTTP request or real token is involved.
      const error = new SdkGaxiosError('synthetic Google SDK error', {
        url: new URL('https://example.invalid'),
        responseType: 'json'
      });
      error.response = { status: 400, data: { error: 'invalid_grant' } };
      expect(error instanceof GaxiosError).toBe(true);
      expect(isInvalidGrantError(error)).toBe(true);
    }
  );
});
