import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

// Password hashing for SA sub-admin accounts. Uses scrypt (built-in, no extra
// dependency). Stored format: `scrypt$<saltHex>$<hashHex>`.
//
// Backward compatibility: legacy rows may hold a plaintext password (no prefix).
// verifyPassword still accepts those via a timing-safe compare so existing
// accounts keep working, but every NEW/updated password is stored hashed.

const KEYLEN = 64;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

/** Timing-safe string comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still run a compare to avoid early-exit timing, then fail.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string | undefined | null): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = stored.split('$');
    if (!saltHex || !hashHex) return false;
    try {
      const derived = await scryptAsync(plain, Buffer.from(saltHex, 'hex'));
      const expected = Buffer.from(hashHex, 'hex');
      return derived.length === expected.length && timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }
  // Legacy plaintext row — accept via timing-safe compare (and the caller
  // should re-hash on next save).
  return safeEqual(plain, stored);
}

export { safeEqual };
