/**
 * Shared input validation - used by both the client capture gate and the
 * server routes so the rules can never drift apart. Pure, no I/O.
 */

/** Strip everything that isn't a digit. */
export function digitsOnly(raw?: string | null): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * A pragmatic email check that rejects the obvious junk the loose
 * `x@x.x` pattern let through: empty labels, leading/trailing/consecutive
 * dots, and missing TLD. Not RFC-complete (that's a deliverability check's
 * job), just enough to keep undeliverable rows out of the canonical key.
 */
export function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length > 254) return false;
  return /^[^\s@.]+(?:\.[^\s@.]+)*@[^\s@.]+(?:\.[^\s@.]+)+$/.test(e);
}

/** The Reality Check collects a 10-digit local mobile number. */
export const PHONE_DIGITS = 10;

/** A valid mobile number is exactly 10 digits (country code is not collected). */
export function isValidPhone(raw?: string | null): boolean {
  return digitsOnly(raw).length === PHONE_DIGITS;
}
