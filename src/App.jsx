import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Movies from './pages/Movies';
import Watch from './pages/Watch';
import Upload from './pages/Upload';
import LetterEditor from './pages/LetterEditor';
import Series from './pages/Series';
import Door from './components/Door';
import { api } from './lib/api';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  // The door: if a word is configured on the server, nothing renders until it
  // has been said. `required: false` (no word set) leaves the site open.
  const [door, setDoor] = useState({ status: 'checking', required: false, ok: true });

  useEffect(() => {
    let alive = true;
    api
      .getAccess()
      .then((data) => {
        if (!alive) return;
        setDoor({ status: 'ready', required: Boolean(data.required), ok: Boolean(data.ok) });
      })
      .catch(() => {
        // Never trap someone behind a broken door check.
        if (alive) setDoor({ status: 'ready', required: false, ok: true });
      });

    const onLocked = () =>
      setDoor((prev) => ({ ...prev, required: true, ok: false }));
    window.addEventListener('mc-locked', onLocked);
    return () => {
      alive = false;
      window.removeEventListener('mc-locked', onLocked);
    };
  }, []);

  if (door.status === 'checking') {
    return (
      <div className="aura grid min-h-screen place-items-center">
        <span className="animate-pulse font-display text-2xl text-ink/45">♥</span>
      </div>
    );
  }

  if (door.required && !door.ok) {
    return <Door onUnlocked={() => setDoor({ status: 'ready', required: true, ok: true })} />;
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/letter" element={<LetterEditor />} />
        <Route path="/series/:id" element={<Series />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
