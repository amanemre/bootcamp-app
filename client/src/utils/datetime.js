// Timezone-aware date formatting shared across pages. The timezone is driven by
// the user's saved preference (see SettingsContext). When unset, the browser's
// local timezone is used. Server timestamps are UTC ('YYYY-MM-DD HH:MM:SS').

let TZ; // undefined => browser local

export function setDateTimeZone(tz) {
  TZ = tz && tz.length ? tz : undefined;
}

function toDate(str) {
  if (!str) return null;
  const d = new Date(String(str).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

// "18 Jun 2026"
export function formatDate(str) {
  const d = toDate(str);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
}

// "18 Jun 2026 06:48:08"
export function formatDateTime(str) {
  const d = toDate(str);
  if (!d) return '—';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: TZ });
  return `${date} ${time}`;
}

// "18 Jun 2026, 06:48"
export function formatDateTimeShort(str) {
  const d = toDate(str);
  if (!d) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
}
