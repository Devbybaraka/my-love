// Vercel serverless entry point: every /api/* request is handled by the
// Express app in server/index.js. `npm run dev` / `npm start` still use
// server/index.js directly, where it also serves the built React app.
export { default } from '../server/index.js';
