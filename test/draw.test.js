import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSong, chooseCount, eligiblePool, singerWeight, pickSingers, revealType, weightedPick } from '../server/draw.js';
import { seq, mulberry32 } from './helpers/rng.js';

const W = { suggester: 3, indicated: 8 };
const g = (id, timesSung = 0) => ({ id, timesSung });

test('pickSong uniforme', () => {
  const s = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.equal(pickSong(s, seq([0])).id, 1);
  assert.equal(pickSong(s, seq([0.99])).id, 3);
});

test('chooseCount', () => {
  assert.deepEqual(chooseCount({ indicatedCount: 2, poolSize: 5, rng: seq([0.1]) }), { count: 2, forced: true });
  assert.deepEqual(chooseCount({ indicatedCount: 2, poolSize: 1, rng: seq([0.1]) }), { count: 1, forced: false });
  assert.deepEqual(chooseCount({ indicatedCount: 0, poolSize: 5, rng: seq([0.2]) }), { count: 1, forced: false });
  assert.deepEqual(chooseCount({ indicatedCount: 1, poolSize: 5, rng: seq([0.7]) }), { count: 2, forced: false });
});

test('eligiblePool tira quem cantou na rodada anterior e relaxa se faltar gente', () => {
  const guests = [g(1), g(2), g(3)];
  assert.deepEqual(eligiblePool({ guests, needed: 2, lastRoundIds: [1], excludeIds: [] }).map(x => x.id), [2, 3]);
  assert.deepEqual(eligiblePool({ guests: [g(1), g(2)], needed: 2, lastRoundIds: [1], excludeIds: [] }).map(x => x.id), [1, 2]);
  assert.deepEqual(eligiblePool({ guests: [g(1)], needed: 1, lastRoundIds: [1], excludeIds: [] }).map(x => x.id), [1]);
  assert.deepEqual(eligiblePool({ guests: [g(1), g(2)], needed: 2, lastRoundIds: [], excludeIds: [2] }).map(x => x.id), [1]);
});

test('singerWeight', () => {
  const song = { id: 9, suggestedBy: 2, indicated: [3, 4] };
  assert.equal(singerWeight(g(1), song, W), 1);
  assert.equal(singerWeight(g(1, 1), song, W), 0.5);
  assert.equal(singerWeight(g(2), song, W), 3);
  assert.equal(singerWeight(g(3), song, W), 8);
  assert.equal(singerWeight(g(4), { ...song, suggestedBy: 4 }, W), 24);
});

test('weightedPick com pesos zerados cai no uniforme', () => {
  assert.equal(weightedPick([1, 2, 3], () => 0, seq([0.99])), 3);
});

test('pickSingers: distintos e sem quem cantou antes quando dá', () => {
  const song = { id: 9, suggestedBy: 99, indicated: [] };
  for (let s = 1; s <= 50; s++) {
    const ids = pickSingers({ guests: [g(1), g(2), g(3)], song, count: 2, lastRoundIds: [1], excludeIds: [], weights: W, rng: mulberry32(s) });
    assert.equal(new Set(ids).size, 2);
    assert.ok(!ids.includes(1));
  }
});

test('pickSingers: nunca devolve mais gente do que existe', () => {
  const song = { id: 9, suggestedBy: 99, indicated: [] };
  assert.deepEqual(pickSingers({ guests: [g(1)], song, count: 2, lastRoundIds: [], excludeIds: [], weights: W, rng: seq([0.5]) }), [1]);
  assert.deepEqual(pickSingers({ guests: [g(1)], song, count: 1, lastRoundIds: [], excludeIds: [1], weights: W, rng: seq([0.5]) }), []);
});

test('pickSingers: indicado ganha ~8/11 das vezes', () => {
  const song = { id: 9, suggestedBy: 99, indicated: [1] };
  const rng = mulberry32(42);
  let hits = 0;
  for (let i = 0; i < 10000; i++) {
    const [id] = pickSingers({ guests: [g(1), g(2), g(3), g(4)], song, count: 1, lastRoundIds: [], excludeIds: [], weights: W, rng });
    if (id === 1) hits++;
  }
  assert.ok(hits / 10000 > 0.69 && hits / 10000 < 0.76, String(hits));
});

test('revealType', () => {
  assert.equal(revealType({ suggestedBy: 2, indicated: [1] }, [1]), 'dedic');
  assert.equal(revealType({ suggestedBy: 2, indicated: [1] }, [2, 5]), 'own');
  assert.equal(revealType({ suggestedBy: 2, indicated: [2] }, [2]), 'dedic');
  assert.equal(revealType({ suggestedBy: 2, indicated: [] }, [5]), 'random');
});
