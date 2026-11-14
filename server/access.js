// The door: one shared word that opens the whole site, so the letter and the
// films aren't readable by anyone who happens to find the URL.
//
// The word is checked here (never shipped to the browser). A successful check
// sets a signed, http-only cookie; every read endpoint requires it. Changing
// the word invalidates every existing cookie, because the token is derived
// from the word itself.

import crypto from 'node:crypto';

const COOKIE_NAME = 'mc_door';
const TOKEN_MESSAGE = 'our-movie-corner-door-v1';

const ACCESS_WORD = (process.env.SITE_PASSCODE || process.env.UPLOAD_PASSCODE || '').trim();

/** True when a word is configured. With no word set the site stays open. */
export const accessRequired = Boolean(ACCESS_WORD);

const TOKEN = accessRequired
  ? crypto.createHmac('sha256', ACCESS_WORD).update(TOKEN_MESSAGE).digest('hex')
  : '';

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function wordIsRight(word) {
  if (!accessRequired) return true;
  return safeEqual(String(word || '').trim(), ACCESS_WORD);
}

export function readCookies(header) {
  const out = {};
  if (!header) return out;
  String(header)
    .split(';')
    .forEach((part) => {
      const index = part.indexOf('=');
      if (index < 0) return;
      const name = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (name) out[name] = decodeURIComponent(value);
    });
  return out;
}

export function hasDoor(req) {
  if (!accessRequired) return true;
  const cookies = readCookies(req.headers.cookie);
  const value = cookies[COOKIE_NAME];
  return Boolean(value) && safeEqual(value, TOKEN);
}

function isHttps(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '');
  return req.secure || proto.includes('https');
}

export function setDoorCookie(req, res) {
  if (!accessRequired) return;
  res.cookie(COOKIE_NAME, TOKEN, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(req),
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });
}

export function clearDoorCookie(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Blocks content reads until the word has been said. */
export function requireAccess(req, res, next) {
  if (hasDoor(req)) return next();
  res.status(401).json({ error: 'Say the word first.', locked: true });
}
