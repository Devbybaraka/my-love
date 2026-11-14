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
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
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
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
