import { Link, NavLink } from 'react-router-dom';

const linkBase =
  'rounded-full px-2.5 py-2 text-[9px] uppercase tracking-[0.16em] transition sm:px-4 sm:text-[10px] sm:tracking-[0.22em]';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/80 backdrop-blur-xl">
      <div className="shell flex h-[60px] items-center justify-between gap-2 sm:h-[68px] sm:gap-3">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rose/30 bg-rose/10 text-rose-soft transition group-hover:border-rose/60 group-hover:shadow-glow sm:h-9 sm:w-9">
            ♥
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block whitespace-nowrap font-display text-[15px] text-cream sm:text-[19px]">
              Our Movie Corner
            </span>
            <span className="mt-0.5 hidden text-[8px] uppercase tracking-[0.34em] text-cream/35 sm:block">
              a little cinema for two
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'bg-white/[0.06] text-rose-soft'
                  : 'text-cream/50 hover:text-cream'
              }`
            }
          >
            Letter
          </NavLink>
          <NavLink
            to="/movies"
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'bg-white/[0.06] text-rose-soft'
                  : 'text-cream/50 hover:text-cream'
              }`
            }
          >
            Our films
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
