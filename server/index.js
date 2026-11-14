import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool, initSchema } from './db.js';
import { cloudinaryReady, uploadFromPath } from './cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;

/* ------------------------------------------------------------------ */
/* Where uploaded films live                                           */
/* ------------------------------------------------------------------ */
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');
const TMP_DIR = path.join(UPLOADS_DIR, 'tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv', '.ogg']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 10);
    const safe = /^\.[a-z0-9]+$/.test(ext) ? ext : '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
});

function deleteLocalFile(url) {
  if (url && url.startsWith('/uploads/')) {
    fs.promises.unlink(path.join(UPLOADS_DIR, path.basename(url))).catch(() => {});
  }
}

function keepOnDisk(file, kind) {
  const ext = path.extname(file.filename).toLowerCase();
  const allowed = kind === 'video' ? VIDEO_EXT : IMAGE_EXT;
  const safeExt = allowed.has(ext) ? ext : kind === 'video' ? '.mp4' : '.jpg';
  const name = `${kind}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
  fs.renameSync(file.path, path.join(UPLOADS_DIR, name));
  return `/uploads/${name}`;
}

/** Cloudinary when configured, otherwise this server's own disk. */
async function storeFile(file, kind) {
  if (!file) return null;
  try {
    if (cloudinaryReady) {
      const result = await uploadFromPath(file.path, {
        resourceType: kind === 'video' ? 'video' : 'image',
        folder: `our-movie-corner/${kind === 'video' ? 'films' : 'posters'}`,
      });
      return result.secure_url;
    }
    return keepOnDisk(file, kind);
  } finally {
    fs.promises.unlink(file.path).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

function requireKey(req, res, next) {
  const expected = process.env.UPLOAD_PASSCODE;
  if (!expected) {
    console.warn('[api] UPLOAD_PASSCODE is not set — editing is open on this server.');
    return next();
  }
  if (req.get('x-upload-key') !== expected) {
    return res.status(401).json({ error: 'That passphrase is not right. Try again, love.' });
  }
  next();
}

app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    res.json({
      ok: true,
      db: rows[0].now,
      cloudinary: cloudinaryReady,
      storage: cloudinaryReady ? 'cloudinary' : 'disk',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/* ---------------------------- movies ---------------------------- */
app.get('/api/movies', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM movies ORDER BY created_at DESC, id DESC'
    );
    res.json({ movies: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/movies/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'That is not a movie id.' });
    }

    const { rows } = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'That film is not in our corner yet.' });
    }
    const movie = rows[0];

    const sameGenre = movie.genre
      ? await pool.query(
          `SELECT * FROM movies
             WHERE id <> $1 AND genre = $2
             ORDER BY created_at DESC
             LIMIT 3`,
          [id, movie.genre]
        )
      : { rows: [] };

    let related = sameGenre.rows;
    if (related.length < 3) {
      const { rows: more } = await pool.query(
        `SELECT * FROM movies
           WHERE id <> $1 AND NOT (id = ANY($2::int[]))
           ORDER BY created_at DESC
           LIMIT $3`,
        [id, related.map((r) => r.id), 3 - related.length]
      );
      related = [...related, ...more];
    }

    res.json({ movie, related });
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/movies',
  requireKey,
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const body = req.body || {};
      const title = (body.title || '').trim();
      const description = (body.description || '').trim();
      const genre = (body.genre || '').trim();
      const year = body.year ? Number(body.year) : null;

      if (!title) return res.status(400).json({ error: 'Give our movie a title.' });
      if (year !== null && (!Number.isInteger(year) || year < 1888 || year > 2100)) {
        return res.status(400).json({ error: 'That year looks a little off.' });
      }

      let poster_url = (body.poster_url || '').trim() || null;
      let video_url = (body.video_url || '').trim() || null;

      const posterFile = req.files?.poster?.[0];
      const videoFile = req.files?.video?.[0];

      if (posterFile) poster_url = await storeFile(posterFile, 'poster');
      if (videoFile) video_url = await storeFile(videoFile, 'video');

      if (!video_url) {
        return res.status(400).json({
          error: 'A movie needs a video file or a video URL.',
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO movies (title, description, genre, year, poster_url, video_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, description || null, genre || null, year, poster_url, video_url]
      );

      res.status(201).json({ movie: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

app.delete('/api/movies/:id', requireKey, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      'DELETE FROM movies WHERE id = $1 RETURNING poster_url, video_url',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movie not found.' });

    // remove locally stored files too
    [rows[0].poster_url, rows[0].video_url].forEach(deleteLocalFile);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------- series ---------------------------- */
app.get('/api/series', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM episodes e WHERE e.series_id = s.id)::int AS episode_count
         FROM series s
        ORDER BY s.created_at DESC, s.id DESC`
    );
    res.json({ series: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/series/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'That is not a series id.' });
    }
    const { rows } = await pool.query('SELECT * FROM series WHERE id = $1', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'That series is not in our corner yet.' });
    }
    const episodes = await pool.query(
      'SELECT * FROM episodes WHERE series_id = $1 ORDER BY episode_number ASC',
      [id]
    );
    res.json({ series: rows[0], episodes: episodes.rows });
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/series',
  requireKey,
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'episode_video', maxCount: 60 },
  ]),
  async (req, res, next) => {
    try {
      const body = req.body || {};
      const title = (body.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Give the series a title.' });

      const genre = (body.genre || '').trim();
      const year = body.year ? Number(body.year) : null;
      if (year !== null && (!Number.isInteger(year) || year < 1888 || year > 2100)) {
        return res.status(400).json({ error: 'That year looks a little off.' });
      }

      let poster_url = (body.poster_url || '').trim() || null;
      if (req.files?.poster?.[0]) {
        poster_url = await storeFile(req.files.poster[0], 'poster');
      }

      const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);
      const titles = asArray(body.episode_title);
      const urls = asArray(body.episode_video_url);
      const hasFile = asArray(body.episode_has_file).map((flag) => String(flag) === '1');
      const files = req.files?.episode_video || [];

      const total = Math.max(titles.length, urls.length, hasFile.length);
      const episodes = [];
      let fileIndex = 0;

      for (let i = 0; i < total; i += 1) {
        let video = (urls[i] || '').trim();
        if (hasFile[i] && files[fileIndex]) {
          video = await storeFile(files[fileIndex], 'video');
          fileIndex += 1;
        }
        if (video) {
          episodes.push({ title: (titles[i] || '').trim(), video });
        }
      }

      if (!episodes.length) {
        return res.status(400).json({ error: 'A series needs at least one episode.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const inserted = await client.query(
          `INSERT INTO series (title, description, genre, year, poster_url)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [title, (body.description || '').trim() || null, genre || null, year, poster_url]
        );
        const series = inserted.rows[0];

        for (let i = 0; i < episodes.length; i += 1) {
          await client.query(
            `INSERT INTO episodes (series_id, episode_number, title, video_url)
             VALUES ($1, $2, $3, $4)`,
            [series.id, i + 1, episodes[i].title || null, episodes[i].video]
          );
        }

        await client.query('COMMIT');
        res.status(201).json({ series, episodeCount: episodes.length });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/series/:id/episodes',
  requireKey,
  upload.fields([{ name: 'video', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = req.body || {};
      let video_url = (body.video_url || '').trim();
      if (req.files?.video?.[0]) video_url = await storeFile(req.files.video[0], 'video');
      if (!video_url) {
        return res.status(400).json({ error: 'Give the episode a video file or URL.' });
      }

      const { rows: existing } = await pool.query(
        'SELECT COALESCE(MAX(episode_number), 0)::int AS last FROM episodes WHERE series_id = $1',
        [id]
      );
      const nextNumber = existing[0].last + 1;

      const { rows } = await pool.query(
        `INSERT INTO episodes (series_id, episode_number, title, video_url)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [id, nextNumber, (body.title || '').trim() || null, video_url]
      );
      res.status(201).json({ episode: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

app.delete('/api/series/:id', requireKey, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      `SELECT s.poster_url, e.video_url
         FROM series s LEFT JOIN episodes e ON e.series_id = s.id
        WHERE s.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Series not found.' });

    await pool.query('DELETE FROM series WHERE id = $1', [id]);
    rows.forEach((row) => {
      deleteLocalFile(row.poster_url);
      deleteLocalFile(row.video_url);
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------- letter ---------------------------- */
app.get('/api/letter', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM letter WHERE id = 1');
    res.json({ letter: rows[0] || null });
  } catch (error) {
    next(error);
  }
});

app.put('/api/letter', requireKey, async (req, res, next) => {
  try {
    const body = req.body || {};
    const clean = (value, max) =>
      typeof value === 'string' ? value.trim().slice(0, max) : '';

    const salutation = clean(body.salutation, 120) || 'My dearest,';
    const bodyText = clean(body.body, 8000);
    const signature = clean(body.signature, 120) || 'always yours, Newton';
    const ps = clean(body.ps, 600);

    if (bodyText.length < 10) {
      return res.status(400).json({ error: 'Write her something first.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO letter (id, salutation, body, signature, ps, updated_at)
       VALUES (1, $1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         salutation = EXCLUDED.salutation,
         body = EXCLUDED.body,
         signature = EXCLUDED.signature,
         ps = EXCLUDED.ps,
         updated_at = NOW()
       RETURNING *`,
      [salutation, bodyText, signature, ps]
    );

    res.json({ letter: rows[0] });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* Production: serve the built React app                              */
/* ------------------------------------------------------------------ */
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[api]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'That file is a little too big (200MB max).' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field in the upload.' });
  }
  res.status(500).json({ error: err.message || 'Something went wrong on our side.' });
});

initSchema().catch((error) =>
  console.error('[db] could not prepare the tables:', error.message)
);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(
    cloudinaryReady
      ? '[api] uploads → Cloudinary'
      : `[api] uploads → local disk (${UPLOADS_DIR})`
  );
});
