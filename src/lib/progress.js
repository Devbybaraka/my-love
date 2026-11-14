// Where we left off, remembered on this device.
//
// Nothing is sent to the server: progress is per-browser (her phone keeps its
// own place), which is exactly what you want for a shared gift site.

const KEY = 'mc_progress';
const MAX_ENTRIES = 80;

export const filmKey = (id) => `film:${id}`;
export const episodeKey = (id) => `ep:${id}`;

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode / full — ignore */
  }
}

export function getProgress(key) {
  const entry = readAll()[key];
  return entry && typeof entry === 'object' ? entry : null;
}

export function saveProgress(key, { t, d, title, href, kind = 'film', id }) {
  if (!Number.isFinite(t) || t < 3) return;
  const all = readAll();
  all[key] = {
    t,
    d: Number.isFinite(d) ? d : 0,
    title: title || '',
    href: href || '',
    kind,
    id,
    at: Date.now(),
  };

  // Keep the store small: drop the least recently watched.
  const entries = Object.entries(all);
  if (entries.length > MAX_ENTRIES) {
    entries
      .sort((a, b) => (b[1].at || 0) - (a[1].at || 0))
      .slice(MAX_ENTRIES)
      .forEach(([oldKey]) => {
        delete all[oldKey];
      });
  }
  writeAll(all);
}

export function clearProgress(key) {
  const all = readAll();
  if (!(key in all)) return;
  delete all[key];
  writeAll(all);
}

/** Everything still in progress, newest first. */
export function listProgress() {
  return Object.entries(readAll())
    .map(([key, value]) => ({ key, ...value }))
    // Still worth finishing: past the first few seconds, not at the credits.
    .filter(
      (entry) =>
        entry.t > 5 &&
        entry.href &&
        (!entry.d || entry.t < entry.d - Math.min(10, entry.d * 0.1))
    )
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}

/** 0–1 for a little progress bar. */
export function progressRatio(entry) {
  if (!entry || !entry.d) return 0;
  return Math.max(0, Math.min(1, entry.t / entry.d));
}
