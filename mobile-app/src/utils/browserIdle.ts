/** Browser idle policy shared by the student and staff portals. */
export const STUDENT_IDLE_KEY = "ai4impact.student.lastActivity";
export const STAFF_IDLE_KEY = "ai4impact.staff.lastActivity";
export const STUDENT_IDLE_MS = 2 * 60 * 60_000;
export const STAFF_IDLE_MS = 60 * 60_000;
const WARNING_MS = 5 * 60_000;

function read(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeBrowserActivity(key: string, time = Date.now()) {
  try {
    window.localStorage.setItem(key, String(time));
  } catch {
    // The active tab can enforce the timeout with its in-memory timestamp.
  }
}

export function browserSessionExpired(key: string, timeout: number) {
  const time = read(key);
  return time !== null && (time === 0 || Date.now() - time >= timeout);
}

export function startBrowserIdleSession(options: {
  key: string;
  timeout: number;
  countVideo?: boolean;
  onWarning: (seconds: number | null) => void;
  onExpire: () => void;
}) {
  const { key, timeout, onWarning, onExpire } = options;
  let lastActivity = read(key) ?? Date.now();
  let ended = false;
  if (read(key) === null) writeBrowserActivity(key, lastActivity);

  function remaining() {
    const stored = read(key);
    if (stored === 0) return 0;
    if (stored !== null) lastActivity = Math.max(stored, lastActivity);
    return timeout - (Date.now() - lastActivity);
  }

  function check() {
    if (ended) return false;
    const left = remaining();
    if (left <= 0) {
      ended = true;
      writeBrowserActivity(key, 0);
      onExpire();
      return false;
    }
    onWarning(left <= WARNING_MS ? Math.ceil(left / 1000) : null);
    return true;
  }

  function touch() {
    lastActivity = Date.now();
    writeBrowserActivity(key, lastActivity);
  }

  function activity() {
    if (check() && remaining() > WARNING_MS && Date.now() - lastActivity >= 1000) touch();
  }

  function videoProgress(event: Event) {
    const video = event.target;
    if (document.visibilityState === "visible" && video instanceof HTMLVideoElement &&
        !video.paused && !video.seeking && video.readyState >= 2) activity();
  }

  function storageChanged(event: StorageEvent) {
    if (event.key === key || event.key === null) check();
  }

  const events = ["pointerdown", "keydown", "touchstart", "scroll"];
  for (const event of events) window.addEventListener(event, activity, { capture: true, passive: true });
  if (options.countVideo) document.addEventListener("timeupdate", videoProgress, true);
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  window.addEventListener("storage", storageChanged);
  const timer = window.setInterval(check, 1000);
  check();

  return {
    stay() {
      if (!check()) return;
      touch();
      check();
    },
    stop() {
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, activity, true);
      document.removeEventListener("timeupdate", videoProgress, true);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("storage", storageChanged);
    },
  };
}
