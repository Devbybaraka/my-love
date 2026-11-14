const KEY_STORAGE = 'mc_upload_key';

export function getUploadKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setUploadKey(value) {
  try {
    localStorage.setItem(KEY_STORAGE, value);
  } catch {
    /* private mode — ignore */
  }
}

async function read(res) {
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    // The door cookie is gone or was never set — let the app ask for the word.
    if (data.locked && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mc-locked'));
    }
    throw error;
  }
  return data;
}

export const api = {
  /* the door */
  getAccess: () => fetch('/api/access').then(read),

  openDoor: (passphrase) =>
    fetch('/api/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    }).then(read),

  closeDoor: () => fetch('/api/access', { method: 'DELETE' }).then(read),

  listMovies: () => fetch('/api/movies').then(read),

  getMovie: (id) => fetch(`/api/movies/${id}`).then(read),

  createMovie: (formData) =>
    fetch('/api/movies', {
      method: 'POST',
      headers: { 'x-upload-key': getUploadKey() },
      body: formData,
    }).then(read),

  deleteMovie: (id) =>
    fetch(`/api/movies/${id}`, {
      method: 'DELETE',
      headers: { 'x-upload-key': getUploadKey() },
    }).then(read),

  /* her notes on a film */
  addNote: (movieId, note) =>
    fetch(`/api/movies/${movieId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    }).then(read),

  deleteNote: (movieId, noteId) =>
    fetch(`/api/movies/${movieId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: { 'x-upload-key': getUploadKey() },
    }).then(read),

  listSeries: () => fetch('/api/series').then(read),

  getSeries: (id) => fetch(`/api/series/${id}`).then(read),

  createSeries: (formData) =>
    fetch('/api/series', {
      method: 'POST',
      headers: { 'x-upload-key': getUploadKey() },
      body: formData,
    }).then(read),

  addEpisode: (id, formData) =>
    fetch(`/api/series/${id}/episodes`, {
      method: 'POST',
      headers: { 'x-upload-key': getUploadKey() },
      body: formData,
    }).then(read),

  deleteSeries: (id) =>
    fetch(`/api/series/${id}`, {
      method: 'DELETE',
      headers: { 'x-upload-key': getUploadKey() },
    }).then(read),

  getLetter: () => fetch('/api/letter').then(read),

  saveLetter: (letter) =>
    fetch('/api/letter', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-upload-key': getUploadKey(),
      },
      body: JSON.stringify(letter),
    }).then(read),

  /* error inbox (owner only) */
  listErrors: () =>
    fetch('/api/errors', { headers: { 'x-upload-key': getUploadKey() } }).then(read),

  clearErrors: () =>
    fetch('/api/errors', {
      method: 'DELETE',
      headers: { 'x-upload-key': getUploadKey() },
    }).then(read),
};

export const GENRES = ['Action', 'Comedy', 'Drama', 'Romance', 'Horror'];

export function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${String(m % 60).padStart(2, '0')}m`;
  }
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** "12:04" style clock for resume hints. */
export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
