import { pool, initSchema } from './db.js';

await initSchema();
const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM movies');
console.log(`[db] movies table ready — ${rows[0].n} film(s) in the corner.`);
await pool.end();
