// Error monitoring, without an account.
//
// Everything that breaks in the browser is posted to /api/errors and kept in
// Neon, then listed for the owner on /upload. Identical messages are only sent
// once per page load, and only the first handful are reported, so a broken
// render loop can't flood the table.

const SENT_KEY = 'mc_reported';
const MAX_PER_SESSION = 8;

function alreadySent(message) {
  try {
    const sent = JSON.parse(sessionStorage.getItem(SENT_KEY) || '[]');
    return Array.isArray(sent) && sent.includes(message);
  } catch {
    return false;
  }
}

function remember(message) {
  try {
    const sent = JSON.parse(sessionStorage.getItem(SENT_KEY) || '[]');
    const next = [...(Array.isArray(sent) ? sent : []), message].slice(-MAX_PER_SESSION * 2);
    sessionStorage.setItem(SENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function reportError(errorOrMessage, context = {}) {
  const message =
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : errorOrMessage?.message || String(errorOrMessage);
  if (!message) return;
  if (alreadySent(message)) return;
  remember(message);

  const payload = {
    message,
    stack: typeof errorOrMessage === 'object' ? errorOrMessage?.stack || '' : '',
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    context,
  };

  try {
    const body = JSON.stringify(payload);
    // keepalive so a report survives the page unloading.
    if (typeof fetch === 'function') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* never let reporting break the app */
  }
}

export function initMonitoring() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    if (event?.error) reportError(event.error);
    else if (event?.message) reportError(event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event?.reason || 'Unhandled promise rejection');
  });
}
