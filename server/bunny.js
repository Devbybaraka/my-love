// Bunny Stream (video) integration.
//
// Posters stay on Cloudinary/disk; only videos go here. The API key and library
// id are server-side only. The client never sees them — it asks us for a
// short-lived signature, then uploads the file straight to Bunny via TUS.

import crypto from 'node:crypto';

const API_KEY = process.env.BUNNY_STREAM_API_KEY || process.env.BUNNY_API_KEY || '';
const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID || '';

export const bunnyReady = Boolean(API_KEY && LIBRARY_ID);

export async function createBunnyVideo(title) {
  if (!bunnyReady) throw new Error('Bunny Stream is not configured on this server.');

  const response = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      AccessKey: API_KEY,
    },
    body: JSON.stringify({ title: title || 'Untitled' }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Could not create the video on Bunny (${response.status}): ${text.slice(0, 200)}`);
  }

  const video = await response.json();
  const videoId = video.guid;
  const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24h

  const signature = crypto
    .createHash('sha256')
    .update(`${LIBRARY_ID}${API_KEY}${expirationTime}${videoId}`)
    .digest('hex');

  const embedUrl = `https://player.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}`;

  return { videoId, libraryId: LIBRARY_ID, expirationTime, signature, embedUrl };
}

export async function deleteBunnyVideo(videoId) {
  if (!bunnyReady || !videoId) return;
  try {
    await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`, {
      method: 'DELETE',
      headers: { AccessKey: API_KEY },
    });
  } catch {
    /* best-effort */
  }
}
