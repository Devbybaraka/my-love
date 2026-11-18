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
    <div className="aura flex min-h-screen items-center justify-center bg-cream px-5 py-16">
      <form
        onSubmit={submit}
        className="w-full max-w-sm animate-fade-up rounded-[26px] border border-gold/25 bg-white p-9 text-center shadow-soft"
      >
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full border border-gold/35 bg-blush-soft text-[15px] text-gold">
          ♥
        </div>
        <h1 className="font-display text-[34px] leading-tight text-ink">Just for us.</h1>
        <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-relaxed text-ink/55">
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
          className="field mt-7 text-center"
          aria-label="Our word"
        />

        {error && (
          <p className="mt-3 rounded-2xl border border-blush-deep/25 bg-blush-soft px-4 py-2.5 text-sm text-blush-deep">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full disabled:opacity-50">
          {busy ? 'opening…' : 'open it'}
        </button>

        <p className="mt-6 font-hand text-[22px] text-gold-deep">
          for Shaniz ♡
        </p>
      </form>
    </div>
  );
}
