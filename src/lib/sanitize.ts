/** Strips HTML tags and trims whitespace from user-supplied strings. */
export function sanitizeText(input: string, maxLength = 200): string {
  return input
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/[<>"'`]/g, '')   // strip remaining dangerous chars
    .trim()
    .slice(0, maxLength);
}

/** Validates that a string looks like an email address. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Validates tournament/game join codes (format: T-XXXX9999 or G-XXXX9999). */
export function isValidCode(code: string): boolean {
  return /^[TG]-[A-Z]{4}[2-9]{4}$/.test(code.trim().toUpperCase());
}

/** Strips non-numeric characters and limits length for score inputs. */
export function sanitizeScore(input: string): string {
  return input.replace(/\D/g, '').slice(0, 3);
}
