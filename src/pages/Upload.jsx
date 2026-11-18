import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { api, GENRES, getUploadKey, setUploadKey } from '../lib/api';
import { directUploadReady, uploadToCloudinary } from '../lib/cloudinaryUpload';
import { fileSizeLabel, uploadToBunny } from '../lib/bunnyUpload';

const EMPTY = {
  title: '',
  year: '',
  genre: 'Romance',
  description: '',
  poster_url: '',
  video_url: '',
};

const emptyEpisode = () => ({ title: '', url: '', file: null });

export default function Upload() {
  const [unlocked, setUnlocked] = useState(Boolean(getUploadKey()));
  const [passphrase, setPassphrase] = useState('');
  const [mode, setMode] = useState('film');
  const [form, setForm] = useState(EMPTY);
  const [posterFile, setPosterFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [episodes, setEpisodes] = useState([emptyEpisode()]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [shelf, setShelf] = useState({ movies: [], series: [] });
  const [removing, setRemoving] = useState(null);
  const [errorLog, setErrorLog] = useState(null);
  const [bunny, setBunny] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');

  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    Promise.all([api.listMovies(), api.listSeries()])
      .then(([m, s]) => {
        if (!alive) return;
        setShelf({ movies: m.movies || [], series: s.series || [] });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [unlocked, created]);

  // Videos live on Bunny Stream; without its keys we fall back to this
  // server's own disk so local work isn't blocked.
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setBunny(Boolean(data.bunny)))
      .catch(() => setBunny(false));
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    api
      .listErrors()
      .then((data) => setErrorLog(data.errors || []))
      .catch(() => setErrorLog(null));
  }, [unlocked]);

  async function removeFromShelf(kind, id) {
    setRemoving(id);
    setError('');
    try {
      if (kind === 'film') await api.deleteMovie(id);
      else await api.deleteSeries(id);
      setShelf((prev) => ({
        movies: kind === 'film' ? prev.movies.filter((m) => m.id !== id) : prev.movies,
        series: kind === 'series' ? prev.series.filter((s) => s.id !== id) : prev.series,
      }));
    } catch (err) {
      setError(err.message);
      if (/passphrase/i.test(err.message)) {
        setUploadKey('');
        setUnlocked(false);
      }
    } finally {
      setRemoving(null);
    }
  }

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  function unlock(event) {
    event.preventDefault();
    if (!passphrase.trim()) return;
    setUploadKey(passphrase.trim());
    setUnlocked(true);
    setError('');
  }

  function updateEpisode(index, patch) {
    setEpisodes((prev) =>
      prev.map((episode, i) => (i === index ? { ...episode, ...patch } : episode))
    );
  }

  function addEpisodeRow() {
    setEpisodes((prev) => [...prev, emptyEpisode()]);
  }

  function removeEpisodeRow(index) {
    setEpisodes((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      // Posters: straight to Cloudinary when the unsigned preset is configured,
      // otherwise the server stores them.
      let posterUrl = form.poster_url.trim();
      if (directUploadReady && posterFile) {
        setProgress(0);
        setProgressLabel('uploading the poster');
        posterUrl = await uploadToCloudinary(posterFile, 'poster', setProgress);
      }

      // Videos: direct to Bunny Stream over TUS (chunked, resumable), so a
      // 700 MB film never touches our API or Vercel's body cap.
      let videoUrl = form.video_url.trim();
      let bunnyId = '';
      let playbackUrl = '';
      const episodeUrls = episodes.map((e) => e.url.trim());
      const episodeBunnyIds = episodes.map(() => '');
      const episodePlaybacks = episodes.map(() => '');

      if (bunny && mode === 'film' && videoFile) {
        setProgress(0);
        setProgressLabel(
          `Uploading ${fileSizeLabel(videoFile.size)} — don't close this tab`
        );
        const uploaded = await uploadToBunny(videoFile, {
          title: form.title.trim() || videoFile.name,
          onProgress: setProgress,
        });
        bunnyId = uploaded.bunnyId;
        playbackUrl = uploaded.playbackUrl;
        setProgress(100);
      }

      if (bunny && mode === 'series') {
        const total = episodes.filter((e) => e.file).length;
        let done = 0;
        for (let i = 0; i < episodes.length; i += 1) {
          const file = episodes[i].file;
          if (!file) continue;
          setProgress(Math.round((done / Math.max(1, total)) * 100));
          setProgressLabel(
            `Uploading episode ${i + 1} (${fileSizeLabel(file.size)}) — don't close this tab`
          );
          const uploaded = await uploadToBunny(file, {
            title: episodes[i].title.trim() || `${form.title.trim()} — episode ${i + 1}`,
            onProgress: (p) =>
              setProgress(Math.round(((done + p / 100) / Math.max(1, total)) * 100)),
          });
          episodeBunnyIds[i] = uploaded.bunnyId;
          episodePlaybacks[i] = uploaded.playbackUrl;
          done += 1;
          setProgress(Math.round((done / Math.max(1, total)) * 100));
        }
      }

      const data = new FormData();
      data.append('title', form.title.trim());
      data.append('description', form.description.trim());
      data.append('genre', form.genre);
      if (form.year) data.append('year', form.year);
      if (posterUrl) data.append('poster_url', posterUrl);
      // Only send the raw poster file when there is no direct upload.
      if (!directUploadReady && posterFile) data.append('poster', posterFile);

      if (mode === 'film') {
        if (playbackUrl) {
          data.append('playback_url', playbackUrl);
          data.append('bunny_id', bunnyId);
        } else if (videoUrl) {
          data.append('video_url', videoUrl);
        }
        // Disk fallback for local work without Bunny keys.
        if (!bunny && videoFile) data.append('video', videoFile);

        const result = await api.createMovie(data);
        setCreated({ kind: 'film', id: result.movie.id, title: result.movie.title });
      } else {
        // One numbered trio (+ Bunny ids) per row, so the server pairs them up.
        data.append('episode_count', String(episodes.length));
        episodes.forEach((episode, index) => {
          data.append(`episode_title_${index}`, episode.title.trim());
          data.append(`episode_video_url_${index}`, episodeUrls[index]);
          if (episodePlaybacks[index]) {
            data.append(`episode_playback_url_${index}`, episodePlaybacks[index]);
            data.append(`episode_bunny_id_${index}`, episodeBunnyIds[index]);
          }
          if (!bunny && episode.file) {
            data.append(`episode_video_${index}`, episode.file);
          }
        });
        const result = await api.createSeries(data);
        setCreated({
          kind: 'series',
          id: result.series.id,
          title: result.series.title,
          episodes: result.episodeCount,
        });
      }

      setForm(EMPTY);
      setPosterFile(null);
      setVideoFile(null);
      setEpisodes([emptyEpisode()]);
      event.target.reset();
    } catch (err) {
      setError(err.message);
      if (/passphrase/i.test(err.message)) {
        setUploadKey('');
        setUnlocked(false);
      }
    } finally {
      setBusy(false);
      setProgress(null);
      setProgressLabel('');
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
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-gold/30 bg-blush-soft text-gold-deep">
              ♥
            </div>
            <h1 className="font-display text-3xl text-ink">Just for me.</h1>
            <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-relaxed text-ink/50">
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
              className="mt-5 inline-block text-[10px] uppercase tracking-[0.26em] text-ink/35 hover:text-ink/70"
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
        <h1 className="font-display text-[clamp(2.1rem,6vw,3.2rem)] leading-tight text-ink">
          Add something for us
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/55">
          Upload a film, or a whole series that rolls from one episode into the
          next. Poster and video can be files or plain links.
        </p>
        <div className="mt-4 flex flex-wrap gap-5">
          <Link
            to="/letter"
            className="text-[10px] uppercase tracking-[0.24em] text-ink/40 hover:text-gold-deep"
          >
            edit her letter →
          </Link>
          <Link
            to="/movies"
            className="text-[10px] uppercase tracking-[0.24em] text-ink/40 hover:text-gold-deep"
          >
            see our corner →
          </Link>
        </div>

        {created && (
          <div className="mt-8 rounded-3xl border border-gold/25 bg-blush-soft p-5">
            <p className="font-display text-xl text-ink">
              &ldquo;{created.title}&rdquo; is in the corner
              {created.kind === 'series'
                ? ` — ${created.episodes} episode${created.episodes === 1 ? '' : 's'} queued up.`
                : '.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                to={created.kind === 'series' ? `/series/${created.id}` : `/watch/${created.id}`}
                className="btn-primary"
              >
                {created.kind === 'series' ? 'start watching' : 'watch it now'}
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

        <div className="mt-8 inline-flex rounded-full border border-ink/[0.08] p-1">
          {[
            { key: 'film', label: 'a film' },
            { key: 'series', label: 'a series' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMode(option.key)}
              aria-pressed={mode === option.key}
              className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition ${
                mode === option.key
                  ? 'bg-blush text-gold-deep'
                  : 'text-ink/45 hover:text-ink/75'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                placeholder={mode === 'series' ? 'Our slow evenings' : 'Before Sunrise'}
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
                    <option key={genre} value={genre} className="bg-cream">
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
                  className="w-full rounded-2xl border border-dashed border-ink/15 bg-white px-4 py-3 text-xs text-ink/55 file:mr-3 file:rounded-full file:border-0 file:bg-gold/10 file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-widest file:text-gold-deep"
                />
                <input
                  type="url"
                  value={form.poster_url}
                  onChange={update('poster_url')}
                  className="field mt-3"
                  placeholder="…or a poster URL"
                />
              </div>

              {mode === 'film' && (
                <div>
                  <label className="label" htmlFor="video">
                    Video file
                  </label>
                  <input
                    id="video"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full rounded-2xl border border-dashed border-ink/15 bg-white px-4 py-3 text-xs text-ink/55 file:mr-3 file:rounded-full file:border-0 file:bg-gold/10 file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-widest file:text-gold-deep"
                  />
                  {bunny ? (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-ink/40">
                      goes straight to bunny stream — chunked, no size limit
                    </p>
                  ) : (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-blush-deep/75">
                      bunny stream keys aren&rsquo;t set — a big film will fail here
                    </p>
                  )}
                  <input
                    type="url"
                    value={form.video_url}
                    onChange={update('video_url')}
                    className="field mt-3"
                    placeholder="…or a video URL (mp4)"
                  />
                </div>
              )}
            </div>

            {mode === 'series' && (
              <div className="space-y-3 rounded-2xl border border-ink/[0.08] bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-ink/45">
                    episodes
                  </p>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-ink/30">
                    plays in order
                  </span>
                </div>

                {episodes.map((episode, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-ink/[0.08] bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-[0.26em] text-blush-deep/75">
                        episode {index + 1}
                      </span>
                      {episodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEpisodeRow(index)}
                          className="text-[9px] uppercase tracking-[0.2em] text-ink/35 hover:text-blush-deep"
                        >
                          remove
                        </button>
                      )}
                    </div>
                    <input
                      value={episode.title}
                      onChange={(e) => updateEpisode(index, { title: e.target.value })}
                      className="field mt-3"
                      placeholder="Episode title (optional)"
                    />
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) =>
                          updateEpisode(index, { file: e.target.files?.[0] || null })
                        }
                        className="w-full rounded-2xl border border-dashed border-ink/15 bg-white px-3 py-2.5 text-[11px] text-ink/55 file:mr-2 file:rounded-full file:border-0 file:bg-gold/10 file:px-2.5 file:py-1 file:text-[9px] file:uppercase file:tracking-widest file:text-gold-deep"
                      />
                      <input
                        type="url"
                        value={episode.url}
                        onChange={(e) => updateEpisode(index, { url: e.target.value })}
                        className="field"
                        placeholder="…or a video URL"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addEpisodeRow}
                  className="w-full rounded-2xl border border-dashed border-ink/15 py-3 text-[10px] uppercase tracking-[0.22em] text-ink/45 transition hover:border-gold/60 hover:text-gold-deep"
                >
                  + add another episode
                </button>
              </div>
            )}

            {progress !== null && (
              <div className="space-y-2 rounded-2xl border border-gold/20 bg-blush-soft p-4">
                <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em] text-ink/55">
                  <span className="normal-case tracking-normal text-[12px] text-ink/70">
                    {progressLabel || 'uploading'}
                  </span>
                  <span className="shrink-0 text-gold-deep">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-gold transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-2xl border border-gold/30 bg-blush-soft px-4 py-3 text-sm text-gold-deep">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
                {busy
                  ? 'placing it on the shelf…'
                  : mode === 'series'
                    ? 'add the series'
                    : 'add to our corner'}
              </button>
              <Link
                to="/movies"
                className="text-[10px] uppercase tracking-[0.24em] text-ink/40 hover:text-ink"
              >
                see our movies
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass rounded-3xl p-5">
              <p className="text-[9px] uppercase tracking-[0.3em] text-ink/40">
                how it will look
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-ink/[0.08]">
                <div className="aspect-[2/3] bg-gradient-to-br from-blush via-white to-cream">
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
                    <div className="grid h-full place-items-center text-3xl text-gold/85">
                      ✦
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 truncate font-display text-lg text-ink">
                {form.title || 'Untitled'}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/40">
                {[form.year, form.genre].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="rounded-3xl border border-ink/[0.06] p-5">
              <p className="text-[9px] uppercase tracking-[0.3em] text-gold/85">
                a small note
              </p>
              <p className="mt-3 font-hand text-xl leading-snug text-ink/70">
                Keep the descriptions honest. She reads them.
              </p>
            </div>
          </aside>
        </form>

        {unlocked && (shelf.movies.length > 0 || shelf.series.length > 0) && (
          <section className="mt-12">
            <p className="mb-4 flex items-center gap-3 text-[9px] uppercase tracking-[0.4em] text-gold">
              on our shelf
              <span className="h-px w-12 bg-gradient-to-r from-gold/60 to-transparent" />
            </p>
            <div className="space-y-3">
              {shelf.movies.map((movie) => (
                <div
                  key={`m-${movie.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-ink/[0.08] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-[16px] text-ink/80">
                      {movie.title}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-ink/35">
                      film · {movie.genre || '—'} {movie.year ? `· ${movie.year}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={removing === movie.id}
                    onClick={() => removeFromShelf('film', movie.id)}
                    className="text-[10px] uppercase tracking-[0.22em] text-ink/35 transition hover:text-blush-deep disabled:opacity-50"
                  >
                    {removing === movie.id ? 'removing…' : 'remove'}
                  </button>
                </div>
              ))}
              {shelf.series.map((s) => (
                <div
                  key={`s-${s.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-ink/[0.08] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-[16px] text-ink/80">
                      {s.title}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-ink/35">
                      series · {s.episode_count || 0} episodes
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={removing === s.id}
                    onClick={() => removeFromShelf('series', s.id)}
                    className="text-[10px] uppercase tracking-[0.22em] text-ink/35 transition hover:text-blush-deep disabled:opacity-50"
                  >
                    {removing === s.id ? 'removing…' : 'remove'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Something broke? Everything the browser reported, newest first. */}
        {unlocked && errorLog && errorLog.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="flex items-center gap-3 text-[9px] uppercase tracking-[0.4em] text-gold">
                something broke
                <span className="h-px w-12 bg-gradient-to-r from-gold/60 to-transparent" />
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.clearErrors();
                    setErrorLog([]);
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                className="text-[9px] uppercase tracking-[0.22em] text-ink/35 hover:text-blush-deep"
              >
                clear
              </button>
            </div>
            <ul className="space-y-2">
              {errorLog.slice(0, 8).map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-ink/[0.08] bg-white px-4 py-3"
                >
                  <p className="text-[13px] leading-relaxed text-ink/70">
                    {entry.message}
                  </p>
                  <p className="mt-1 truncate text-[9px] uppercase tracking-[0.18em] text-ink/30">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleString()
                      : ''}
                    {entry.url ? ` · ${entry.url}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
