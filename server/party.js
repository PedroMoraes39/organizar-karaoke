import { randomBytes } from 'node:crypto';
import { nameKey, validateName } from './names.js';
import { isValidAvatar } from '../public/shared/avatar.js';
import { parseVideoId } from './youtube.js';
import { parseTitle } from './title-parser.js';

const TITLE_MAX = 120;
const NOTE_MAX = 60;
const INDICATED_MAX = 2;

const toPublic = g => ({ id: g.id, name: g.name, avatar: g.avatar });

// Regras do domínio (spec §7–§10). O socket só traduz eventos para estas chamadas.
export function createParty({ store, dict, fetchVideoInfo, weights, rng = Math.random, now = Date.now }) {
  const infoCache = new Map();

  async function lookup(url) {
    const videoId = parseVideoId(url);
    if (!videoId) return { ok: false, error: 'invalid_link' };
    let info = infoCache.get(videoId);
    if (!info) {
      try {
        info = await fetchVideoInfo(videoId);
      } catch {
        return { ok: false, error: 'lookup_failed' };
      }
      if (!info) return { ok: false, error: 'not_found' };
      infoCache.set(videoId, info);
    }
    return { ok: true, videoId, info };
  }

  function toMySong(song) {
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      indicated: song.indicated.map(id => store.getGuest(id)?.name).filter(Boolean),
      note: song.note,
      status: song.status,
      sungBy: song.status === 'drawn' ? store.singersOfSong(song.id) : [],
    };
  }

  const isPresent = id => {
    const g = store.getGuest(id);
    return Boolean(g) && g.leftAt === null;
  };

  return {
    join({ name, avatar }) {
      const valid = validateName(name);
      if (!valid.ok) return { ok: false, error: 'invalid_name' };
      if (!isValidAvatar(avatar)) return { ok: false, error: 'invalid_avatar' };
      const key = nameKey(valid.name);
      const existing = store.findGuestByKey(key);
      if (existing) return { ok: false, error: 'name_taken', guest: toPublic(existing) };
      const token = randomBytes(24).toString('hex');
      const guest = store.addGuest({
        name: valid.name,
        nameKey: key,
        avatar: { shape: avatar.shape, color: avatar.color, face: avatar.face, acc: avatar.acc },
        token,
        now: now(),
      });
      return { ok: true, token, guest: toPublic(guest) };
    },

    reclaim({ name }) {
      const guest = store.findGuestByKey(nameKey(name));
      if (!guest) return { ok: false, error: 'unknown' };
      store.setGuestLeft(guest.id, null);
      return { ok: true, token: guest.token, guest: toPublic(guest) };
    },

    resume(token) {
      const guest = token ? store.findGuestByToken(String(token)) : null;
      if (!guest) return null;
      if (guest.leftAt !== null) store.setGuestLeft(guest.id, null);
      return toPublic(guest);
    },

    leave(guestId) {
      store.setGuestLeft(guestId, now());
      return { ok: true };
    },

    presentGuests: () => store.listPresentGuests().map(toPublic),

    async preview(url) {
      const found = await lookup(url);
      if (!found.ok) return found;
      const { title, artist } = parseTitle(found.info.title, found.info.channel, dict);
      return { ok: true, videoId: found.videoId, title, artist, thumbnail: found.info.thumbnail };
    },

    async addSong(guestId, { url, title, artist, indicated, note }) {
      if (!parseVideoId(url)) return { ok: false, error: 'invalid_link' };
      const ids = Array.isArray(indicated) ? indicated : [];
      if (ids.length > INDICATED_MAX) return { ok: false, error: 'too_many_indicated' };
      if (new Set(ids).size !== ids.length || !ids.every(id => Number.isInteger(id) && isPresent(id))) {
        return { ok: false, error: 'invalid_indicated' };
      }
      const cleanNote = String(note ?? '').trim();
      if (cleanNote.length > NOTE_MAX) return { ok: false, error: 'note_too_long' };
      const cleanTitle = String(title ?? '').trim().slice(0, TITLE_MAX);
      if (!cleanTitle) return { ok: false, error: 'invalid_title' };

      const found = await lookup(url);
      if (!found.ok) return found;
      const song = store.addSong({
        videoId: found.videoId,
        url: String(url).trim(),
        rawTitle: found.info.title,
        channel: found.info.channel,
        thumbnail: found.info.thumbnail,
        title: cleanTitle,
        artist: String(artist ?? '').trim().slice(0, TITLE_MAX),
        suggestedBy: guestId,
        indicated: ids,
        note: cleanNote,
        now: now(),
      });
      return { ok: true, song: toMySong(song) };
    },

    deleteSong(guestId, songId) {
      const song = store.getSong(songId);
      if (!song || song.suggestedBy !== guestId) return { ok: false, error: 'not_found' };
      if (song.status !== 'queued') return { ok: false, error: 'not_queued' };
      store.setSongStatus(song.id, 'deleted');
      return { ok: true };
    },

    mySongs: guestId => store.listSongsBySuggester(guestId).map(toMySong),
  };
}
