import { randomBytes } from 'node:crypto';
import { nameKey, validateName } from './names.js';
import { isValidAvatar } from '../public/shared/avatar.js';
import { parseVideoId } from './youtube.js';
import { parseTitle } from './title-parser.js';
import { pickSong, chooseCount, pickSingers, revealType } from './draw.js';

const TITLE_MAX = 120;
const NOTE_MAX = 60;
const INDICATED_MAX = 2;
const REEL_SONGS = 12;

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

  // Indicação de quem saiu da festa é ignorada (spec §10.3).
  function songForDraw(song, present) {
    const presentIds = new Set(present.map(g => g.id));
    return { id: song.id, suggestedBy: song.suggestedBy, indicated: song.indicated.filter(id => presentIds.has(id)) };
  }

  function roundView(round) {
    const song = store.getSong(round.songId);
    const { indicated } = songForDraw(song, store.listPresentGuests());
    return {
      id: round.id,
      count: round.count,
      forcedDuo: round.count === 2 && indicated.length === 2,
      type: round.type,
      song: {
        id: song.id,
        videoId: song.videoId,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
        note: song.note,
        suggestedBy: toPublic(store.getGuest(song.suggestedBy)),
        indicated: indicated.map(id => toPublic(store.getGuest(id))),
      },
      singers: round.singerIds.map(id => toPublic(store.getGuest(id))),
    };
  }

  function shuffled(items) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function closeActive(status) {
    const round = store.getActiveRound();
    if (!round) return { ok: false, error: 'no_round' };
    const song = store.getSong(round.songId);
    if (status === 'failed') store.setSongStatus(song.id, 'failed');
    store.closeRound(round.id, status, now());
    return { ok: true, suggestedBy: song.suggestedBy };
  }

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

    draw() {
      const present = store.listPresentGuests();
      if (!present.length) return { ok: false, error: 'no_guests' };
      if (store.getActiveRound()) return { ok: false, error: 'round_active' };
      const queued = store.listQueuedSongs();
      if (!queued.length) return { ok: false, error: 'empty_queue' };

      const chosen = pickSong(queued, rng);
      const song = songForDraw(chosen, present);
      const { count } = chooseCount({ indicatedCount: song.indicated.length, poolSize: present.length, rng });
      const singerIds = pickSingers({
        guests: present, song, count, lastRoundIds: store.lastDoneRoundSingerIds(), excludeIds: [], weights, rng,
      });
      store.setSongStatus(chosen.id, 'drawn');
      const round = store.createRound({
        songId: chosen.id, count: singerIds.length, type: revealType(song, singerIds), singerIds, now: now(),
      });
      const others = shuffled(queued.filter(s => s.id !== chosen.id)).slice(0, REEL_SONGS);
      return {
        ok: true,
        round: roundView(round),
        reel: { songs: others.map(s => ({ title: s.title, artist: s.artist })), guests: present.map(toPublic) },
      };
    },

    replaceSinger(slot) {
      const round = store.getActiveRound();
      if (!round) return { ok: false, error: 'no_round' };
      if (!Number.isInteger(slot) || slot < 0 || slot >= round.singerIds.length) return { ok: false, error: 'invalid_slot' };
      const present = store.listPresentGuests();
      const song = songForDraw(store.getSong(round.songId), present);
      const current = round.singerIds[slot];
      const [next] = pickSingers({
        guests: present,
        song,
        count: 1,
        lastRoundIds: store.lastDoneRoundSingerIds(),
        excludeIds: [...round.excludedIds, ...round.singerIds],
        weights,
        rng,
      });
      if (next === undefined) return { ok: false, error: 'no_alternative' };
      const singerIds = round.singerIds.map((id, i) => (i === slot ? next : id));
      store.addRoundExcluded(round.id, current);
      store.setRoundSinger(round.id, slot, next);
      store.setRoundType(round.id, revealType(song, singerIds));
      return { ok: true, round: roundView(store.getActiveRound()), reel: { guests: present.map(toPublic) } };
    },

    finishRound: () => closeActive('done'),
    failRound: () => closeActive('failed'),

    newParty() {
      store.reset();
      return { ok: true };
    },

    tvState() {
      const round = store.getActiveRound();
      return {
        phase: round ? 'round' : 'lobby',
        guests: store.listPresentGuests().map(toPublic),
        queueCount: store.listQueuedSongs().length,
        round: round ? roundView(round) : null,
      };
    },
  };
}
