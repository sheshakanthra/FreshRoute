const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatTime(iso: string): string {
  return TIME_FORMATTER.format(new Date(iso));
}

/** Section 15 — a synthetic "next reassessment" window, a fixed interval after the last telemetry capture. */
export function addHoursIso(iso: string, hours: number): string {
  const date = new Date(iso);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}
