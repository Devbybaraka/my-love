import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Poster from '../components/Poster';
import { api, GENRES } from '../lib/api';

const CATEGORIES = ['All', ...GENRES];

export default function Movies() {
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const load = () => {
    setStatus('loading');
    api
      .listMovies()
      .then((data) => {
        setMovies(data.movies || []);
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
    return movies.filter((movie) => {
      const inCategory =
        category === 'All' ||
        (movie.genre || '').toLowerCase() === category.toLowerCase();
      if (!inCategory) return false;
      if (!q) return true;
      return (
        (movie.title || '').toLowerCase().includes(q) ||
        (movie.description || '').toLowerCase().includes(q) ||
        (movie.genre || '').toLowerCase().includes(q)
      );
    });
  }, [movies, query, category]);

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
                  filtered.length === 1 ? 'film' : 'films'
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
                {movies.length === 0
                  ? 'Our corner is empty — for now.'
                  : 'Nothing matches that, my love.'}
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cream/50">
                {movies.length === 0
                  ? 'The first film we watch here should be one that makes you feel held. Add it, and it will be waiting for you.'
                  : 'Try another word, or a different mood. I am happy to be wrong about genres.'}
              </p>
              {movies.length === 0 && (
                <Link to="/upload" className="btn-primary mt-7">
                  add our first film
                </Link>
              )}
            </div>
          )}

          {status === 'ready' && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {filtered.map((movie) => (
                <Link
                  key={movie.id}
                  to={`/watch/${movie.id}`}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-rose/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  <Poster movie={movie} className="aspect-[2/3]" />
                  <div className="mt-3">
                    <h2 className="font-display text-[17px] leading-tight text-cream transition group-hover:text-rose-soft">
                      {movie.title}
                    </h2>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cream/35">
                      {[movie.year, movie.genre].filter(Boolean).join(' · ') ||
                        'a film for us'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
