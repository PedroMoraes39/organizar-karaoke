import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmitter } from '../public/shared/emitter.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Socket falso com a mesma forma de socket.timeout(ms).emit(evento, dados, (err, resposta) => ...).
function fakeSocket({ drop = false } = {}) {
  const sent = [];
  return {
    sent,
    timeout(ms) {
      return {
        emit(event, data, cb) {
          sent.push(event);
          if (drop) setTimeout(() => cb(new Error('operation has timed out')), ms);
          else setTimeout(() => cb(null, { ok: true, event }), 1);
        },
      };
    },
  };
}

test('emit devolve a resposta do servidor', async () => {
  const e = createEmitter(fakeSocket());
  assert.deepEqual(await e.emit('song:add', {}), { ok: true, event: 'song:add' });
});

test('enquanto reconecta, os envios esperam o guest:resume', async () => {
  const sock = fakeSocket();
  const e = createEmitter(sock);
  e.hold();
  const pending = e.emit('song:add', {});
  const resumed = e.emit('guest:resume', {}, { wait: false });
  await sleep(5);
  assert.deepEqual(sock.sent, ['guest:resume']);
  await resumed;
  e.release();
  assert.deepEqual(await pending, { ok: true, event: 'song:add' });
  assert.deepEqual(sock.sent, ['guest:resume', 'song:add']);
});

test('sem conexão por tempo demais: devolve timeout e não envia depois', async () => {
  const sock = fakeSocket();
  const e = createEmitter(sock, { timeoutMs: 30 });
  e.hold();
  assert.deepEqual(await e.emit('song:add', {}), { ok: false, error: 'timeout' });
  e.release();
  await sleep(10);
  assert.deepEqual(sock.sent, []);
});

test('resposta que nunca chega vira timeout', async () => {
  const e = createEmitter(fakeSocket({ drop: true }), { timeoutMs: 30 });
  assert.deepEqual(await e.emit('tv:draw', {}), { ok: false, error: 'timeout' });
});
