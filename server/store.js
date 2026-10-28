// Acesso a dados sobre o SQLite. Só leitura/escrita: as regras ficam em party.js.

const TIMES_SUNG = `(SELECT COUNT(*) FROM round_singers rs JOIN rounds r ON r.id = rs.round_id
                     WHERE rs.guest_id = g.id AND r.status = 'done')`;

const toGuest = row => row && {
  id: row.id,
  name: row.name,
  nameKey: row.name_key,
  avatar: JSON.parse(row.avatar),
  token: row.token,
  leftAt: row.left_at ?? null,
  timesSung: row.times_sung ?? 0,
};

const toSong = row => row && {
  id: row.id,
  videoId: row.video_id,
  url: row.url,
  rawTitle: row.raw_title,
  channel: row.channel,
  thumbnail: row.thumbnail,
  title: row.title,
  artist: row.artist,
  suggestedBy: row.suggested_by,
  indicated: [row.indicated1, row.indicated2].filter(id => id !== null && id !== undefined),
  note: row.note,
  status: row.status,
  createdAt: row.created_at,
};

export function createStore(db) {
  const one = (sql, ...params) => db.prepare(sql).get(...params) ?? null;
  const all = (sql, ...params) => db.prepare(sql).all(...params);
  const run = (sql, ...params) => db.prepare(sql).run(...params);

  function transaction(fn) {
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const getGuest = id => toGuest(one(`SELECT g.*, ${TIMES_SUNG} AS times_sung FROM guests g WHERE g.id = ?`, id));
  const getSong = id => toSong(one('SELECT * FROM songs WHERE id = ?', id));

  return {
    addGuest({ name, nameKey, avatar, token, now }) {
      const { lastInsertRowid } = run(
        'INSERT INTO guests (name, name_key, avatar, token, joined_at) VALUES (?, ?, ?, ?, ?)',
        name, nameKey, JSON.stringify(avatar), token, now);
      return getGuest(Number(lastInsertRowid));
    },
    getGuest,
    findGuestByKey: key => toGuest(one(`SELECT g.*, ${TIMES_SUNG} AS times_sung FROM guests g WHERE g.name_key = ?`, key)),
    findGuestByToken: token => toGuest(one(`SELECT g.*, ${TIMES_SUNG} AS times_sung FROM guests g WHERE g.token = ?`, token)),
    setGuestLeft(id, leftAt) {
      run('UPDATE guests SET left_at = ? WHERE id = ?', leftAt, id);
    },
    listPresentGuests: () => all(
      `SELECT g.*, ${TIMES_SUNG} AS times_sung FROM guests g WHERE g.left_at IS NULL ORDER BY g.joined_at, g.id`,
    ).map(toGuest),

    addSong({ videoId, url, rawTitle, channel, thumbnail, title, artist, suggestedBy, indicated, note, now }) {
      const { lastInsertRowid } = run(
        `INSERT INTO songs (video_id, url, raw_title, channel, thumbnail, title, artist, suggested_by,
                            indicated1, indicated2, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        videoId, url, rawTitle, channel ?? null, thumbnail ?? null, title, artist ?? '', suggestedBy,
        indicated[0] ?? null, indicated[1] ?? null, note ?? '', now);
      return getSong(Number(lastInsertRowid));
    },
    getSong,
    listSongsBySuggester: guestId => all(
      "SELECT * FROM songs WHERE suggested_by = ? AND status != 'deleted' ORDER BY created_at DESC, id DESC",
      guestId,
    ).map(toSong),
    listQueuedSongs: () => all("SELECT * FROM songs WHERE status = 'queued' ORDER BY id").map(toSong),
    setSongStatus(id, status) {
      run('UPDATE songs SET status = ? WHERE id = ?', status, id);
    },

    createRound({ songId, count, type, singerIds, now }) {
      return transaction(() => {
        const { lastInsertRowid } = run(
          'INSERT INTO rounds (song_id, count, type, created_at) VALUES (?, ?, ?, ?)', songId, count, type, now);
        const id = Number(lastInsertRowid);
        singerIds.forEach((guestId, slot) =>
          run('INSERT INTO round_singers (round_id, slot, guest_id) VALUES (?, ?, ?)', id, slot, guestId));
        return { id, songId, count, type, singerIds: [...singerIds] };
      });
    },
    getActiveRound() {
      const row = one("SELECT * FROM rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1");
      if (!row) return null;
      return {
        id: row.id,
        songId: row.song_id,
        count: row.count,
        type: row.type,
        singerIds: all('SELECT guest_id FROM round_singers WHERE round_id = ? ORDER BY slot', row.id).map(r => r.guest_id),
        excludedIds: all('SELECT guest_id FROM round_excluded WHERE round_id = ? ORDER BY guest_id', row.id).map(r => r.guest_id),
      };
    },
    setRoundSinger(roundId, slot, guestId) {
      run('UPDATE round_singers SET guest_id = ? WHERE round_id = ? AND slot = ?', guestId, roundId, slot);
    },
    addRoundExcluded(roundId, guestId) {
      run('INSERT OR IGNORE INTO round_excluded (round_id, guest_id) VALUES (?, ?)', roundId, guestId);
    },
    setRoundType(roundId, type) {
      run('UPDATE rounds SET type = ? WHERE id = ?', type, roundId);
    },
    closeRound(roundId, status, now) {
      run('UPDATE rounds SET status = ?, finished_at = ? WHERE id = ?', status, now, roundId);
    },
    lastDoneRoundSingerIds() {
      const row = one("SELECT id FROM rounds WHERE status = 'done' ORDER BY finished_at DESC, id DESC LIMIT 1");
      if (!row) return [];
      return all('SELECT guest_id FROM round_singers WHERE round_id = ? ORDER BY slot', row.id).map(r => r.guest_id);
    },
    singersOfSong: songId => all(
      `SELECT g.name FROM rounds r
         JOIN round_singers rs ON rs.round_id = r.id
         JOIN guests g ON g.id = rs.guest_id
        WHERE r.song_id = ? AND r.status = 'done'
        ORDER BY r.id DESC, rs.slot`,
      songId,
    ).map(r => r.name),

    reset() {
      transaction(() => {
        for (const table of ['round_excluded', 'round_singers', 'rounds', 'songs', 'guests']) run(`DELETE FROM ${table}`);
      });
    },
  };
}
