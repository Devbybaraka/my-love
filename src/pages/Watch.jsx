import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Poster from '../components/Poster';
import { api, formatDuration, formatClock, getUploadKey } from '../lib/api';
import { attachFullscreenRotation } from '../lib/fullscreenRotate';
import { clearProgress, filmKey, getProgress, saveProgress } from '../lib/progress';

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteBody, setNoteBody] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [resumedAt, setResumedAt] = useState(null);
  const videoRef = useRef(null);
  const lastSaved = useRef(0);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    api
      .getMovie(id)
      .then((data) => {
        if (!alive) return;
        setMovie(data.movie);
        setRelated(data.related || []);
        setNotes(data.notes || []);
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

  const canDelete = Boolean(getUploadKey());

  useEffect(() => {
    return attachFullscreenRotation(videoRef.current);
  }, [movie]);

  /* Pick up where we left off (this device only). */
  function handleMetadata(event) {
    const video = event.currentTarget;
    setDuration(video.duration);
    const saved = getProgress(filmKey(movie.id));
    if (
      saved &&
      Number.isFinite(saved.t) &&
      saved.t > 5 &&
      Number.isFinite(video.duration) &&
      saved.t < video.duration - Math.min(10, video.duration * 0.1)
    ) {
      try {
        video.currentTime = saved.t;
        setResumedAt(saved.t);
      } catch {
        /* seek before the media is ready — skip */
      }
    }
  }

  function handleTimeUpdate(event) {
    const video = event.currentTarget;
    if (!video.duration || video.seeking) return;
    const now = Date.now();
    if (now - lastSaved.current < 4000) return;
    lastSaved.current = now;
    saveProgress(filmKey(movie.id), {
      t: video.currentTime,
      d: video.duration,
      title: movie.title,
      href: `/watch/${movie.id}`,
      kind: 'film',
      id: movie.id,
    });
  }

  async function addNote(event) {
    event.preventDefault();
    if (!noteBody.trim() || noteBusy) return;
    setNoteBusy(true);
    setNoteError('');
    try {
      const result = await api.addNote(movie.id, {
        body: noteBody.trim(),
        author: noteAuthor.trim(),
      });
      setNotes((prev) => [result.note, ...prev]);
      setNoteBody('');
    } catch (err) {
      setNoteError(err.message);
    } finally {
      setNoteBusy(false);
    }
  }

  async function removeNote(noteId) {
    try {
      await api.deleteNote(movie.id, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (err) {
      setNoteError(err.message);
    }
  }

  async function removeMovie() {
    try {
      await api.deleteMovie(id);
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
          <p className="font-display text-3xl text-cream">That one isn&rsquo;t here.</p>
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
          <video
            key={movie.id}
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            poster={movie.poster_url || undefined}
            src={movie.video_url}
            onLoadedMetadata={handleMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              clearProgress(filmKey(movie.id));
              setResumedAt(null);
            }}
            className="aspect-video w-full bg-black"
          >
            Your browser can&rsquo;t play this film.
          </video>
        </div>

        {resumedAt !== null && (
          <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-cream/35">
            picking up at {formatClock(resumedAt)} —{' '}
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0;
                setResumedAt(null);
              }}
              className="underline decoration-cream/20 underline-offset-4 transition hover:text-rose-soft"
            >
              start from the beginning
            </button>
          </p>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="mb-3 flex items-center gap-3 text-[9px] uppercase tracking-[0.36em] text-gold">
              now playing
              <span className="h-px w-10 bg-gradient-to-r from-gold/60 to-transparent" />
            </p>
            <h1 className="font-display text-[clamp(2rem,6vw,3.2rem)] leading-tight text-cream">
              {movie.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {[movie.year, movie.genre, formatDuration(duration)]
                .filter(Boolean)
                .map((meta) => (
                  <span
                    key={meta}
                    className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cream/50"
                  >
                    {meta}
                  </span>
                ))}
            </div>

            <p className="mt-6 max-w-2xl whitespace-pre-line text-[15px] leading-[1.9] text-cream/65">
              {movie.description ||
                'No description yet — but I picked this one for you, and that says enough.'}
            </p>

            <p className="mt-8 font-hand text-2xl text-rose/80">
              Press play. I&rsquo;ll be right here. ♡
            </p>

            {/* her notes */}
            <section className="mt-10 border-t border-white/5 pt-7">
              <p className="text-[9px] uppercase tracking-[0.32em] text-gold/80">
                {notes.length ? 'what she thought' : 'leave a note'}
              </p>

              <form onSubmit={addNote} className="mt-4 space-y-3">
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows="3"
                  maxLength="1000"
                  placeholder="Did you like it? Tell me here…"
                  className="field resize-none"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    value={noteAuthor}
                    onChange={(e) => setNoteAuthor(e.target.value)}
                    maxLength="40"
                    placeholder="your name (optional)"
                    className="field max-w-[220px]"
                  />
                  <button
                    type="submit"
                    disabled={noteBusy || !noteBody.trim()}
                    className="btn-primary disabled:opacity-40"
                  >
                    {noteBusy ? 'sending…' : 'leave it'}
                  </button>
                </div>
                {noteError && <p className="text-sm text-rose-soft">{noteError}</p>}
              </form>

              {notes.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="whitespace-pre-line text-[14px] leading-relaxed text-cream/70">
                          {note.body}
                        </p>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => removeNote(note.id)}
                            className="shrink-0 text-[9px] uppercase tracking-[0.2em] text-cream/25 hover:text-rose"
                          >
                            remove
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-cream/30">
                        {note.author || 'my love'}
                        {note.created_at
                          ? ` · ${new Date(note.created_at).toLocaleDateString()}`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {canDelete && (
              <div className="mt-8 border-t border-white/5 pt-6">
                {confirming ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-cream/50">
                      Remove this film from our corner?
                    </span>
                    <button
                      type="button"
                      onClick={removeMovie}
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
                    remove this film
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="lg:pt-10">
            <div className="glass rounded-3xl p-6">
              <p className="text-[9px] uppercase tracking-[0.32em] text-cream/35">
                a note for you
              </p>
              <p className="mt-3 font-hand text-[22px] leading-snug text-cream/80">
                &ldquo;I&rsquo;d watch the worst film in the world twice if it meant
                sitting next to you.&rdquo;
              </p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-rose/60">
                — N
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-2xl text-cream">
                You may also like
              </h2>
              <span className="text-[9px] uppercase tracking-[0.28em] text-cream/30">
                for us
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-5">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/watch/${item.id}`}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-rose/60"
                >
                  <Poster movie={item} className="aspect-[2/3]" />
                  <h3 className="mt-3 font-display text-[15px] leading-tight text-cream/85 transition group-hover:text-rose-soft">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-cream/30">
                    {[item.year, item.genre].filter(Boolean).join(' · ')}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
