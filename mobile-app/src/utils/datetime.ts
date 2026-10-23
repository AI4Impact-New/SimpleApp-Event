const IST_TIMEZONE = 'Asia/Kolkata';

function parseApiDate(dateString?: string): Date | null {
  if (!dateString) return null;
  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(dateString)) {
    return new Date(dateString);
  }

  const [datePart = '', timePart = '00:00'] = dateString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.slice(0, 5).split(':').map(Number);
  if (!year || !month || !day) return null;

  return new Date(Date.UTC(year, month - 1, day, (hour || 0) - 5, (minute || 0) - 30));
}

export function formatDateTimeInIst(dateString?: string): string {
  const date = parseApiDate(dateString);
  if (!date) return 'TBD';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatCompactDateTimeInIst(dateString?: string): string {
  const date = parseApiDate(dateString);
  if (!date) return 'TBD';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

// Built once: Intl formatter construction is costly on Hermes and these run per list row.
const localDateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const localDateFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/** Learning API timestamps carry a timezone; render them in the device's timezone. */
export function formatLocalDateTime(dateString?: string | null): string {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return localDateTimeFormat.format(date);
}

export function formatLocalDate(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return localDateFormat.format(date);
}

/** 125 -> "2:05", 3725 -> "1:02:05" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Device UTC offset as "GMT+5:30", shown next to live-class times so learners know which zone they are in. */
export function localTimezoneLabel(date = new Date()): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const minutes = abs % 60;
  return `GMT${sign}${Math.floor(abs / 60)}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

const localTimeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

/** "Mon, Oct 27, 6:00 PM – 7:30 PM (GMT+5:30)" in the device timezone; end time omitted when unknown. */
export function formatLocalTimeRange(start?: string | null, end?: string | null): string {
  if (!start) return 'Schedule TBD';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 'Schedule TBD';
  const endDate = end ? new Date(end) : null;
  const sameDay = endDate && !Number.isNaN(endDate.getTime()) && endDate.toDateString() === startDate.toDateString();
  const endText = endDate && !Number.isNaN(endDate.getTime())
    ? ` – ${sameDay ? localTimeFormat.format(endDate) : localDateTimeFormat.format(endDate)}`
    : '';
  return `${localDateTimeFormat.format(startDate)}${endText} (${localTimezoneLabel(startDate)})`;
}
