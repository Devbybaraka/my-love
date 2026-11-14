import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { api, getUploadKey, setUploadKey } from '../lib/api';
import { DEFAULT_LETTER, normalizeLetter } from '../lib/letterDefaults';

const EMPTY = { salutation: '', body: '', signature: '', ps: '' };

export default function LetterEditor() {
  const [unlocked, setUnlocked] = useState(Boolean(getUploadKey()));
  const [passphrase, setPassphrase] = useState('');
  const [letter, setLetter] = useState(DEFAULT_LETTER);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .getLetter()
      .then((data) => {
        if (!alive) return;
        if (data.letter) {
          setLetter(normalizeLetter(data.letter));
          setUpdatedAt(data.letter.updated_at || null);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const update = (key) => (event) =>
    setLetter((prev) => ({ ...prev, [key]: event.target.value }));

  function unlock(event) {
    event.preventDefault();
    if (!passphrase.trim()) return;
    setUploadKey(passphrase.trim());
    setUnlocked(true);
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');
    try {
      const data = await api.saveLetter(letter);
      setLetter(normalizeLetter(data.letter));
      setUpdatedAt(data.letter.updated_at);
      setStatus('saved');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
      if (/passphrase/i.test(err.message)) {
        setUploadKey('');
        setUnlocked(false);
      }
    }
  }

  const paragraphs = letter.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!unlocked) {
    return (
      <div className="min-h-screen aura">
        <Header />
        <main className="shell flex min-h-[75vh] items-center justify-center py-16">
          <form
            onSubmit={unlock}
            className="glass w-full max-w-sm animate-fade-up rounded-3xl p-8 text-center"
          >
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-rose/30 bg-rose/10 text-rose-soft">
              ♥
            </div>
            <h1 className="font-display text-3xl text-cream">Just for me.</h1>
            <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-relaxed text-cream/45">
              This is where I rewrite her letter. Say the word we picked.
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
              open the letter
            </button>
            <Link
              to="/"
              className="mt-5 inline-block text-[10px] uppercase tracking-[0.26em] text-cream/30 hover:text-cream/70"
            >
              back to the letter
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
          the letter
          <span className="h-px w-12 bg-gradient-to-r from-gold/60 to-transparent" />
        </p>
        <h1 className="font-display text-[clamp(2.1rem,6vw,3.2rem)] leading-tight text-cream">
          Change what she reads
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream/50">
          Leave a blank line between paragraphs. Wrap any words in{' '}
          <span className="text-rose-soft">*asterisks*</span> to make them rose
          italic, like a whisper. Save and the letter page updates straight away.
        </p>

        <form onSubmit={save} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="glass space-y-5 rounded-3xl p-6 sm:p-8">
            <div>
              <label className="label" htmlFor="salutation">
                Opening line
              </label>
              <input
                id="salutation"
                value={letter.salutation}
                onChange={update('salutation')}
                className="field"
                placeholder="My dearest,"
              />
            </div>

            <div>
              <label className="label" htmlFor="body">
                The letter
              </label>
              <textarea
                id="body"
                required
                rows="16"
                value={letter.body}
                onChange={update('body')}
                className="field resize-y font-display text-[16px] leading-[1.85]"
                placeholder="Write it the way you'd say it…"
              />
              <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-cream/25">
                {paragraphs.length} paragraph{paragraphs.length === 1 ? '' : 's'}
              </p>
            </div>

            <div>
              <label className="label" htmlFor="signature">
                Signature
              </label>
              <input
                id="signature"
                value={letter.signature}
                onChange={update('signature')}
                className="field"
                placeholder="always yours, Newton"
              />
            </div>

            <div>
              <label className="label" htmlFor="ps">
                P.S.
              </label>
              <textarea
                id="ps"
                rows="2"
                value={letter.ps}
                onChange={update('ps')}
                className="field resize-none"
                placeholder="Something small at the end…"
              />
            </div>

            {error && (
              <p className="rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose-soft">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="submit"
                disabled={status === 'saving'}
                className="btn-primary disabled:opacity-50"
              >
                {status === 'saving' ? 'saving…' : 'save the letter'}
              </button>
              <Link
                to="/"
                className="text-[10px] uppercase tracking-[0.24em] text-cream/35 hover:text-cream"
              >
                read it
              </Link>
              <Link
                to="/upload"
                className="text-[10px] uppercase tracking-[0.24em] text-cream/35 hover:text-cream"
              >
                add a film
              </Link>
            </div>

            {status === 'saved' && (
              <p className="rounded-2xl border border-rose/25 bg-rose/[0.07] px-4 py-3 text-sm text-cream/70">
                Saved. The letter has been updated
                {updatedAt ? ` (${new Date(updatedAt).toLocaleString()})` : ''}.
              </p>
            )}
          </div>

          <aside className="space-y-4">
            <div className="glass rounded-3xl p-6">
              <p className="text-[9px] uppercase tracking-[0.3em] text-cream/35">
                how it will read
              </p>
              <p className="mt-4 font-display text-lg italic text-rose-soft">
                {letter.salutation || 'My dearest,'}
              </p>
              <p className="mt-2 line-clamp-[10] whitespace-pre-line font-display text-[14px] leading-relaxed text-cream/60">
                {(paragraphs[0] || '').replace(/\*/g, '')}
              </p>
              <p className="mt-4 font-hand text-xl text-rose/80">
                {letter.signature || 'always yours, Newton'}
              </p>
            </div>

            <div className="rounded-3xl border border-white/5 p-5">
              <p className="text-[9px] uppercase tracking-[0.3em] text-gold/70">
                a small note
              </p>
              <p className="mt-3 font-hand text-xl leading-snug text-cream/70">
                She opens this page first. Make the first line count.
              </p>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
