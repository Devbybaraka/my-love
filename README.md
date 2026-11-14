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
on **Vercel**, where films must live in Cloudinary (see §11).

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

`POST /api/series` takes the same fields plus `episode_count` and one numbered
trio per episode — `episode_title_0`, `episode_video_url_0`, and optionally the
file `episode_video_0` (then `_1`, `_2`, …). Send a file *or* a URL per row:

```bash
curl -X POST http://localhost:4000/api/series \
  -H "x-upload-key: YOUR_PASSCODE" \
  -F "title=Our Slow Evenings" -F "genre=Romance" -F "episode_count=2" \
  -F "episode_title_0=Episode 1" -F "episode_video_url_0=" \
  -F "episode_video_0=@/path/to/episode-1.mp4" \
  -F "episode_title_1=Episode 2" -F "episode_video_url_1=https://example.com/ep2.mp4"
```

Rows that end up with neither a file nor a URL are skipped, and the rest keep
their order (episode 1, 2, 3…) as saved.

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

## 11. Deploying on Neon + Vercel

Your stack is **Neon** (database) + **Vercel** (site and API). Both are wired up
in this repo — `vercel.json` and `api/index.js` run the Express app as a
Vercel function. But Vercel cannot hold films, so you need **one more account:
Cloudinary (free)**.

### Why Cloudinary is needed here

- Vercel functions have no permanent disk: anything written at runtime is gone
  on the next request.
- A Vercel request body is capped at about **4.5 MB**, so a real film cannot be
  uploaded through the API at all.

So: Cloudinary stores the video files, Neon stores titles / episodes / the
letter, Vercel serves the code.

### 1. Cloudinary — the extra account (5 minutes)

1. <https://cloudinary.com> → sign up free (25 GB storage + 25 GB/month
   bandwidth, plenty for a gift).
2. Dashboard → copy **Cloud name**, **API Key**, **API Secret**.

### 2. Vercel project

1. <https://vercel.com/new> → import `Devbybaraka/my-love`.
2. Framework preset **Vite**; build command `npm run build`, output `dist`
   (already set in `vercel.json` — don't override them).
3. **Environment Variables** (add for Production *and* Preview):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon connection string (`postgresql://…-pooler…`) |
   | `UPLOAD_PASSCODE` | your passphrase (not `newton`) |
   | `CLOUDINARY_CLOUD_NAME` | from the Cloudinary dashboard |
   | `CLOUDINARY_API_KEY` | from the Cloudinary dashboard |
   | `CLOUDINARY_API_SECRET` | from the Cloudinary dashboard |

4. **Deploy**.
5. Check `https://your-app.vercel.app/api/health` → it should say
   `"storage":"cloudinary"`. If it says `"disk"`, the Cloudinary variables
   didn't reach the function — fix them and **Redeploy** (env changes only
   apply to new deployments).
6. That URL is the link you send her. It works on any phone, no Wi-Fi needed.

### Getting films in on Vercel

- **Small clips** (under ~4 MB): the normal `/upload` form works — the file is
  copied to Cloudinary before the request ends.
- **Real films**: upload the file straight into Cloudinary
  (Media Library → **Upload**), then copy its delivery URL
  (`https://res.cloudinary.com/<cloud>/video/upload/v…/film.mp4`) and paste it
  into the **…or a video URL** field on `/upload`. Posters work the same way.
  The player uses the URL directly, so there is no size limit.
- **Direct browser upload (no size limit, wired up now):** create an *unsigned*
  upload preset in the Cloudinary dashboard (Settings → Upload → Upload presets
  → Add → Signing Mode: **Unsigned**). Then set these Vercel env vars and
  redeploy (VITE_ vars are baked into the build):

  | Name | Value |
  | --- | --- |
  | `VITE_CLOUDINARY_CLOUD_NAME` | your cloud name |
  | `VITE_CLOUDINARY_UPLOAD_PRESET` | the unsigned preset name |

  With those set, `/upload` sends real films straight to Cloudinary from the
  browser, then stores the returned URL. The form shows
  "goes straight to cloudinary — no size limit" under the video field.

### Post-deploy checklist

- `/api/health` → `{"ok":true,…,"storage":"cloudinary"}`.
- Add one film and one series, open `/series/:id` on your phone, and let an
  episode roll into the next.
- Save the letter at `/letter` once — it lives in Neon, so it survives
  redeploys.

### Alternative: a host that keeps a disk

If you would rather upload 200 MB films straight from `/upload`, run the same
repo somewhere with a volume. The `Dockerfile` and `render.yaml` here do that
(uploads land in `/data/uploads` via `UPLOADS_DIR`, and Cloudinary is then
optional):

```bash
docker build -t movie-corner .
docker run -d -p 4000:4000 -v movie-uploads:/data \
  -e DATABASE_URL="postgresql://…neon…" \
  -e UPLOAD_PASSCODE="your-word" \
  -e UPLOADS_DIR=/data/uploads \
  movie-corner
```

- **Render:** New → Blueprint → pick the repo (it reads `render.yaml`, creates
  a 5 GB disk, and asks for `DATABASE_URL` + `UPLOAD_PASSCODE`).
- **Railway:** deploy from the repo, add a Volume at `/data`, set the same
  variables.
- **Fly.io:** `fly launch --dockerfile Dockerfile`, `fly volumes create uploads
  --size 5`, mount at `/data`, then `fly secrets set …`.

Either way Neon stays the database and nothing else needs changing.
