// A thin bridge to the Bunny Stream embed.
//
// Films now play inside Bunny's iframe player (adaptive, 700 MB+ fine). The
// iframe speaks the player.js protocol over postMessage, which is enough for us
// to know when an episode ended (so the next one starts) and how far in we are.

export function isBunnyUrl(url) {
  return typeof url === 'string' && url.includes('mediadelivery.net');
}

/**
 * Listens to one Bunny iframe.
 * onEnded() — the film/episode finished.
 * onTime({ seconds, duration }) — playback position (used for resume).
 * Returns a cleanup function.
 */
export function attachBunnyListeners(iframe, { onEnded, onTime } = {}) {
  if (!iframe) return () => {};

  const handle = (event) => {
    if (!iframe.contentWindow || event.source !== iframe.contentWindow) return;
    let data = event.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (!data || typeof data !== 'object') return;
    // player.js wraps everything in this context marker.
    if (data.context && data.context !== 'player.js') return;

    if (data.event === 'ended') {
      onEnded?.();
    } else if (data.event === 'timeupdate' && data.value) {
      onTime?.({
        seconds: Number(data.value.seconds),
        duration: Number(data.value.duration),
      });
    }
  };

  window.addEventListener('message', handle);
  return () => window.removeEventListener('message', handle);
}

/** Unique src per player, as the player.js spec requires. */
export function withFreshParam(url) {
  try {
    const u = new URL(url);
    u.searchParams.set('v', Date.now().toString(36));
    return u.toString();
  } catch {
    return url;
  }
}
