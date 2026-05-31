/**
 * Normalize a phone number to its last 10 digits for duplicate / retake
 * detection, so "+91 90000 00000", "090000-00000" and "9000000000" all match.
 * Returns null when there's nothing usable.
 */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}
