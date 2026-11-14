# Our Movie Corner ♥

A love letter and a little cinema, in one place.

- **`/`** — the letter (starfield, envelope, photos, wishes)
- **`/movies`** — her shelf of films, with search and moods
- **`/watch/:id`** — the player, plus "you may also like"
- **`/upload`** — where you add films (passphrase protected)
- **`/letter`** — where you rewrite the letter (passphrase protected)

React + Vite + Tailwind on the front, Express + Postgres (Neon) on the back.
Film files are stored on the server's disk by default — **no Cloudinary account
needed**. Cloudinary is supported if you ever want it.

---

## 1. What you need

- Node.js 18 or newer
- A Postgres database (this project is set up for [Neon](https://neon.tech), free tier is plenty)
- Nothing else. No AWS, no Cloudinary, no paid services.

---

## 2. First-time setup

```bash
npm install
cp .env.example .env    # then edit .env (see below)
npm run db:init         # creates the `movies` and `letter` tables
```

### Your `.env`

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | yes | Your Neon connection string (Project → Connection Details → copy the **pooled** string). Keep `?sslmode=require` at the end. |
| `PORT` | no | API port. Defaults to `4000`. The Vite dev server proxies `/api` and `/uploads` here. |
| `UPLOAD_PASSCODE` | **yes (set one)** | The word you type on `/upload` and `/letter`. It is also sent as the `x-upload-key` header for the API. |
| `UPLOADS_DIR` | no | Where uploaded films are written. Defaults to `./uploads`. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | no | Only if you *want* Cloudinary. Leave empty to store files on disk. |

`.env` is gitignored. Never commit it.

---

## 3. Run it

```bash
npm run dev
```

- Website → <http://localhost:3000>
- API → <http://localhost:4000/api/health>

`/api/health` should say `"ok": true` and `"storage": "disk"`. If it says
`"cloudinary": true`, you have Cloudinary keys set and files go there instead.

For a production-style run:

```bash
npm run build
npm start          # Express serves the built site on :4000
```

---

## 4. How to upload a movie (the important part)

1. Start the app (`npm run dev`) and open **<http://localhost:3000/upload>**.
2. Type your passphrase — the value of `UPLOAD_PASSCODE` in `.env`.
3. Fill in:
   - **Title** — required.
   - **Year** — e.g. `1995` (optional, but it shows on the card).
   - **Genre** — pick one of Action / Comedy / Drama / Romance / Horror.
     The `/movies` filters use exactly these.
   - **Why this one** — the description she reads on the film page. Write it
     like you're talking to her; this is the part that matters.
   - **Poster file** — any image (`.jpg .png .webp .gif .avif`), or paste a
     **poster URL** instead. If you skip both, the card shows a designed
     gradient with the title — it still looks intentional.
   - **Video file** — an `.mp4` / `.webm` / `.mov` / `.m4v` / `.ogv`, **or**
     paste a **video URL**.
4. Press **add to our corner**. You'll get a confirmation with a
   **watch it now** button.

### What happens to the files

- With no Cloudinary keys, the backend writes files to **`./uploads/`** and
  saves a path like `/uploads/video-a1b2c3.mp4` in the `video_url` column.
- `uploads/` is gitignored (films are big). Keep a backup of that folder.
- Uploaded files are deleted from disk when you remove the film.
- Max size per file: **200 MB**. Change it in `server/index.js`
  (`limits: { fileSize: ... }`).

### Using a video URL instead of a file

The URL must point straight at a video file, e.g.
`https://example.com/our-film.mp4`. A normal YouTube or TikTok link will **not**
play in a `<video>` tag — the browser needs the file itself. If the film lives
on YouTube, download it first, then upload the file.

### Removing a film

Open the film at `/watch/:id` while you have the passphrase saved in that
browser. A small **remove this film** link appears at the bottom of the
description.

### Series — episodes that play one after another

On the same upload page there's a **a film / a series** switch. In series mode
the single video field becomes a list of episodes:

1. Give the series a **title** (and genre/year/poster, same as a film).
2. For each episode add an optional **title** plus a **video file or URL**.
3. **+ add another episode** adds a row; **remove** drops one.
4. Save. The episodes are numbered in the order they appear on the form.

Watching works like a box set: on `/series/:id` the first episode plays, and
when it ends **the next one starts by itself**. The episode list underneath is
clickable, and there's a *skip to episode N* link. A series shows up in
`/movies` with a small **series** badge and its episode count.

You can add more episodes later: open the series while your passphrase is
saved and use **+ add another episode** at the bottom. **remove this series**
takes the whole thing (and its files) off the shelf.

### Adding films from the terminal (optional)

```bash
curl -X POST http://localhost:4000/api/movies \
  -H "x-upload-key: YOUR_PASSCODE" \
  -F "title=Before Sunrise" \
  -F "year=1995" \
  -F "genre=Romance" \
  -F "description=Two people, one night in Vienna." \
  -F "poster=@/path/to/poster.jpg" \
  -F "video=@/path/to/film.mp4"
```

---

## 5. How to change the letter

Open **<http://localhost:3000/letter>** and enter the same passphrase.

- **Opening line** — "My dearest,"
- **The letter** — the body. Leave a **blank line between paragraphs**.
  Wrap words in `*asterisks*` to make them rose italic, like
  `*I'm sorry.*`
- **Signature** — the handwritten line at the bottom.
- **P.S.** — the small line after the signature (leave empty to hide it).

Press **save the letter** and open `/` — it updates immediately. The text is
stored in the `letter` table, so it survives restarts and deploys. The original
letter still lives in `src/lib/letterDefaults.js` and is used whenever the
database has no saved version.

---

## 6. Cloudinary (optional)

Only needed if you'd rather not keep films on the server's disk — for example
if you host somewhere with ephemeral storage.

1. Create a free account at <https://cloudinary.com>.
2. Dashboard → copy **Cloud name**, **API Key**, **API Secret**.
3. Put them in `.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`.
4. Restart the API. New uploads go to Cloudinary and `video_url` becomes an
   `https://res.cloudinary.com/...` link. Nothing else changes.

---

## 7. API

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | – | DB connectivity + upload storage mode |
| GET | `/api/movies` | – | All films, newest first |
| GET | `/api/movies/:id` | – | One film + 3 related |
| POST | `/api/movies` | `x-upload-key` | Create (multipart or URL fields) |
| DELETE | `/api/movies/:id` | `x-upload-key` | Remove |
| GET | `/api/series` | – | All series + episode counts |
| GET | `/api/series/:id` | – | One series + its episodes in order |
| POST | `/api/series` | `x-upload-key` | Create a series with episodes |
| POST | `/api/series/:id/episodes` | `x-upload-key` | Append one episode |
| DELETE | `/api/series/:id` | `x-upload-key` | Remove series + episodes (+ files) |
| GET | `/api/letter` | – | Saved letter, or `null` |
| PUT | `/api/letter` | `x-upload-key` | Create/replace the letter |

`POST /api/movies` accepts `multipart/form-data`:
`title`, `description`, `genre`, `year`, `poster_url`, `video_url`, and the
optional files `poster` and `video`.

`POST /api/series` takes the same fields plus repeated episode parts, one set
per episode and in order:

```bash
curl -X POST http://localhost:4000/api/series \
  -H "x-upload-key: YOUR_PASSCODE" \
  -F "title=Our Slow Evenings" -F "genre=Romance" \
  -F "episode_title=Episode 1" -F "episode_video_url=" -F "episode_has_file=1" \
  -F "episode_video=@/path/to/episode-1.mp4" \
  -F "episode_title=Episode 2" -F "episode_video_url=" -F "episode_has_file=1" \
  -F "episode_video=@/path/to/episode-2.mp4"
```

---

## 8. Database

```sql
CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  year INT,
  poster_url TEXT,
  video_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE letter (
  id INT PRIMARY KEY,                 -- always 1
  salutation TEXT NOT NULL,
  body TEXT NOT NULL,                 -- paragraphs separated by blank lines
  signature TEXT NOT NULL,
  ps TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```sql
CREATE TABLE series (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  year INT,
  poster_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE episodes (
  id SERIAL PRIMARY KEY,
  series_id INT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  episode_number INT NOT NULL,
  title TEXT,
  video_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (series_id, episode_number)
);
```

`npm run db:init` creates all four tables if they don't exist (it's safe to run
on an existing database — it only adds).

---

## 9. If something goes wrong

| What you see | Why / fix |
| --- | --- |
| `That passphrase is not right` | The word you typed isn't `UPLOAD_PASSCODE`. Fix it in `.env` and restart the API. |
| `Cloudinary keys are not set yet` | You're on an older build. With current code, files simply go to `./uploads`. |
| `That file is a little too big (200MB max)` | Compress the film (HandBrake, or `ffmpeg -i in.mp4 -vcodec h264 -crf 26 out.mp4`). |
| Video area stays black | The URL isn't a direct video file, or the file's codec isn't browser-friendly. Use H.264 `.mp4`. |
| `The projector isn't warm yet` | API or database is down. Check `http://localhost:4000/api/health` and your `DATABASE_URL`. |
| Postgres prints an SSL warning | Harmless. `sslmode=require` is treated as `verify-full` by `pg`; it still connects. |
| Films disappear after a deploy | The host's disk is ephemeral (Vercel, Render free). Check `UPLOADS_DIR` points at the mounted disk — see **§11 Deploy**. |
| Episodes don't roll over | Only `/series/:id` does auto-next (a single film at `/watch/:id` just ends). Browsers also block sound-on autoplay: the next episode starts because you already pressed play once. |

Testing on her phone: run `npm run dev`, then open
`http://YOUR-COMPUTER-IP:3000` on the same Wi-Fi (the dev server listens on
`0.0.0.0`).

---

## 10. A note before you share it

- Change `UPLOAD_PASSCODE` from the default before putting this online.
- `/upload` and `/letter` are protected only by that passphrase — fine for a
  gift, not for a bank.
- The 7 seeded films are demo entries. Open each one and use
  **remove this film**, then add your own.
- `uploads/` is gitignored: back it up if those files only exist there.

---

## 11. Deploy (so she can watch on her phone)

The films live on the server's disk, so the host has to give you a **disk that
survives restarts** — a normal free web service won't. This repo ships the
pieces for a host that does: `Dockerfile`, `.dockerignore`, `render.yaml`.

The database stays on **Neon** — the host only runs the app. Uploaded films go
to the mounted disk, film titles/descriptions/episodes go to Neon.

### Render (recommended, ~5 minutes, needs the $7 starter instance for a disk)

1. Push this repo to GitHub (already done if you're reading this there).
2. <https://dashboard.render.com> → **New → Blueprint** → pick the repo.
   Render reads `render.yaml` and creates `our-movie-corner` with a 5 GB disk
   mounted at `/data`.
3. When it asks for the `sync: false` values, paste:
   - `DATABASE_URL` — the Neon connection string (the `postgresql://…` one).
   - `UPLOAD_PASSCODE` — your passphrase (don't leave it as `newton`).
4. **Apply**. First build takes a few minutes; health check is `/api/health`.
5. Open the URL Render gives you (e.g. `https://our-movie-corner.onrender.com`).
   That's the link you send her — it works on any phone, no Wi-Fi needed.

`UPLOADS_DIR=/data/uploads` is already set in `render.yaml`; that's the line
that makes films outlive a deploy. If Render restarts the service, the films
are still there.

### Railway / Fly.io / any Docker host

Same image, same three variables, one volume:

```bash
docker build -t movie-corner .
docker run -d -p 4000:4000 \
  -v movie-uploads:/data \
  -e DATABASE_URL="postgresql://…neon…" \
  -e UPLOAD_PASSCODE="your-word" \
  -e UPLOADS_DIR=/data/uploads \
  movie-corner
```

- **Railway:** New Project → Deploy from repo → it builds the `Dockerfile` →
  add a **Volume** mounted at `/data` → set the env vars → generate a domain.
- **Fly.io:** `fly launch --dockerfile Dockerfile`, then
  `fly volumes create uploads --size 5`, mount it at `/data` in `fly.toml`,
  and `fly secrets set DATABASE_URL=… UPLOAD_PASSCODE=…`.

### What to check after deploying

- `https://your-app/api/health` returns `{"ok":true,...,"storage":"disk"}`.
- Upload one small film from `/upload`, then **restart the service** in the
  host dashboard and reload the film — if it still plays, the disk is mounted
  correctly.
- Open the site on her phone, add it to the home screen; the letter and the
  movie corner both work in mobile Safari/Chrome.

### Sizes

- Videos up to **200 MB** each (change `limits.fileSize` in `server/index.js`).
  A 5 GB disk holds roughly 25 such films — plenty for a gift. Raise
  `sizeGB` in `render.yaml` before the first deploy if you want more.
