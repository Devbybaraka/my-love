import { useState } from 'react';
import { api } from '../lib/api';

// Sweet, loving ways to say "that's not the word" — a different one each time,
// so a wrong guess still feels like love, not a scolding.
const SWEET_WRONG = [
  "That's incorrect, my love.",
  "That's not the one I told you, baby.",
  "Close, sweetheart — but no.",
  "Not quite, my love. Try again.",
  "That isn't it, baby. You know the one.",
  "Wrong word, but still my favorite person.",
  "Nope, love. The real one is softer.",
  "That's not it, sweetheart.",
];

/**
 * The door. One shared word opens the letter and the films, so the URL on its
 * own shows nothing. The word is checked by the server, never in the browser.
 */
export default function Door({ onUnlocked }) {
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastWrong, setLastWrong] = useState(-1);

  async function submit(event) {
    event.preventDefault();
    if (!word.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.openDoor(word.trim());
      onUnlocked();
    } catch (err) {
      if (err.status === 429) {
        setError(err.message);
      } else {
        let next = Math.floor(Math.random() * SWEET_WRONG.length);
        if (next === lastWrong && SWEET_WRONG.length > 1) {
          next = (next + 1) % SWEET_WRONG.length;
        }
        setLastWrong(next);
        setError(SWEET_WRONG[next]);
      }
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
          There is a little cinema with free movies for you, baby. Say the word
          and it opens.
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
          for Shaniz ♡
        </p>
      </form>
    </div>
  );
}
