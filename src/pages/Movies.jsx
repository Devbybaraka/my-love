import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Poster from '../components/Poster';
import { api, GENRES, formatClock } from '../lib/api';
import { listProgress, progressRatio } from '../lib/progress';

const CATEGORIES = ['All', ...GENRES];

function byNewest(a, b) {
  const dateA = new Date(a.created_at || 0).getTime();
  const dateB = new Date(b.created_at || 0).getTime();
  return dateB - dateA;
}

export default function Movies() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [resume, setResume] = useState([]);

  // Half-watched things live on this device, so read them when the page opens.
  useEffect(() => {
    setResume(listProgress().slice(0, 4));
  }, []);

  const filmProgress = useMemo(() => {
    const map = {};
    listProgress().forEach((entry) => {
      if (entry.kind === 'film') map[entry.id] = entry;
    });
    return map;
  }, [resume]);

  const load = () => {
    setStatus('loading');
    Promise.all([api.listMovies(), api.listSeries()])
      .then(([films, series]) => {
        const merged = [
          ...(films.movies || []).map((movie) => ({ ...movie, kind: 'movie' })),
          ...(series.series || []).map((show) => ({ ...show, kind: 'series' })),
        ].sort(byNewest);
        setItems(merged);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const inCategory =
        category === 'All' ||
        (item.genre || '').toLowerCase() === category.toLowerCase();
      if (!inCategory) return false;
      if (!q) return true;
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.genre || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  return (
    <div className="min-h-screen aura">
      <Header />

      <main className="shell pb-24 pt-12 sm:pt-16">
        <p className="mb-4 flex items-center gap-3 text-[9px] uppercase tracking-[0.4em] text-gold">
          a little cinema
          <span className="h-px w-12 bg-gradient-to-r from-gold/60 to-transparent" />
        </p>

        <h1 className="font-display text-[clamp(2.4rem,8vw,4rem)] leading-[1.05] text-cream">
          Our Movie Corner
        </h1>
        <p className="mt-3 font-hand text-[26px] leading-tight text-rose">
          Pick anything, baby.
        </p>
        <p className="mt-5 max-w-md text-[14px] leading-relaxed text-cream/50">
          Every film in here is one I want to watch with you — your head on my
          shoulder, my hand in yours, the world on pause for two hours.
        </p>

        {resume.length > 0 && (
          <section className="mt-8">
            <p className="mb-3 text-[9px] uppercase tracking-[0.34em] text-gold/80">
              keep going
            </p>
            <div className="no-bar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
              {resume.map((entry) => (
                <Link
                  key={entry.key}
                  to={entry.href}
                  className="group w-[210px] shrink-0 rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-rose/40"
                >
                  <p className="truncate font-display text-[15px] text-cream/85 transition group-hover:text-rose-soft">
                    {entry.title || 'Untitled'}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-cream/30">
                    {formatClock(entry.t)} watched
                  </p>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-rose/70"
                      style={{ width: `${Math.round(progressRatio(entry) * 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* search + filters */}
        <div className="mt-9 space-y-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream/30">
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search our films…"
              aria-label="Search movies"
              className="field pl-10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] uppercase tracking-widest text-cream/40 hover:text-cream"
              >
                clear
              </button>
            )}
          </div>

          <div className="no-bar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition ${
                    active
                      ? 'border-rose/60 bg-rose/15 text-rose-soft shadow-glow'
                      : 'border-white/10 text-cream/45 hover:border-white/25 hover:text-cream/80'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* results */}
        <div className="mt-8 flex items-center justify-between text-[10px] uppercase tracking-[0.26em] text-cream/30">
          <span>
            {status === 'ready'
              ? `${filtered.length} ${
                  filtered.length === 1 ? 'title' : 'titles'
                } for us`
              : 'finding the good ones…'}
          </span>
          <Link to="/upload" className="text-cream/30 transition hover:text-gold">
            + add one
          </Link>
        </div>

        <div className="mt-4">
          {status === 'loading' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-[2/3] animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
                />
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="glass rounded-3xl p-8 text-center">
              <p className="font-display text-2xl text-cream">
                The projector isn&rsquo;t warm yet.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-cream/50">{error}</p>
              <button type="button" onClick={load} className="btn-ghost mt-6">
                try again
              </button>
            </div>
          )}

          {status === 'ready' && filtered.length === 0 && (
            <div className="glass rounded-3xl px-6 py-14 text-center">
              <div aria-hidden="true" className="mb-4 text-3xl text-rose/50">
                ❦
              </div>
              <p className="font-display text-2xl text-cream">
                {items.length === 0
                  ? 'Our corner is empty — for now.'
                  : 'Nothing matches that, my love.'}
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream/50">
                {items.length === 0
                  ? 'The first film we watch here should be one that makes you feel held. Add it, and it will be waiting for you.'
                  : 'Try another word, or a different mood. I am happy to be wrong about genres.'}
              </p>
              {items.length === 0 && (
                <Link to="/upload" className="btn-primary mt-7">
                  add our first film
                </Link>
              )}
            </div>
          )}

          {status === 'ready' && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {filtered.map((item) => {
                const isSeries = item.kind === 'series';
                return (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    to={isSeries ? `/series/${item.id}` : `/watch/${item.id}`}
                    className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-rose/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                  >
                    <div className="relative">
                      <Poster movie={item} className="aspect-[2/3]" />
                      {!isSeries && filmProgress[item.id] && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                          <div
                            className="h-full bg-rose/80"
                            style={{
                              width: `${Math.round(progressRatio(filmProgress[item.id]) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                      {isSeries && (
                        <span className="absolute left-3 top-3 rounded-full border border-rose/40 bg-ink/85 px-2.5 py-1 text-[8px] uppercase tracking-[0.24em] text-rose-soft backdrop-blur">
                          series
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <h2 className="font-display text-[17px] leading-tight text-cream transition group-hover:text-rose-soft">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cream/35">
                        {isSeries
                          ? `series · ${item.episode_count} ${
                              item.episode_count === 1 ? 'episode' : 'episodes'
                            }`
                          : [item.year, item.genre].filter(Boolean).join(' · ') ||
                            'a film for us'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
