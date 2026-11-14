// Direct browser → Cloudinary upload using an *unsigned* upload preset.
// Cloudinary now stores POSTERS ONLY — videos go to Bunny Stream (see
// src/lib/bunnyUpload.js). When these VITE_ vars are absent, the poster is
// sent to the backend and stored there instead.

export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const directUploadReady = Boolean(CLOUD_NAME && UPLOAD_PRESET);

// Uploads `file` directly to Cloudinary. `onProgress` (optional) receives a
// number 0..100 as bytes are sent, so the UI can show a progress bar.
export function uploadToCloudinary(file, kind = 'poster', onProgress) {
  if (!directUploadReady) {
    return Promise.reject(new Error('Direct Cloudinary upload is not configured.'));
  }
  // Posters only — films are uploaded to Bunny Stream.
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', 'our-movie-corner/posters');

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