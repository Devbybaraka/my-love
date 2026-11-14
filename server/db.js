import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    '[db] DATABASE_URL is missing. Copy .env.example to .env and paste your Neon connection string.'
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => console.error('[db] idle client error:', err.message));

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    year INT,
    poster_url TEXT,
    video_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS series (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    year INT,
    poster_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id SERIAL PRIMARY KEY,
    series_id INT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    episode_number INT NOT NULL,
    title TEXT,
    video_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (series_id, episode_number)
  );

  CREATE TABLE IF NOT EXISTS letter (
    id INT PRIMARY KEY,
    salutation TEXT NOT NULL DEFAULT 'My dearest,',
    body TEXT NOT NULL,
    signature TEXT NOT NULL DEFAULT 'always yours, Newton',
    ps TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

export async function initSchema() {
  await pool.query(SCHEMA);
}
