import { useEffect, useRef, useState } from 'react';
import LetterMarkup from './LetterMarkup.jsx';
import { useLetterEffects } from '../lib/useLetterEffects.js';
import { DEFAULT_LETTER, normalizeLetter } from '../lib/letterDefaults.js';
import '../styles/letter.css';

export default function Landing() {
  const rootRef = useRef(null);
  const [letter, setLetter] = useState(DEFAULT_LETTER);

  useLetterEffects(rootRef);

  useEffect(() => {
    let alive = true;
    fetch('/api/letter')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data && data.letter) setLetter(normalizeLetter(data.letter));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div ref={rootRef} className="letter-root">
      <LetterMarkup letter={letter} />
    </div>
  );
}
