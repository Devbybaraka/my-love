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
| GET | `/api/letter` | – | Saved letter, or `null` |
| PUT | `/api/letter` | `x-upload-key` | Create/replace the letter |

`POST /api/movies` accepts `multipart/form-data`:
`title`, `description`, `genre`, `year`, `poster_url`, `video_url`, and the
optional files `poster` and `video`.

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

`npm run db:init` creates both if they don't exist.

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
| Films disappear after a deploy | The host's disk is ephemeral (Vercel, Render free). Use Cloudinary, or a host with a persistent volume. |

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
