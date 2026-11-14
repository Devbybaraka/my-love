// Direct browser → Bunny Stream upload over TUS.
//
// Films never pass through our API (Vercel caps request bodies at ~4.5 MB).
// We ask the server for a short-lived signature for a freshly created video,
// then stream the file to Bunny in resumable chunks. Progress comes from the
// TUS client, so a 700 MB film shows real movement.

import * as tus from 'tus-js-client';
import { api } from './api';

export const BUNNY_ENDPOINT = 'https://video.bunnycdn.com/tusupload';

/** e.g. "700 MB" — for the "don't close this tab" line. */
export function fileSizeLabel(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

/**
 * Uploads one video file to Bunny Stream.
 * Resolves with { bunnyId, playbackUrl, embedUrl }.
 */
export function uploadToBunny(file, { title = '', onProgress } = {}) {
  return new Promise((resolve, reject) => {
    let upload;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    api
      .createBunnyUpload(title || file.name)
      .then((creds) => {
        upload = new tus.Upload(file, {
          endpoint: BUNNY_ENDPOINT,
          // Slow but steady: survive a phone leaving the room and coming back.
          retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000],
          chunkSize: 8 * 1024 * 1024,
          headers: {
            AuthorizationSignature: creds.signature,
            AuthorizationExpire: String(creds.expirationTime),
            VideoId: creds.videoId,
            LibraryId: String(creds.libraryId),
          },
          metadata: {
            filetype: file.type || 'video/mp4',
            title: title || file.name,
          },
          onError: (error) => {
            const status = error?.originalResponse?.getStatus?.();
            fail(
              new Error(
                status
                  ? `Bunny rejected the upload (${status}). ${error.message || ''}`.trim()
                  : error.message || 'The upload stopped. Try again.'
              )
            );
          },
          onProgress: (sent, total) => {
            if (typeof onProgress === 'function' && total) {
              onProgress(Math.min(100, Math.round((sent / total) * 100)));
            }
          },
          onSuccess: () => {
            if (settled) return;
            settled = true;
            resolve({
              bunnyId: creds.videoId,
              embedUrl: creds.embedUrl,
              playbackUrl: `${creds.embedUrl}?autoplay=false&preload=true&playsinline=true&rememberPosition=true`,
            });
          },
        });

        upload.start();
      })
      .catch(fail);

    // If the tab is closed mid-upload we don't want a hang; abort cleanly.
    window.addEventListener(
      'beforeunload',
      () => {
        upload?.abort(true);
      },
      { once: true }
    );
  });
}
