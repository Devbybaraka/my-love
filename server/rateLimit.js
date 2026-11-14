// Small in-memory rate limiter.
//
// On Vercel each function instance keeps its own counters, so this is a
// best-effort speed bump rather than a hard wall. It still stops the realistic
// case: someone sitting on the site guessing the word.

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function rateLimit({ max = 8, windowMs = 15 * 60 * 1000, message } = {}) {
  const hits = new Map();

  return function limiter(req, res, next) {
    const now = Date.now();

    // Keep the map from growing forever.
    if (hits.size > 5000) {
      for (const [key, record] of hits) {
        if (record.reset <= now) hits.delete(key);
      }
    }

    const key = clientIp(req);
    const record = hits.get(key);

    if (!record || record.reset <= now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((record.reset - now) / 1000)));
      return res.status(429).json({
        error: message || 'Too many tries. Give it a little while and try again.',
      });
    }
    next();
  };
}
