import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createStore } from '../server/store.js';

const AV = { shape: 1, color: 2, face: 3, acc: 4 };

function setup() {
  const store = createStore(openDb(':memory:'));
  let n = 0;
  const guest = (name) => store.addGuest({ name, nameKey: name.toLowerCase(), avatar: AV, token: `tok-${name}`, now: ++n });
  const song = (suggestedBy, title, extra = {}) => store.addSong({
    videoId: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ', rawTitle: title, channel: 'c', thumbnail: 't',
    title, artist: 'Artista', suggestedBy, indicated: [], note: '', now: ++n, ...extra,
  });
  return { store, guest, song, now: () => ++n };
}

test('convidados: achar por chave e token, avatar desserializado', () => {
  const { store, guest } = setup();
  const ana = guest('Ana');
  assert.equal(store.findGuestByKey('ana').id, ana.id);
  assert.equal(store.findGuestByToken('tok-Ana').id, ana.id);
  assert.deepEqual(store.getGuest(ana.id).avatar, AV);
  assert.equal(store.findGuestByKey('zzz'), null);
});

test('convidados: chave repetida lança erro', () => {
  const { store, guest } = setup();
  guest('Ana');
  assert.throws(() => store.addGuest({ name: 'ANA', nameKey: 'ana', avatar: AV, token: 'x', now: 9 }));
});

test('convidados: sair e voltar', () => {
  const { store, guest } = setup();
  const ana = guest('Ana');
  guest('Bia');
  store.setGuestLeft(ana.id, 123);
  assert.deepEqual(store.listPresentGuests().map(g => g.name), ['Bia']);
  store.setGuestLeft(ana.id, null);
  assert.deepEqual(store.listPresentGuests().map(g => g.name), ['Ana', 'Bia']);
});

test('músicas: listas por quem mandou e fila', () => {
  const { store, guest, song } = setup();
  const ana = guest('Ana');
  const bia = guest('Bia');
  const s1 = song(ana.id, 'Primeira', { indicated: [bia.id] });
  const s2 = song(ana.id, 'Segunda');
  const s3 = song(ana.id, 'Apagada');
  store.setSongStatus(s3.id, 'deleted');
  store.setSongStatus(s2.id, 'drawn');
  assert.deepEqual(store.listSongsBySuggester(ana.id).map(s => s.title), ['Segunda', 'Primeira']);
  assert.deepEqual(store.listQueuedSongs().map(s => s.title), ['Primeira']);
  assert.deepEqual(store.getSong(s1.id).indicated, [bia.id]);
});

test('rodadas: ativa, encerrada, vezes que cantou', () => {
  const { store, guest, song, now } = setup();
  const ana = guest('Ana');
  const bia = guest('Bia');
  const s = song(ana.id, 'Evidências');
  const r = store.createRound({ songId: s.id, count: 2, type: 'own', singerIds: [ana.id, bia.id], now: now() });
  assert.deepEqual(store.getActiveRound(), { id: r.id, songId: s.id, count: 2, type: 'own', singerIds: [ana.id, bia.id], excludedIds: [] });
  store.closeRound(r.id, 'done', now());
  assert.equal(store.getActiveRound(), null);
  assert.deepEqual(store.lastDoneRoundSingerIds(), [ana.id, bia.id]);
  assert.equal(store.listPresentGuests().find(g => g.id === ana.id).timesSung, 1);
  assert.deepEqual(store.singersOfSong(s.id), ['Ana', 'Bia']);
});

test('rodadas: falha não conta e trocado não conta', () => {
  const { store, guest, song, now } = setup();
  const ana = guest('Ana');
  const bia = guest('Bia');
  const leo = guest('Léo');
  const r1 = store.createRound({ songId: song(ana.id, 'A').id, count: 1, type: 'random', singerIds: [bia.id], now: now() });
  store.closeRound(r1.id, 'done', now());
  const r2 = store.createRound({ songId: song(ana.id, 'B').id, count: 1, type: 'random', singerIds: [leo.id], now: now() });
  store.closeRound(r2.id, 'failed', now());
  assert.deepEqual(store.lastDoneRoundSingerIds(), [bia.id]);
  assert.equal(store.listPresentGuests().find(g => g.id === leo.id).timesSung, 0);

  const r3 = store.createRound({ songId: song(ana.id, 'C').id, count: 1, type: 'random', singerIds: [ana.id], now: now() });
  store.addRoundExcluded(r3.id, ana.id);
  store.setRoundSinger(r3.id, 0, leo.id);
  store.setRoundType(r3.id, 'own');
  assert.deepEqual(store.getActiveRound().excludedIds, [ana.id]);
  assert.deepEqual(store.getActiveRound().singerIds, [leo.id]);
  assert.equal(store.getActiveRound().type, 'own');
  store.closeRound(r3.id, 'done', now());
  const times = Object.fromEntries(store.listPresentGuests().map(g => [g.name, g.timesSung]));
  assert.deepEqual(times, { Ana: 0, Bia: 1, 'Léo': 1 });
});

test('reset apaga tudo', () => {
  const { store, guest, song, now } = setup();
  const ana = guest('Ana');
  const s = song(ana.id, 'X');
  store.createRound({ songId: s.id, count: 1, type: 'own', singerIds: [ana.id], now: now() });
  store.reset();
  assert.deepEqual(store.listPresentGuests(), []);
  assert.deepEqual(store.listQueuedSongs(), []);
  assert.equal(store.getActiveRound(), null);
});
