import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { api, GENRES, getUploadKey, setUploadKey } from '../lib/api';

const EMPTY = {
  title: '',
  year: '',
  genre: 'Romance',
  description: '',
  poster_url: '',
  video_url: '',
};

export default function Upload() {
  const [unlocked, setUnlocked] = useState(Boolean(getUploadKey()));
  const [passphrase, setPassphrase] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [posterFile, setPosterFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  function unlock(event) {
    event.preventDefault();
    if (!passphrase.trim()) return;
    setUploadKey(passphrase.trim());
    setUnlocked(true);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const data = new FormData();
      data.append('title', form.title.trim());
      data.append('description', form.description.trim());
      data.append('genre', form.genre);
      if (form.year) data.append('year', form.year);
      if (form.poster_url.trim()) data.append('poster_url', form.poster_url.trim());
      if (form.video_url.trim()) data.append('video_url', form.video_url.trim());
      if (posterFile) data.append('poster', posterFile);
      if (videoFile) data.append('video', videoFile);

      const result = await api.createMovie(data);
      setCreated(result.movie);
      setForm(EMPTY);
      setPosterFile(null);
      setVideoFile(null);
      event.target.reset();
    } catch (err) {
      setError(err.message);
      if (/passphrase/i.test(err.message)) {
        setUploadKey('');
        setUnlocked(false);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen aura">
        <Header />
        <main className="shell flex min-h-[75vh] items-center justify-center py-16">
          <form
            onSubmit={unlock}
            className="glass w-full max-w-sm rounded-3xl p-8 text-center animate-fade-up"
          >
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-rose/30 bg-rose/10 text-rose-soft">
              ♥
            </div>
            <h1 className="font-display text-3xl text-cream">Just for me.</h1>
            <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-relaxed text-cream/45">
              This is where I hang our films. Say the word we picked.
            </p>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="our word"
              autoFocus
              className="field mt-6 text-center"
            />
            <button type="submit" className="btn-primary mt-4 w-full">
              open the booth
            </button>
            <Link
              to="/movies"
              className="mt-5 inline-block text-[10px] uppercase tracking-[0.26em] text-cream/30 hover:text-cream/70"
            >
              back to our movies
            </Link>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen aura">
      <Header />
      <main className="shell pb-24 pt-10 sm:pt-14">
        <p className="mb-4 flex items-center gap-3 text-[9px] uppercase tracking-[0.4em] text-gold">
          the projection booth
          <span className="h-px w-12 bg-gradient-to-r from-gold/60 to-transparent" />
        </p>
        <h1 className="font-display text-[clamp(2.1rem,6vw,3.2rem)] leading-tight text-cream">
          Add something for us
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-cream/50">
          Upload a film and it lands in her corner instantly. Poster and video
          can be files or plain links.
        </p>
        <div className="mt-4 flex flex-wrap gap-5">
          <Link
            to="/letter"
            className="text-[10px] uppercase tracking-[0.24em] text-cream/35 hover:text-gold"
          >
            edit her letter →
          </Link>
          <Link
            to="/movies"
            className="text-[10px] uppercase tracking-[0.24em] text-cream/35 hover:text-gold"
          >
            see our corner →
          </Link>
        </div>

        {created && (
          <div className="mt-8 rounded-3xl border border-rose/25 bg-rose/[0.07] p-5">
            <p className="font-display text-xl text-cream">
              &ldquo;{created.title}&rdquo; is in the corner.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to={`/watch/${created.id}`} className="btn-primary">
                watch it now
              </Link>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="btn-ghost"
              >
                add another
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="glass space-y-5 rounded-3xl p-6 sm:p-8">
            <div>
              <label className="label" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                required
                value={form.title}
                onChange={update('title')}
                className="field"
                placeholder="Before Sunrise"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="year">
                  Year
                </label>
                <input
                  id="year"
                  type="number"
                  min="1888"
                  max="2100"
                  value={form.year}
                  onChange={update('year')}
                  className="field"
                  placeholder="1995"
                />
              </div>
              <div>
                <label className="label" htmlFor="genre">
                  Genre
                </label>
                <select
                  id="genre"
                  value={form.genre}
                  onChange={update('genre')}
                  className="field"
                >
                  {GENRES.map((genre) => (
                    <option key={genre} value={genre} className="bg-ink">
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="description">
                Why this one
              </label>
              <textarea
                id="description"
                rows="4"
                value={form.description}
                onChange={update('description')}
                className="field resize-none"
                placeholder="A film about two people who talk all night…"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="poster">
                  Poster file
                </label>
                <input
                  id="poster"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-3 text-xs text-cream/50 file:mr-3 file:rounded-full file:border-0 file:bg-rose/15 file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-widest file:text-rose-soft"
                />
                <input
                  type="url"
                  value={form.poster_url}
                  onChange={update('poster_url')}
                  className="field mt-3"
                  placeholder="…or a poster URL"
                />
              </div>
              <div>
                <label className="label" htmlFor="video">
                  Video file
                </label>
                <input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-3 text-xs text-cream/50 file:mr-3 file:rounded-full file:border-0 file:bg-rose/15 file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-widest file:text-rose-soft"
                />
                <input
                  type="url"
                  value={form.video_url}
                  onChange={update('video_url')}
                  className="field mt-3"
                  placeholder="…or a video URL (mp4)"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose-soft">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
                {busy ? 'placing it on the shelf…' : 'add to our corner'}
              </button>
              <Link
                to="/movies"
                className="text-[10px] uppercase tracking-[0.24em] text-cream/35 hover:text-cream"
              >
                see our movies
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass rounded-3xl p-5">
              <p className="text-[9px] uppercase tracking-[0.3em] text-cream/35">
                how it will look
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <div className="aspect-[2/3] bg-gradient-to-br from-wine via-plum to-coal">
                  {posterFile || form.poster_url ? (
                    <img
                      src={
                        posterFile ? URL.createObjectURL(posterFile) : form.poster_url
                      }
                      alt="Poster preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-3xl text-rose/40">
                      ✦
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 truncate font-display text-lg text-cream">
                {form.title || 'Untitled film'}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cream/35">
                {[form.year, form.genre].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="rounded-3xl border border-white/5 p-5">
              <p className="text-[9px] uppercase tracking-[0.3em] text-gold/70">
                a small note
              </p>
              <p className="mt-3 font-hand text-xl leading-snug text-cream/70">
                Keep the descriptions honest. She reads them.
              </p>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
