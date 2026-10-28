import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import { openDb } from '../server/db.js';
import { createStore } from '../server/store.js';
import { createParty } from '../server/party.js';
import { loadDictionary } from '../server/title-parser.js';
import { loadConfig } from '../server/config.js';
import { createServer } from '../server/app.js';
import { mulberry32 } from './helpers/rng.js';

const dict = loadDictionary(new URL('../config/palavras-ignoradas.txt', import.meta.url));
const AV = { shape: 1, color: 2, face: 3, acc: 4 };
const LINK = 'https://youtu.be/dQw4w9WgXcQ';
const INFO = { title: 'Queen - Bohemian Rhapsody (Karaoke Version)', channel: 'Sing King', thumbnail: 't' };

async function start(opts = {}) {
  const config = { ...loadConfig({}), adminKey: 'segredo' };
  const party = createParty({
    store: createStore(openDb(':memory:')), dict, weights: config.weights, rng: mulberry32(1),
    fetchVideoInfo: async () => INFO,
  });
  const server = createServer({ config, party, ...opts });
  const port = await server.listen(0);
  const url = `http://127.0.0.1:${port}`;
  const sockets = [];
  const connect = (auth) => {
    const s = ioClient(url, { auth, transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(s);
    return s;
  };
  const close = async () => {
    sockets.forEach(s => s.disconnect());
    await server.close();
  };
  return { url, connect, close };
}

const emit = (s, ev, data = {}) => new Promise(resolve => s.emit(ev, data, resolve));
const connected = s => new Promise((resolve, reject) => {
  s.once('connect', resolve);
  s.once('connect_error', reject);
});
// Espera um evento que satisfaça o predicado (alguns eventos chegam mais de uma vez).
const waitFor = (s, ev, pred = () => true, ms = 2000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`timeout esperando ${ev}`)), ms);
  const handler = (payload) => {
    if (!pred(payload)) return;
    clearTimeout(timer);
    s.off(ev, handler);
    resolve(payload);
  };
  s.on(ev, handler);
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function guest(ctx, name) {
  const s = ctx.connect({ role: 'guest' });
  await connected(s);
  const r = await emit(s, 'guest:join', { name, avatar: AV });
  assert.equal(r.ok, true, JSON.stringify(r));
  return { s, ...r };
}

test('páginas do celular e da TV', async (t) => {
  const ctx = await start();
  t.after(ctx.close);
  const phone = await (await fetch(`${ctx.url}/`)).text();
  assert.ok(phone.includes('id="app"'));
  const tv = await (await fetch(`${ctx.url}/tv`)).text();
  assert.ok(tv.includes('id="stage"'));
});

test('convidados recebem a lista quando alguém entra', async (t) => {
  const ctx = await start();
  t.after(ctx.close);
  const ana = await guest(ctx, 'Ana');
  const seen = waitFor(ana.s, 'guests', list => list.length === 2);
  await guest(ctx, 'Bia');
  assert.deepEqual((await seen).map(g => g.name), ['Ana', 'Bia']);
});

test('privacidade: ninguém recebe música de outro convidado', async (t) => {
  const ctx = await start();
  t.after(ctx.close);
  const ana = await guest(ctx, 'Ana');
  const bia = await guest(ctx, 'Bia');
  const biaEvents = [];
  bia.s.onAny((ev, ...args) => biaEvents.push(JSON.stringify([ev, args])));
  const mine = waitFor(ana.s, 'mySongs', list => list.length === 1);
  const r = await emit(ana.s, 'song:add', { url: LINK, title: 'Bohemian Rhapsody', artist: 'Queen', indicated: [], note: '' });
  assert.equal(r.ok, true);
  await mine;
  await sleep(100);
  assert.ok(!biaEvents.some(e => e.includes('Bohemian')), biaEvents.join('\n'));
});

test('celular que reconecta volta com as músicas', async (t) => {
  const ctx = await start();
  t.after(ctx.close);
  const ana = await guest(ctx, 'Ana');
  await emit(ana.s, 'song:add', { url: LINK, title: 'Bohemian Rhapsody', artist: 'Queen', indicated: [], note: '' });
  ana.s.disconnect();
  const again = ctx.connect({ role: 'guest' });
  await connected(again);
  const songs = waitFor(again, 'mySongs', list => list.length === 1);
  const r = await emit(again, 'guest:resume', { token: ana.token });
  assert.equal(r.ok, true);
  assert.equal(r.guest.name, 'Ana');
  assert.equal((await songs)[0].title, 'Bohemian Rhapsody');
  assert.deepEqual(await emit(again, 'guest:resume', { token: 'nada' }), { ok: false, error: 'unknown' });
});

test('eventos de música exigem identificação', async (t) => {
  const ctx = await start();
  t.after(ctx.close);
  const s = ctx.connect({ role: 'guest' });
  await connected(s);
  assert.deepEqual(await emit(s, 'song:preview', { url: LINK }), { ok: false, error: 'not_identified' });
});

test('TV recebe estado com QR e volta para a rodada ao recarregar', async (t) => {
  const ctx = await start();
  t.after(ctx.close);
  const ana = await guest(ctx, 'Ana');
  await emit(ana.s, 'song:add', { url: LINK, title: 'Bohemian Rhapsody', artist: 'Queen', indicated: [], note: '' });
  const tv = ctx.connect({ role: 'tv' });
  const state = await waitFor(tv, 'tv:state');
  assert.match(state.joinUrl, /^http:\/\/[\d.]+:\d+\/$/);
  assert.ok(state.qrSvg.startsWith('<svg'));
  assert.equal(state.queueCount, 1);
  const r = await emit(tv, 'tv:draw');
  assert.equal(r.ok, true);
  const tv2 = ctx.connect({ role: 'tv' });
  const state2 = await waitFor(tv2, 'tv:state');
  assert.equal(state2.phase, 'round');
  assert.equal(state2.round.id, r.round.id);
});

test('TV fora do notebook precisa da chave', async (t) => {
  const ctx = await start({ isLocal: () => false });
  t.after(ctx.close);
  await assert.rejects(connected(ctx.connect({ role: 'tv' })), /forbidden/);
  await connected(ctx.connect({ role: 'tv', key: 'segredo' }));
});

test('convidado não controla a TV', async (t) => {
  const ctx = await start();
  t.after(ctx.close);
  const ana = await guest(ctx, 'Ana');
  assert.deepEqual(await emit(ana.s, 'tv:draw'), { ok: false, error: 'forbidden' });
});

test('nova festa avisa os celulares', async (t) => {
  const ctx = await start();
  t.after(ctx.close);
  const ana = await guest(ctx, 'Ana');
  const tv = ctx.connect({ role: 'tv' });
  await waitFor(tv, 'tv:state');
  const reset = waitFor(ana.s, 'party:reset');
  assert.deepEqual(await emit(tv, 'tv:newParty'), { ok: true });
  await reset;
});
