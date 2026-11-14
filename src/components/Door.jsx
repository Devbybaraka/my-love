import { useState } from 'react';
import { api } from '../lib/api';

/**
 * The door. One shared word opens the letter and the films, so the URL on its
 * own shows nothing. The word is checked by the server, never in the browser.
 */
export default function Door({ onUnlocked }) {
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!word.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.openDoor(word.trim());
      onUnlocked();
    } catch (err) {
      setError(err.message);
      setWord('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aura flex min-h-screen items-center justify-center px-5 py-16">
      <form
        onSubmit={submit}
        className="glass w-full max-w-sm rounded-3xl p-8 text-center animate-fade-up"
      >
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-rose/30 bg-rose/10 text-rose-soft">
          ♥
        </div>
        <h1 className="font-display text-3xl text-cream">Just for us.</h1>
        <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-relaxed text-cream/45">
          There is a letter in here, and a little cinema. Say the word we picked
          and it&rsquo;s yours.
        </p>

        <input
          type="password"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="our word"
          autoFocus
          autoComplete="current-password"
          className="field mt-6 text-center"
          aria-label="Our word"
        />

        {error && (
          <p className="mt-3 rounded-2xl border border-rose/30 bg-rose/10 px-4 py-2.5 text-sm text-rose-soft">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full disabled:opacity-50">
          {busy ? 'opening…' : 'open it'}
        </button>

        <p className="mt-5 font-hand text-lg text-rose/70">
          for Newton &amp; his girl ♡
        </p>
      </form>
    </div>
  );
}
