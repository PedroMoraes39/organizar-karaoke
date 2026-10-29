import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createStore } from '../server/store.js';
import { createParty } from '../server/party.js';
import { loadDictionary } from '../server/title-parser.js';
import { mulberry32 } from './helpers/rng.js';

const dict = loadDictionary(new URL('../config/palavras-ignoradas.txt', import.meta.url));
const AV = { shape: 1, color: 2, face: 3, acc: 4 };
const LINK = 'https://youtu.be/dQw4w9WgXcQ';

function setup({ names = ['Ana', 'Bia', 'Léo', 'Rafa'], seed = 7 } = {}) {
  const store = createStore(openDb(':memory:'));
  let n = 0;
  const party = createParty({
    store, dict, weights: { suggester: 3, indicated: 8 }, rng: mulberry32(seed), now: () => ++n,
    fetchVideoInfo: async () => ({ title: 'Artista - Música (Karaoke)', channel: 'c', thumbnail: 't' }),
  });
  const g = Object.fromEntries(names.map(name => [name, party.join({ name, avatar: AV }).guest]));
  // Cada música com um vídeo próprio: o mesmo vídeo duas vezes na fila é repetida.
  let videos = 0;
  const add = async (by, title, indicated = []) => {
    const url = `https://youtu.be/video${String(++videos).padStart(6, '0')}`;
    return (await party.addSong(by.id, { url, title, artist: 'X', indicated: indicated.map(x => x.id), note: '' })).song;
  };
  return { party, store, g, add };
}

const timesSung = (store) => Object.fromEntries(store.listPresentGuests().map(x => [x.name, x.timesSung]));

test('draw: sem convidados e sem músicas', async () => {
  assert.deepEqual(setup({ names: [] }).party.draw(), { ok: false, error: 'no_guests' });
  assert.deepEqual(setup().party.draw(), { ok: false, error: 'empty_queue' });
});

test('draw: monta a rodada e tira a música da fila', async () => {
  const { party, store, g, add } = setup();
  const s1 = await add(g.Ana, 'Um');
  await add(g.Bia, 'Dois');
  await add(g.Bia, 'Três');
  const r = party.draw();
  assert.equal(r.ok, true);
  assert.equal(r.round.singers.length, r.round.count);
  assert.ok(!store.listQueuedSongs().some(s => s.id === r.round.song.id));
  assert.equal(r.reel.songs.length, 2);
  assert.ok(!r.reel.songs.some(s => s.title === r.round.song.title));
  assert.deepEqual(r.reel.guests.map(x => x.name), ['Ana', 'Bia', 'Léo', 'Rafa']);
  assert.deepEqual(Object.keys(r.round.song.suggestedBy).sort(), ['avatar', 'id', 'name']);
  assert.ok(['random', 'dedic', 'own'].includes(r.round.type));
  assert.deepEqual(party.draw(), { ok: false, error: 'round_active' });
  assert.ok(s1);
});

test('draw: indicada para dois presentes força dupla', async () => {
  const { party, g, add } = setup();
  await add(g.Ana, 'Dupla', [g.Bia, g['Léo']]);
  const r = party.draw();
  assert.equal(r.round.count, 2);
  assert.equal(r.round.forcedDuo, true);
  assert.deepEqual(r.round.song.indicated.map(x => x.name), ['Bia', 'Léo']);
});

test('draw: indicado que saiu é ignorado', async () => {
  const { party, g, add } = setup();
  await add(g.Ana, 'Dupla', [g.Bia, g['Léo']]);
  party.leave(g['Léo'].id);
  const r = party.draw();
  assert.deepEqual(r.round.song.indicated.map(x => x.name), ['Bia']);
  assert.equal(r.round.forcedDuo, false);
  assert.ok(!r.round.singers.some(x => x.name === 'Léo'));
});

test('replaceSinger troca só a vaga e o trocado não conta', async () => {
  const { party, store, g, add } = setup();
  await add(g.Ana, 'Um');
  const { round } = party.draw();
  const old = round.singers[0];
  const other = round.singers[1];
  const r = party.replaceSinger(0);
  assert.equal(r.ok, true);
  const fresh = r.round.singers[0];
  assert.notEqual(fresh.id, old.id);
  if (other) assert.notEqual(fresh.id, other.id);
  assert.equal(r.round.id, round.id);
  assert.deepEqual(party.replaceSinger(5), { ok: false, error: 'invalid_slot' });
  party.finishRound();
  const t = timesSung(store);
  assert.equal(t[old.name], 0);
  assert.equal(t[fresh.name], 1);
});

test('replaceSinger sem ninguém disponível', async () => {
  const { party, g, add } = setup({ names: ['Ana'] });
  await add(g.Ana, 'Um');
  const { round } = party.draw();
  assert.deepEqual(party.replaceSinger(0), { ok: false, error: 'no_alternative' });
  assert.deepEqual(party.tvState().round.singers, round.singers);
});

test('quem cantou na rodada anterior não canta na seguinte', async () => {
  const { party, g, add } = setup();
  for (let i = 0; i < 21; i++) await add(g.Ana, `Música ${i}`);
  let last = party.draw().round.singers.map(x => x.id);
  party.finishRound();
  for (let i = 0; i < 20; i++) {
    const now = party.draw().round.singers.map(x => x.id);
    assert.ok(!now.some(id => last.includes(id)), `rodada ${i}: ${now} depois de ${last}`);
    party.finishRound();
    last = now;
  }
});

test('finishRound: música aparece como sorteada para quem mandou', async () => {
  const { party, g, add } = setup();
  await add(g.Ana, 'Um');
  const { round } = party.draw();
  assert.deepEqual(party.finishRound(), { ok: true, suggestedBy: g.Ana.id });
  const [mine] = party.mySongs(g.Ana.id);
  assert.equal(mine.status, 'drawn');
  assert.deepEqual(mine.sungBy, round.singers.map(x => x.name));
  assert.deepEqual(party.finishRound(), { ok: false, error: 'no_round' });
});

test('música já sorteada pode ser mandada de novo', async () => {
  const { party, g } = setup();
  const song = { url: LINK, title: 'Bohemian Rhapsody', artist: 'Queen', indicated: [], note: '' };
  await party.addSong(g.Ana.id, song);
  party.draw();
  party.finishRound();
  const r = await party.addSong(g.Bia.id, song);
  assert.equal(r.ok, true);
});

test('failRound não conta para ninguém', async () => {
  const { party, store, g, add } = setup();
  await add(g.Ana, 'Um');
  await add(g.Ana, 'Dois');
  party.draw();
  party.finishRound();
  const before = store.lastDoneRoundSingerIds();
  party.draw();
  assert.deepEqual(party.failRound(), { ok: true, suggestedBy: g.Ana.id });
  assert.deepEqual(store.lastDoneRoundSingerIds(), before);
  assert.equal(Object.values(timesSung(store)).reduce((a, b) => a + b, 0), before.length);
  assert.ok(party.mySongs(g.Ana.id).some(s => s.status === 'failed'));
  assert.equal(party.tvState().phase, 'lobby');
});

test('música de quem saiu continua sorteável', async () => {
  const { party, g, add } = setup();
  await add(g.Rafa, 'Do Rafa');
  party.leave(g.Rafa.id);
  const r = party.draw();
  assert.equal(r.round.song.title, 'Do Rafa');
  assert.ok(!r.round.singers.some(x => x.name === 'Rafa'));
});

test('tvState e newParty', async () => {
  const { party, g, add } = setup();
  await add(g.Ana, 'Um');
  await add(g.Ana, 'Dois');
  assert.deepEqual(
    { phase: party.tvState().phase, queueCount: party.tvState().queueCount, round: party.tvState().round },
    { phase: 'lobby', queueCount: 2, round: null });
  const { round } = party.draw();
  assert.equal(party.tvState().phase, 'round');
  assert.equal(party.tvState().round.id, round.id);
  assert.equal(party.tvState().queueCount, 1);
  assert.deepEqual(party.newParty(), { ok: true });
  assert.deepEqual(party.presentGuests(), []);
  assert.equal(party.tvState().queueCount, 0);
  assert.equal(party.tvState().phase, 'lobby');
});
