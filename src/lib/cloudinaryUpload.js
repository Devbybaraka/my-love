// Direct browser → Cloudinary upload using an *unsigned* upload preset.
// Used for real films (> ~4.5 MB) on Vercel, where the API body cap would
// reject them. When these VITE_ vars are absent, uploads fall back to the
// backend (disk or server-side Cloudinary) — i.e. local dev / disk hosts.

export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const directUploadReady = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export async function uploadToCloudinary(file, kind = 'video') {
  if (!directUploadReady) {
    throw new Error('Direct Cloudinary upload is not configured.');
  }
  const resourceType = kind === 'poster' || kind === 'image' ? 'image' : 'video';
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', `our-movie-corner/${resourceType === 'video' ? 'films' : 'posters'}`);

  const res = await fetch(url, { method: 'POST', body: form });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: { message: text } };
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || `Upload failed (${res.status})`);
  }
  if (!data.secure_url) {
    throw new Error('Cloudinary did not return a file URL.');
  }
  return data.secure_url;
}