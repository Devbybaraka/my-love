// Vercel serverless entry point: every /api/* request is rewritten here by
// vercel.json and handled by the Express app in server/index.js, which routes
// on req.url (Vercel preserves the original request path).
export { default } from '../server/index.js';
