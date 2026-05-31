/**
 * All user-facing times render in India Standard Time (the event + audience are
 * in Chennai), regardless of the viewer's or server's timezone.
 */
const IST = "Asia/Kolkata";

export function formatISTTime(d: Date | string | number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(d));
}

export function formatISTDateTime(d: Date | string | number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(d));
}
