import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Poster from '../components/Poster';
import { api, formatDuration, getUploadKey } from '../lib/api';
import { attachFullscreenRotation } from '../lib/fullscreenRotate';

export default function Series() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEpisode, setNewEpisode] = useState({ title: '', url: '', file: null });
  const [addBusy, setAddBusy] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setIndex(0);
    api
      .getSeries(id)
      .then((data) => {
        if (!alive) return;
        setSeries(data.series);
        setEpisodes(data.episodes || []);
        setStatus('ready');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const current = episodes[index];
  const canEdit = Boolean(getUploadKey());

  const firstEpisode = useRef(true);

  useEffect(() => {
    return attachFullscreenRotation(videoRef.current);
  }, [current]);

  /* Episodes roll into each other: when one ends (or you pick another),
     the new episode starts playing as soon as it is loaded. */
  useEffect(() => {
    if (firstEpisode.current) {
      firstEpisode.current = false;
      return;
    }
    setDuration(null);
    const promise = videoRef.current?.play();
    if (promise) promise.catch(() => {});
  }, [index]);

  function handleEnded() {
    if (index + 1 < episodes.length) setIndex(index + 1);
  }

  async function addEpisode(event) {
    event.preventDefault();
    setAddBusy(true);
    setError('');
    try {
      const data = new FormData();
      data.append('title', newEpisode.title.trim());
      if (newEpisode.url.trim()) data.append('video_url', newEpisode.url.trim());
      if (newEpisode.file) data.append('video', newEpisode.file);
      const result = await api.addEpisode(id, data);
      setEpisodes((prev) => [...prev, result.episode]);
      setNewEpisode({ title: '', url: '', file: null });
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddBusy(false);
    }
  }

  async function removeSeries() {
    try {
      await api.deleteSeries(id);
      navigate('/movies');
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen aura">
        <Header />
        <div className="shell pt-10">
          <div className="aspect-video w-full animate-pulse rounded-3xl border border-white/5 bg-white/[0.03]" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen aura">
        <Header />
        <div className="shell flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="font-display text-3xl text-cream">That series isn&rsquo;t here.</p>
          <p className="mt-3 max-w-sm text-sm text-cream/50">{error}</p>
          <Link to="/movies" className="btn-primary mt-7">
            back to our films
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen aura">
      <Header />

      <main className="shell pb-24 pt-8 sm:pt-12">
        <Link
          to="/movies"
          className="mb-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-cream/40 transition hover:text-rose-soft"
        >
          ← our movie corner
        </Link>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-soft">
          {current ? (
            <video
              key={current.id}
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster={series.poster_url || undefined}
              src={current.video_url}
              onEnded={handleEnded}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              className="aspect-video w-full bg-black"
            >
              Your browser can&rsquo;t play this episode.
            </video>
          ) : (
            <div className="grid aspect-video place-items-center text-cream/40">
              No episodes yet.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-rose/70">
            Episode {current?.episode_number ?? 1} of {episodes.length}
            {index + 1 < episodes.length ? ' · next episode plays automatically' : ' · last one'}
          </p>
          {index + 1 < episodes.length && (
            <button
              type="button"
              onClick={() => setIndex(index + 1)}
              className="text-[10px] uppercase tracking-[0.24em] text-cream/35 hover:text-gold-soft"
            >
              skip to episode {current.episode_number + 1} →
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="mb-3 flex items-center gap-3 text-[9px] uppercase tracking-[0.36em] text-gold">
              series
              <span className="h-px w-10 bg-gradient-to-r from-gold/60 to-transparent" />
            </p>
            <h1 className="font-display text-[clamp(2rem,6vw,3.2rem)] leading-tight text-cream">
              {series.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {[series.year, series.genre, `${episodes.length} episodes`]
                .filter(Boolean)
                .map((meta) => (
                  <span
                    key={meta}
                    className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cream/50"
                  >
                    {meta}
                  </span>
                ))}
              {formatDuration(duration) && (
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cream/50">
                  {formatDuration(duration)} this episode
                </span>
              )}
            </div>

            <p className="mt-6 max-w-2xl whitespace-pre-line text-[15px] leading-[1.9] text-cream/65">
              {series.description ||
                'No description yet — but I picked this one for you, and that says enough.'}
            </p>

            <p className="mt-8 font-hand text-2xl text-rose/80">
              Let it run. I&rsquo;ll be right here. ♡
            </p>

            {canEdit && (
              <div className="mt-8 border-t border-white/5 pt-6">
                {confirming ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-cream/50">Remove this whole series?</span>
                    <button
                      type="button"
                      onClick={removeSeries}
                      className="rounded-full border border-rose/40 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-rose-soft hover:bg-rose/10"
                    >
                      yes, remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="text-[10px] uppercase tracking-[0.2em] text-cream/40 hover:text-cream"
                    >
                      keep it
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="text-[10px] uppercase tracking-[0.24em] text-cream/25 transition hover:text-rose"
                  >
                    remove this series
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="lg:pt-10">
            <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">
              <div className="aspect-[2/3]">
                <Poster movie={series} className="h-full w-full" />
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <p className="text-[9px] uppercase tracking-[0.32em] text-cream/35">
                a note for you
              </p>
              <p className="mt-3 font-hand text-[22px] leading-snug text-cream/80">
                &ldquo;One more episode&rdquo; is my favourite way of saying
                &ldquo;stay a little longer&rdquo;.
              </p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-rose/60">— N</p>
            </div>
          </aside>
        </div>

        <section className="mt-14">
          <h2 className="font-display text-2xl text-cream">Episodes</h2>
          <div className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
            {episodes.map((episode, i) => (
              <button
                key={episode.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`flex w-full items-center gap-4 px-4 py-3 text-left transition ${
                  i === index ? 'bg-rose/[0.09]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] ${
                    i === index
                      ? 'border-rose/60 text-rose-soft'
                      : 'border-white/15 text-cream/40'
                  }`}
                >
                  {episode.episode_number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[16px] text-cream/85">
                    {episode.title || `Episode ${episode.episode_number}`}
                  </span>
                  <span className="mt-0.5 block text-[9px] uppercase tracking-[0.2em] text-cream/30">
                    {i === index ? 'playing now' : 'play this one'}
                  </span>
                </span>
                <span className="text-cream/25">▶</span>
              </button>
            ))}
          </div>

          {canEdit && (
            <div className="mt-5">
              {adding ? (
                <form onSubmit={addEpisode} className="glass rounded-2xl p-5">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-cream/40">
                    add episode {episodes.length + 1}
                  </p>
                  <input
                    value={newEpisode.title}
                    onChange={(e) =>
                      setNewEpisode((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Episode title (optional)"
                    className="field mt-3"
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        setNewEpisode((prev) => ({
                          ...prev,
                          file: e.target.files?.[0] || null,
                        }))
                      }
                      className="w-full rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-3 text-xs text-cream/50 file:mr-3 file:rounded-full file:border-0 file:bg-rose/15 file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-widest file:text-rose-soft"
                    />
                    <input
                      type="url"
                      value={newEpisode.url}
                      onChange={(e) =>
                        setNewEpisode((prev) => ({ ...prev, url: e.target.value }))
                      }
                      placeholder="…or a video URL (mp4)"
                      className="field"
                    />
                  </div>
                  {error && <p className="mt-3 text-sm text-rose-soft">{error}</p>}
                  <div className="mt-4 flex items-center gap-4">
                    <button type="submit" disabled={addBusy} className="btn-primary disabled:opacity-50">
                      {addBusy ? 'adding…' : 'add episode'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdding(false)}
                      className="text-[10px] uppercase tracking-[0.22em] text-cream/35 hover:text-cream"
                    >
                      cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="text-[10px] uppercase tracking-[0.24em] text-cream/35 transition hover:text-gold"
                >
                  + add another episode
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
