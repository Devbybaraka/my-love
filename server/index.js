import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool, initSchema } from './db.js';
import { cloudinaryReady, uploadFromPath, deleteByUrl } from './cloudinary.js';
import { bunnyReady, createBunnyVideo, deleteBunnyVideo } from './bunny.js';
import {
  accessRequired,
  wordIsRight,
  setDoorCookie,
  clearDoorCookie,
  hasDoor,
  requireAccess,
} from './access.js';
import { rateLimit } from './rateLimit.js';
import { notifyNewThing, notificationsReady } from './notify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;

/* ------------------------------------------------------------------ */
/* Where uploaded films live                                           */
/* ------------------------------------------------------------------ */
// Vercel functions have no writable project folder, only /tmp. Real films there
// belong on Cloudinary; this is just a safe default so nothing crashes.
const SERVERLESS = Boolean(process.env.VERCEL);
const DEFAULT_UPLOADS = SERVERLESS ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || DEFAULT_UPLOADS);
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

/** Posters still use Cloudinary (or disk). Videos are uploaded straight to
 *  Bunny Stream from the browser via TUS, so they never pass through here. */
async function storeFile(file, kind) {
  if (!file) return null;
  try {
    if (kind === 'poster' && cloudinaryReady) {
      const result = await uploadFromPath(file.path, {
        resourceType: 'image',
        folder: 'our-movie-corner/posters',
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
      bunny: bunnyReady,
      door: accessRequired,
      notify: notificationsReady,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/* ----------------------------- the door ----------------------------- */
// One word (SITE_PASSCODE, falling back to UPLOAD_PASSCODE) opens the whole
// site. Wrong guesses are throttled per IP.
const doorAttempts = rateLimit({
  max: 8,
  windowMs: 15 * 60 * 1000,
  message: 'Too many tries. Wait a few minutes, then try the word again.',
});

app.get('/api/access', (req, res) => {
  res.json({ required: accessRequired, ok: hasDoor(req) });
});

app.post('/api/access', doorAttempts, (req, res) => {
  const word = (req.body || {}).passphrase || '';
  if (!wordIsRight(word)) {
    return res.status(401).json({ error: 'That word is not the one we picked.', locked: true });
  }
  setDoorCookie(req, res);
  res.json({ ok: true });
});

app.delete('/api/access', (req, res) => {
  clearDoorCookie(req, res);
  res.json({ ok: true });
});

/* ------------------------- bunny stream ------------------------- */
// Mints a short-lived signature so the browser can upload a video straight to
// Bunny Stream via TUS, without exposing our API key. Requires the upload key.
app.post('/api/bunny/create-upload', requireKey, express.json(), async (req, res, next) => {
  try {
    if (!bunnyReady) {
      return res.status(503).json({ error: 'Bunny Stream is not configured on this server.' });
    }
    const title = String((req.body || {}).title || '').trim() || 'Untitled';
    const creds = await createBunnyVideo(title);
    res.json(creds);
  } catch (error) {
    next(error);
  }
});

/* ---------------------------- movies ---------------------------- */
app.get('/api/movies', requireAccess, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM movies ORDER BY created_at DESC, id DESC'
    );
    res.json({ movies: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/movies/:id', requireAccess, async (req, res, next) => {
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

    const notes = await pool.query(
      `SELECT id, author, body, created_at
         FROM movie_notes
        WHERE movie_id = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [id]
    );

    res.json({ movie, related, notes: notes.rows });
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
      let video_url = (body.playback_url || body.video_url || '').trim() || null;
      let bunny_id = (body.bunny_id || '').trim() || null;

      const posterFile = req.files?.poster?.[0];
      const videoFile = req.files?.video?.[0];

      if (posterFile) poster_url = await storeFile(posterFile, 'poster');
      // Backwards-compatible disk fallback when Bunny isn't configured.
      if (videoFile && !bunny_id) video_url = await storeFile(videoFile, 'video');

      if (!video_url) {
        return res.status(400).json({
          error: 'A movie needs a video file or a video URL.',
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO movies (title, description, genre, year, poster_url, video_url, bunny_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [title, description || null, genre || null, year, poster_url, video_url, bunny_id]
      );

      const movie = rows[0];
      // The film is already saved; the email is a nice-to-have.
      void notifyNewThing({
        title: movie.title,
        kind: 'film',
        description: movie.description || '',
        extra: [movie.year, movie.genre].filter(Boolean).join(' · '),
        link: process.env.PUBLIC_SITE_URL ? `${process.env.PUBLIC_SITE_URL}/watch/${movie.id}` : '',
      });

      res.status(201).json({ movie });
    } catch (error) {
      next(error);
    }
  }
);

/* ----------------------------- her notes ----------------------------- */
const noteAttempts = rateLimit({
  max: 12,
  windowMs: 60 * 1000,
  message: 'Slow down a moment — one note at a time.',
});

app.post('/api/movies/:id/notes', requireAccess, noteAttempts, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'That is not a movie id.' });
    }

    const body = String((req.body || {}).body || '').trim().slice(0, 1000);
    const author = String((req.body || {}).author || '').trim().slice(0, 40) || null;
    if (body.length < 1) {
      return res.status(400).json({ error: 'Write something first.' });
    }

    const { rows: movie } = await pool.query('SELECT id FROM movies WHERE id = $1', [id]);
    if (!movie.length) return res.status(404).json({ error: 'Movie not found.' });

    const { rows } = await pool.query(
      `INSERT INTO movie_notes (movie_id, author, body)
       VALUES ($1, $2, $3)
       RETURNING id, author, body, created_at`,
      [id, author, body]
    );

    res.status(201).json({ note: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/movies/:id/notes/:noteId', requireKey, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM movie_notes WHERE id = $1 AND movie_id = $2',
      [Number(req.params.noteId), Number(req.params.id)]
    );
    if (!rowCount) return res.status(404).json({ error: 'Note not found.' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/movies/:id', requireKey, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      'DELETE FROM movies WHERE id = $1 RETURNING poster_url, video_url, bunny_id',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movie not found.' });

    // remove locally stored files, Cloudinary assets (posters) and Bunny videos
    deleteLocalFile(rows[0].poster_url);
    deleteLocalFile(rows[0].video_url);
    deleteByUrl(rows[0].poster_url);
    deleteBunnyVideo(rows[0].bunny_id);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------- series ---------------------------- */
app.get('/api/series', requireAccess, async (_req, res, next) => {
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

app.get('/api/series/:id', requireAccess, async (req, res, next) => {
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
  upload.any(),
  async (req, res, next) => {
    try {
      const body = req.body || {};
      const files = req.files || [];
      const title = (body.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Give the series a title.' });

      const genre = (body.genre || '').trim();
      const year = body.year ? Number(body.year) : null;
      if (year !== null && (!Number.isInteger(year) || year < 1888 || year > 2100)) {
        return res.status(400).json({ error: 'That year looks a little off.' });
      }

      // Reject stray upload fields before anything is stored, then clean the temp files.
      if (files.some((file) => !/^(poster|episode_video_\d+)$/.test(file.fieldname))) {
        await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
        return res.status(400).json({ error: 'Unexpected file field in the upload.' });
      }

      const poster = files.find((file) => file.fieldname === 'poster');
      let poster_url = (body.poster_url || '').trim() || null;
      if (poster) poster_url = await storeFile(poster, 'poster');

      // Episodes arrive as episode_title_0, episode_video_url_0, episode_video_0,
      // then _1, _2, … so each row pairs with itself — no counters to keep in step.
      const episodeFiles = new Map(
        files
          .filter((file) => file.fieldname !== 'poster')
          .map((file) => [file.fieldname, file])
      );
      const count = Math.min(60, Math.max(0, Number(body.episode_count) || 0));
      const episodes = [];

      for (let i = 0; i < count; i += 1) {
        const file = episodeFiles.get(`episode_video_${i}`);
        const bunnyId = (body[`episode_bunny_id_${i}`] || '').trim() || null;
        let video = (body[`episode_playback_url_${i}`] || body[`episode_video_url_${i}`] || '').trim();
        if (file && !bunnyId) video = await storeFile(file, 'video');
        if (video) {
          episodes.push({
            title: (body[`episode_title_${i}`] || '').trim(),
            video,
            bunnyId,
          });
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
            `INSERT INTO episodes (series_id, episode_number, title, video_url, bunny_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [series.id, i + 1, episodes[i].title || null, episodes[i].video, episodes[i].bunnyId || null]
          );
        }

        await client.query('COMMIT');
        void notifyNewThing({
          title: series.title,
          kind: 'film',
          description: series.description || '',
          extra: `${episodes.length} episode${episodes.length === 1 ? '' : 's'}`,
          link: process.env.PUBLIC_SITE_URL
            ? `${process.env.PUBLIC_SITE_URL}/series/${series.id}`
            : '',
        });
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
  upload.single('video'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = req.body || {};
      if (!Number.isInteger(id)) {
        return res.status(404).json({ error: 'Series not found.' });
      }

      // Check before touching the upload, so a bad id never leaves a stray file.
      const { rows: series } = await pool.query('SELECT id FROM series WHERE id = $1', [id]);
      if (!series.length) {
        return res.status(404).json({ error: 'Series not found.' });
      }

      let video_url = (body.playback_url || body.video_url || '').trim();
      let bunny_id = (body.bunny_id || '').trim() || null;
      if (req.file && !bunny_id) video_url = await storeFile(req.file, 'video');
      if (!video_url) {
        return res.status(400).json({ error: 'Give the episode a video file or URL.' });
      }

      const { rows: last } = await pool.query(
        'SELECT COALESCE(MAX(episode_number), 0)::int AS number FROM episodes WHERE series_id = $1',
        [id]
      );
      const nextNumber = last[0].number + 1;

      const { rows } = await pool.query(
        `INSERT INTO episodes (series_id, episode_number, title, video_url, bunny_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, nextNumber, (body.title || '').trim() || null, video_url, bunny_id]
      );

      const { rows: parent } = await pool.query('SELECT title FROM series WHERE id = $1', [id]);
      void notifyNewThing({
        title: parent[0]?.title || 'our series',
        kind: 'episode',
        description: rows[0].title || `Episode ${nextNumber}`,
        extra: `Episode ${nextNumber} just went up.`,
        link: process.env.PUBLIC_SITE_URL
          ? `${process.env.PUBLIC_SITE_URL}/series/${id}`
          : '',
      });

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
      `SELECT s.poster_url, e.video_url, e.bunny_id
         FROM series s LEFT JOIN episodes e ON e.series_id = s.id
        WHERE s.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Series not found.' });

    await pool.query('DELETE FROM series WHERE id = $1', [id]);
    rows.forEach((row) => {
      deleteLocalFile(row.poster_url);
      deleteLocalFile(row.video_url);
      deleteByUrl(row.poster_url);
      deleteBunnyVideo(row.bunny_id);
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------- letter ---------------------------- */
app.get('/api/letter', requireAccess, async (_req, res, next) => {
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

/* ------------------------- error monitoring ------------------------- */
// A tiny error inbox: the browser posts what broke, and the owner can read the
// last 50 reports from /upload. (Point SENTRY_DSN at Sentry instead if you ever
// want stack-trace grouping — this needs no account.)
const errorAttempts = rateLimit({ max: 30, windowMs: 60 * 1000 });

function recordError({ message, stack, url, userAgent }) {
  pool
    .query(
      `INSERT INTO client_errors (message, stack, url, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [String(message || '').slice(0, 500), String(stack || '').slice(0, 4000), String(url || '').slice(0, 500), String(userAgent || '').slice(0, 300)]
    )
    .catch((error) => console.warn('[errors] could not save:', error.message));
}

app.post('/api/errors', errorAttempts, (req, res) => {
  const body = req.body || {};
  if (!body.message) return res.status(400).json({ error: 'Nothing to report.' });
  recordError({
    message: body.message,
    stack: body.stack,
    url: body.url,
    userAgent: body.userAgent || req.get('user-agent'),
  });
  res.status(202).json({ ok: true });
});

app.get('/api/errors', requireKey, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, message, stack, url, user_agent, created_at
         FROM client_errors
        ORDER BY created_at DESC
        LIMIT 50`
    );
    res.json({ errors: rows });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/errors', requireKey, async (_req, res, next) => {
  try {
    await pool.query('DELETE FROM client_errors');
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* Production: serve the built React app                              */
/* ------------------------------------------------------------------ */
const distDir = path.join(__dirname, '..', 'dist');
if (!SERVERLESS && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, req, res, _next) => {
  console.error('[api]', err.message);
  // Keep a record of server-side failures too, so they show up next to the
  // browser ones instead of only in the Vercel log.
  if (!err.code) {
    recordError({
      message: `[api] ${err.message}`,
      stack: err.stack,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
    });
  }
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

// On Vercel the platform calls the exported app; everywhere else we listen.
if (!SERVERLESS) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
    console.log(
      cloudinaryReady
        ? '[api] uploads → Cloudinary'
        : `[api] uploads → local disk (${UPLOADS_DIR})`
    );
  });
}

export default app;
