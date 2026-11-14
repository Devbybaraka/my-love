import fs from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary is optional. If the three env vars are absent, uploads are stored
 * on this server's disk instead (see server/index.js) — no account needed.
 */
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const cloudinaryReady = Boolean(cloudName && apiKey && apiSecret);

if (cloudinaryReady) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function deleteByUrl(url) {
  if (!cloudinaryReady || !url || !String(url).includes('res.cloudinary.com')) return;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/upload/');
    if (parts.length < 2) return;
    let rest = parts[1];
    rest = rest.replace(/^v\d+\//, '');
    const lastDot = rest.lastIndexOf('.');
    const lastSlash = rest.lastIndexOf('/');
    if (lastDot > lastSlash) rest = rest.slice(0, lastDot);
    // Cloudinary is now only used for posters (images). Videos live on Bunny.
    const resourceType = 'image';
    await cloudinary.uploader.destroy(rest, { resource_type: resourceType, invalidate: true });
  } catch {
    /* best-effort; ignore */
  }
}

export function uploadFromPath(filePath, { resourceType = 'image', folder = 'our-movie-corner' } = {}) {
  return new Promise((resolve, reject) => {
    if (!cloudinaryReady) {
      reject(new Error('Cloudinary is not configured.'));
      return;
    }
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder, timeout: 180000 },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    fs.createReadStream(filePath)
      .on('error', reject)
      .pipe(stream);
  });
}
