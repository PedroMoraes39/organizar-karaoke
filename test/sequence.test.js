import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { reelIndex, waitForSkip } from '../public/tv/sequence.js';

test('roleta de quem canta passa por todo mundo e troca a cada giro', () => {
  for (let n = 2; n <= 12; n++) {
    for (const slot of [0, 1]) {
      const frames = Array.from({ length: 2 * n }, (_, tick) => reelIndex(n, slot, tick));
      assert.equal(new Set(frames.slice(0, n)).size, n, `${n} pessoas, vaga ${slot}: ${frames}`);
      frames.slice(1).forEach((f, i) => assert.notEqual(f, frames[i], `${n} pessoas, vaga ${slot}: ${frames}`));
    }
  }
});

test('roleta em dupla: cada vaga começa num personagem diferente', () => {
  for (let n = 2; n <= 12; n++) assert.notEqual(reelIndex(n, 0, 0), reelIndex(n, 1, 0), `${n} pessoas`);
});

const key = (k, code) => Object.assign(new Event('keydown', { cancelable: true }), { key: k, code });

function skipHarness() {
  const stage = new EventTarget();
  const keys = new EventTarget();
  let done = false;
  const promise = waitForSkip(stage, keys).then(() => { done = true; });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  return { stage, keys, promise, isDone: () => done, flush };
}

test('revelação final fica parada até alguém clicar', async (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ['setTimeout'] });
  const h = skipHarness();
  mock.timers.tick(10 * 60 * 1000);
  await h.flush();
  assert.equal(h.isDone(), false);
  h.stage.dispatchEvent(new Event('click'));
  await h.promise;
  assert.equal(h.isDone(), true);
});

test('Espaço também passa a revelação; outras teclas não', async () => {
  const h = skipHarness();
  h.keys.dispatchEvent(key('Enter', 'Enter'));
  h.keys.dispatchEvent(key('ArrowRight', 'ArrowRight'));
  await h.flush();
  assert.equal(h.isDone(), false);
  const space = key(' ', 'Space');
  h.keys.dispatchEvent(space);
  await h.promise;
  assert.equal(space.defaultPrevented, true);
});

test('depois de passar, o Espaço volta ao normal', async () => {
  const h = skipHarness();
  h.stage.dispatchEvent(new Event('click'));
  await h.promise;
  const space = key(' ', 'Space');
  h.keys.dispatchEvent(space);
  assert.equal(space.defaultPrevented, false);
});
