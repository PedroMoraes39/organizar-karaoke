import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVideoId, fetchVideoInfo } from '../server/youtube.js';

const ID = 'dQw4w9WgXcQ';

test('parseVideoId aceita formatos comuns', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc123`,
    `https://m.youtube.com/watch?v=${ID}&list=PL123&t=42s`,
    `https://music.youtube.com/watch?v=${ID}&feature=share`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}?si=z`,
    `youtube.com/watch?v=${ID}`,
    `Olha essa: https://youtu.be/${ID}?si=x kkk`,
  ]) assert.equal(parseVideoId(url), ID, url);
});

test('parseVideoId rejeita o resto', () => {
  for (const s of ['https://vimeo.com/123', 'abc', 'https://youtube.com/watch?v=curto', '', undefined])
    assert.equal(parseVideoId(s), null, String(s));
});

test('fetchVideoInfo mapeia o oEmbed', async () => {
  let asked;
  const fake = async (url) => {
    asked = url;
    return {
      ok: true, status: 200, json: async () => ({
        title: 'Queen - Bohemian Rhapsody (Karaoke Version)',
        author_name: 'Sing King',
        thumbnail_url: 'https://i.ytimg.com/vi/x/hqdefault.jpg',
      }),
    };
  };
  assert.deepEqual(await fetchVideoInfo(ID, fake), {
    title: 'Queen - Bohemian Rhapsody (Karaoke Version)',
    channel: 'Sing King',
    thumbnail: 'https://i.ytimg.com/vi/x/hqdefault.jpg',
  });
  assert.equal(asked, `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + ID)}&format=json`);
});

test('fetchVideoInfo: inexistente vira null, falha lança', async () => {
  assert.equal(await fetchVideoInfo(ID, async () => ({ ok: false, status: 404 })), null);
  assert.equal(await fetchVideoInfo(ID, async () => ({ ok: false, status: 401 })), null);
  await assert.rejects(fetchVideoInfo(ID, async () => ({ ok: false, status: 500 })), /lookup_failed/);
  await assert.rejects(fetchVideoInfo(ID, async () => { throw new TypeError('fetch failed'); }), /lookup_failed/);
});
