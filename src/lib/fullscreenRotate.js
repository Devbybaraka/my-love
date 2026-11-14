// Browsers / OSes often lock the screen orientation (usually to landscape) when a
// video goes fullscreen, which prevents the viewer from rotating the device to
// watch it the way they want. When a video enters fullscreen we unlock the
// orientation so it follows the device, and re-lock-free rotation is allowed.

export function attachFullscreenRotation(video) {
  if (!video) return () => {};

  const unlock = () => {
    try {
      if (screen.orientation && typeof screen.orientation.unlock === 'function') {
        screen.orientation.unlock();
      }
    } catch {
      /* not supported or not allowed — ignore */
    }
    // Some engines expose lock('any') to explicitly allow any orientation.
    try {
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('any').catch(() => {});
      }
    } catch {
      /* ignore */
    }
  };

  const onChange = () => {
    const fsEl =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;
    if (fsEl === video || (fsEl && fsEl.contains && fsEl.contains(video))) {
      unlock();
    }
  };

  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'msfullscreenchange',
  ];
  events.forEach((e) => document.addEventListener(e, onChange));
  // Also unlock on the video's own fullscreen events (iOS/Safari).
  video.addEventListener('webkitbeginfullscreen', unlock);
  video.addEventListener('webkitendfullscreen', () => {});

  return () => {
    events.forEach((e) => document.removeEventListener(e, onChange));
    video.removeEventListener('webkitbeginfullscreen', unlock);
  };
}