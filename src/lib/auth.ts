/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../types';

export const DEFAULT_PASSWORD = 'Wisudabytanthowijh';

/**
 * Hash a password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_wisuda_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a plain text password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Direct check for default password in development or matched hash
  if (password === DEFAULT_PASSWORD && (!hash || hash === 'default_hash')) {
    return true;
  }
  const computed = await hashPassword(password);
  return computed === hash;
}
