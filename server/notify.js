// "A new film is waiting" emails, sent with Resend.
//
// Optional: with no RESEND_API_KEY / NOTIFY_EMAIL set every call is a quiet
// no-op, so uploads never fail because of email. Sending is deliberately
// fire-and-forget — the film is saved either way.

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const NOTIFY_TO = (process.env.NOTIFY_EMAIL || '').trim();
const NOTIFY_FROM = process.env.NOTIFY_FROM || 'Our Movie Corner <onboarding@resend.dev>';

export const notificationsReady = Boolean(RESEND_KEY && NOTIFY_TO);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function notifyNewThing({ title, kind = 'film', description = '', extra = '', link = '' }) {
  if (!notificationsReady) return false;

  const isEpisode = kind === 'episode';
  const subject = isEpisode
    ? `A new episode of ${title} is waiting`
    : `A new film is waiting: ${title}`;

  const html = `
    <div style="background:#0b0810;padding:32px;font-family:Georgia,serif;color:#f5eef2">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c98b9e;margin:0 0 18px">
        our movie corner
      </p>
      <h1 style="font-size:26px;font-weight:400;margin:0 0 12px">
        ${escapeHtml(isEpisode ? `A new episode of ${title}` : title)}
      </h1>
      ${description ? `<p style="font-size:15px;line-height:1.7;color:#cbbfc7;margin:0 0 14px">${escapeHtml(description)}</p>` : ''}
      ${extra ? `<p style="font-size:13px;color:#9a8f97;margin:0 0 22px">${escapeHtml(extra)}</p>` : ''}
      ${link ? `<p style="margin:0 0 6px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#a8455f;color:#fff;text-decoration:none;font-size:13px">open it</a></p>` : ''}
      <p style="font-size:13px;color:#7d737a;margin:26px 0 0">Press play. I'll be right here. ♡</p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        subject,
        html,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn('[notify] could not send:', response.status, text.slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[notify] failed:', error.message);
    return false;
  }
}
