import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  avatar TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  joined_at INTEGER NOT NULL,
  left_at INTEGER
);
CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY,
  video_id TEXT NOT NULL,
  url TEXT NOT NULL,
  raw_title TEXT NOT NULL,
  channel TEXT,
  thumbnail TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  suggested_by INTEGER NOT NULL REFERENCES guests(id),
  indicated1 INTEGER REFERENCES guests(id),
  indicated2 INTEGER REFERENCES guests(id),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'drawn', 'deleted', 'failed')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id),
  count INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'failed')),
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE TABLE IF NOT EXISTS round_singers (
  round_id INTEGER NOT NULL REFERENCES rounds(id),
  slot INTEGER NOT NULL,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  PRIMARY KEY (round_id, slot)
);
CREATE TABLE IF NOT EXISTS round_excluded (
  round_id INTEGER NOT NULL REFERENCES rounds(id),
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  PRIMARY KEY (round_id, guest_id)
);
`;

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}
