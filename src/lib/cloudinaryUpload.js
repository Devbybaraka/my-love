// Direct browser → Cloudinary upload using an *unsigned* upload preset.
// Used for real films (> ~4.5 MB) on Vercel, where the API body cap would
// reject them. When these VITE_ vars are absent, uploads fall back to the
// backend (disk or server-side Cloudinary) — i.e. local dev / disk hosts.

export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const directUploadReady = Boolean(CLOUD_NAME && UPLOAD_PRESET);

// Uploads `file` directly to Cloudinary. `onProgress` (optional) receives a
// number 0..100 as bytes are sent, so the UI can show a progress bar.
export function uploadToCloudinary(file, kind = 'video', onProgress) {
  if (!directUploadReady) {
    return Promise.reject(new Error('Direct Cloudinary upload is not configured.'));
  }
  const resourceType = kind === 'poster' || kind === 'image' ? 'image' : 'video';
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', `our-movie-corner/${resourceType === 'video' ? 'films' : 'posters'}`);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (typeof onProgress === 'function' && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      let data = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = { error: { message: xhr.responseText } };
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
        resolve(data.secure_url);
      } else {
        reject(new Error(data?.error?.message || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onabort = () => reject(new Error('Upload aborted.'));
    xhr.send(form);
  });
}