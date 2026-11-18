import { useState } from 'react';

/**
 * A poster that never looks empty: a designed card sits underneath and the
 * image fades in over it once it has actually loaded.
 */
export default function Poster({ movie, className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-blush via-white to-cream ${className}`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
        <span className="text-[8px] uppercase tracking-[0.3em] text-gold-deep/70">
          {movie.genre || 'for us'}
        </span>
        <span className="font-display text-[19px] leading-snug text-ink/80">
          {movie.title}
        </span>
        <span aria-hidden="true" className="text-sm text-gold/85">
          ✦
        </span>
      </div>

      {movie.poster_url && !failed && (
        <img
          src={movie.poster_url}
          alt={movie.title ? `${movie.title} poster` : 'Movie poster'}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 group-hover:scale-[1.04] ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gold/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/25 to-transparent opacity-0 transition group-hover:opacity-100" />
    </div>
  );
}
