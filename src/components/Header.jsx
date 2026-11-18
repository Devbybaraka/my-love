import { Link, NavLink } from 'react-router-dom';

const linkBase =
  'rounded-full px-2.5 py-2 text-[9px] uppercase tracking-[0.16em] transition sm:px-3 sm:text-[10px] sm:tracking-[0.22em]';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-gold/15 bg-cream/85 backdrop-blur-xl">
      <div className="shell flex h-[60px] items-center justify-between gap-2 sm:h-[72px] sm:gap-3">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/40 bg-white text-[13px] text-gold transition group-hover:border-gold group-hover:shadow-glow sm:h-9 sm:w-9">
            ♥
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block whitespace-nowrap font-display text-[15px] tracking-wide text-ink sm:text-[20px]">
              Our Movie Corner
            </span>
            <span className="mt-0.5 hidden text-[8px] uppercase tracking-[0.34em] text-ink/35 sm:block">
              a little cinema for two
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'text-gold-deep'
                  : 'text-ink/55 hover:text-ink'
              }`
            }
          >
            Letter
          </NavLink>
          <NavLink
            to="/movies"
            className={({ isActive }) =>
              `inline-flex items-center justify-center rounded-full border px-3.5 py-2 text-[9px] uppercase tracking-[0.18em] transition sm:px-5 sm:py-2.5 sm:text-[10px] sm:tracking-[0.22em] ${
                isActive
                  ? 'border-gold bg-gold text-white'
                  : 'border-gold/60 bg-white text-gold-deep hover:border-gold hover:bg-blush-soft'
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
