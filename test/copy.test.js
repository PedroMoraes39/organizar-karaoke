import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealCopy, badgeText, envelopeCopy } from '../public/tv/copy.js';

const G = (id, name) => ({ id, name, avatar: { shape: 0, color: 0, face: 0, acc: 0 } });
const ana = G(1, 'Ana'), joao = G(2, 'João'), bia = G(3, 'Bia'), leo = G(4, 'Léo');
const r = (type, singers, extra = {}) => ({
  type, count: singers.length, singers,
  song: { title: 'Evidências', artist: 'Chitãozinho & Xororó', suggestedBy: joao, indicated: [], note: '', ...extra },
});

test('revealCopy', () => {
  assert.deepEqual(revealCopy(r('random', [ana])), { title: '🎲 SURPRESA!', sub: '<b>Ana</b> vai cantar a música que <b>João</b> escolheu. Ninguém escapa!' });
  assert.equal(revealCopy(r('random', [ana, leo])).sub, '<b>Ana &amp; Léo</b> vão cantar a música que <b>João</b> escolheu. Ninguém escapa!');
  assert.deepEqual(revealCopy(r('dedic', [ana], { indicated: [ana] })), { title: '💌 INDICADA!', sub: '<b>João</b> indicou essa música para <b>Ana</b>!' });
  assert.equal(revealCopy(r('dedic', [ana, bia], { indicated: [ana, bia] })).sub, '<b>João</b> indicou essa música para <b>Ana &amp; Bia</b>!');
  assert.equal(revealCopy(r('dedic', [ana, bia], { indicated: [ana] })).sub, '<b>João</b> indicou essa música para <b>Ana</b>, e <b>Bia</b> vai junto na dupla!');
  assert.deepEqual(revealCopy(r('own', [joao])), { title: '⭐ PEDIU, CANTOU!', sub: '<b>João</b> escolheu essa música. O palco é seu!' });
  assert.equal(revealCopy(r('own', [joao, bia])).sub, '<b>João</b> escolheu essa música. O palco é seu! <b>Bia</b> sobe junto na dupla.');
  assert.ok(revealCopy(r('random', [G(9, '<img src=x>')])).sub.includes('&lt;img src=x&gt;'));
});

test('badgeText e envelopeCopy', () => {
  assert.equal(badgeText(r('random', [ana])), '🎲 Surpresa');
  assert.equal(badgeText(r('dedic', [ana], { indicated: [ana] })), '💌 Indicada para Ana');
  assert.equal(badgeText(r('dedic', [ana, bia], { indicated: [ana, bia] })), '💌 Indicada para Ana & Bia');
  assert.equal(badgeText(r('own', [joao])), '⭐ Escolha própria');
  assert.deepEqual(envelopeCopy(r('dedic', [ana], { indicated: [ana], note: '<b>oi</b>' })), { from: 'João', to: 'Ana', note: '&lt;b&gt;oi&lt;/b&gt;' });
});
