import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createStore } from '../server/store.js';
import { createParty } from '../server/party.js';
import { loadDictionary } from '../server/title-parser.js';

const dict = loadDictionary(new URL('../config/palavras-ignoradas.txt', import.meta.url));
const AV = { shape: 1, color: 2, face: 3, acc: 4 };
const LINK = 'https://youtu.be/dQw4w9WgXcQ';
const INFO = { title: 'Queen - Bohemian Rhapsody (Karaoke Version)', channel: 'Sing King', thumbnail: 't' };

function setup(fetchVideoInfo = async () => INFO) {
  const store = createStore(openDb(':memory:'));
  let n = 0;
  const party = createParty({ store, dict, fetchVideoInfo, weights: { suggester: 3, indicated: 8 }, now: () => ++n });
  return { party, store };
}

test('join valida e devolve token', () => {
  const { party } = setup();
  const r = party.join({ name: ' Ana ', avatar: AV });
  assert.equal(r.ok, true);
  assert.match(r.token, /^[0-9a-f]{48}$/);
  assert.equal(r.guest.name, 'Ana');
  assert.deepEqual(r.guest.avatar, AV);
});

test('join: nome repetido com caixa/acento diferente', () => {
  const { party } = setup();
  const ana = party.join({ name: 'Ana', avatar: AV });
  assert.deepEqual(party.join({ name: 'ÁNA', avatar: AV }),
    { ok: false, error: 'name_taken', guest: { id: ana.guest.id, name: 'Ana', avatar: AV } });
});

test('join: nome e avatar inválidos', () => {
  const { party } = setup();
  assert.deepEqual(party.join({ name: 'Ana', avatar: { ...AV, shape: 99 } }), { ok: false, error: 'invalid_avatar' });
  assert.deepEqual(party.join({ name: '', avatar: AV }), { ok: false, error: 'invalid_name' });
});

test('reclaim devolve o mesmo convidado e token', () => {
  const { party } = setup();
  const ana = party.join({ name: 'Ana', avatar: AV });
  const again = party.reclaim({ name: 'ana' });
  assert.equal(again.ok, true);
  assert.equal(again.guest.id, ana.guest.id);
  assert.equal(again.token, ana.token);
  assert.deepEqual(party.reclaim({ name: 'Zé' }), { ok: false, error: 'unknown' });
});

test('leave, resume e presentGuests', () => {
  const { party } = setup();
  const ana = party.join({ name: 'Ana', avatar: AV });
  party.join({ name: 'Bia', avatar: AV });
  party.leave(ana.guest.id);
  assert.deepEqual(party.presentGuests().map(g => g.name), ['Bia']);
  assert.equal(party.resume(ana.token).id, ana.guest.id);
  assert.deepEqual(party.presentGuests().map(g => g.name), ['Ana', 'Bia']);
  assert.equal(party.resume('x'), null);
});

test('preview: erros e sucesso', async () => {
  assert.deepEqual(await setup().party.preview('abc'), { ok: false, error: 'invalid_link' });
  assert.deepEqual(await setup(async () => null).party.preview(LINK), { ok: false, error: 'not_found' });
  assert.deepEqual(await setup(async () => { throw new Error('lookup_failed'); }).party.preview(LINK), { ok: false, error: 'lookup_failed' });
  assert.deepEqual(await setup().party.preview(LINK),
    { ok: true, videoId: 'dQw4w9WgXcQ', title: 'Bohemian Rhapsody', artist: 'Queen', thumbnail: 't' });
});

test('addSong: validações', async () => {
  const { party } = setup();
  const ana = party.join({ name: 'Ana', avatar: AV }).guest;
  const bia = party.join({ name: 'Bia', avatar: AV }).guest;
  const leo = party.join({ name: 'Léo', avatar: AV }).guest;
  const base = { url: LINK, title: 'Bohemian Rhapsody', artist: 'Queen', indicated: [], note: '' };
  assert.deepEqual(await party.addSong(ana.id, { ...base, indicated: [ana.id, bia.id, leo.id] }), { ok: false, error: 'too_many_indicated' });
  assert.deepEqual(await party.addSong(ana.id, { ...base, indicated: [bia.id, bia.id] }), { ok: false, error: 'invalid_indicated' });
  assert.deepEqual(await party.addSong(ana.id, { ...base, indicated: [999] }), { ok: false, error: 'invalid_indicated' });
  party.leave(leo.id);
  assert.deepEqual(await party.addSong(ana.id, { ...base, indicated: [leo.id] }), { ok: false, error: 'invalid_indicated' });
  assert.deepEqual(await party.addSong(ana.id, { ...base, note: 'x'.repeat(61) }), { ok: false, error: 'note_too_long' });
  assert.deepEqual(await party.addSong(ana.id, { ...base, title: '  ' }), { ok: false, error: 'invalid_title' });
  assert.deepEqual(await party.addSong(ana.id, { ...base, url: 'abc' }), { ok: false, error: 'invalid_link' });
});

test('addSong válido aparece em mySongs só de quem mandou', async () => {
  const { party } = setup();
  const ana = party.join({ name: 'Ana', avatar: AV }).guest;
  const bia = party.join({ name: 'Bia', avatar: AV }).guest;
  const r = await party.addSong(ana.id, {
    url: LINK, title: ' Bohemian Rhapsody ', artist: 'Queen', indicated: [bia.id, ana.id], note: 'essa é a sua cara!',
  });
  assert.equal(r.ok, true);
  const [first] = party.mySongs(ana.id);
  assert.deepEqual(first, {
    id: r.song.id, title: 'Bohemian Rhapsody', artist: 'Queen', thumbnail: 't',
    indicated: ['Bia', 'Ana'], note: 'essa é a sua cara!', status: 'queued', sungBy: [],
  });
  assert.deepEqual(party.mySongs(bia.id), []);
});

test('deleteSong só do dono e só na fila', async () => {
  const { party } = setup();
  const ana = party.join({ name: 'Ana', avatar: AV }).guest;
  const bia = party.join({ name: 'Bia', avatar: AV }).guest;
  const { song } = await party.addSong(ana.id, { url: LINK, title: 'X', artist: '', indicated: [], note: '' });
  assert.deepEqual(party.deleteSong(bia.id, song.id), { ok: false, error: 'not_found' });
  assert.deepEqual(party.deleteSong(ana.id, song.id), { ok: true });
  assert.deepEqual(party.mySongs(ana.id), []);
  assert.deepEqual(party.deleteSong(ana.id, song.id), { ok: false, error: 'not_queued' });
});
