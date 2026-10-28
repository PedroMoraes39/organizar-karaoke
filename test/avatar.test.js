import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_PARTS, AVATAR_LIMITS, isValidAvatar, randomAvatar, renderAvatar } from '../public/shared/avatar.js';

test('quantidade de peças da spec', () => {
  assert.deepEqual(AVATAR_LIMITS, { shape: 8, color: 12, face: 15, acc: 21 });
  assert.deepEqual(AVATAR_PARTS.shapes.map(s => s.name),
    ['Bolinha', 'Bloquinho', 'Fantasminha', 'Gatinho', 'Ursinho', 'Estrela', 'Alien', 'Gotinha']);
  assert.equal(AVATAR_PARTS.colors.length, 12);
  assert.equal(AVATAR_PARTS.faces.length, 15);
  assert.equal(AVATAR_PARTS.faces[8].name, 'Bravo');
  assert.equal(AVATAR_PARTS.faces[14].name, 'Tímido');
  assert.equal(AVATAR_PARTS.accessories.length, 21);
  assert.equal(AVATAR_PARTS.accessories[0].name, 'Nenhum');
  assert.equal(AVATAR_PARTS.accessories[20].name, 'Topete');
});

test('isValidAvatar', () => {
  assert.equal(isValidAvatar({ shape: 7, color: 11, face: 14, acc: 20 }), true);
  assert.equal(isValidAvatar({ shape: 8, color: 0, face: 0, acc: 0 }), false);
  assert.equal(isValidAvatar({ shape: 1.5, color: 0, face: 0, acc: 0 }), false);
  assert.equal(isValidAvatar({ shape: 0, color: 0, face: 0 }), false);
  assert.equal(isValidAvatar({ shape: -1, color: 0, face: 0, acc: 0 }), false);
  assert.equal(isValidAvatar(null), false);
});

test('randomAvatar respeita limites', () => {
  assert.equal(isValidAvatar(randomAvatar(() => 0.9999)), true);
  assert.deepEqual(randomAvatar(() => 0), { shape: 0, color: 0, face: 0, acc: 0 });
});

test('renderAvatar devolve svg com a cor escolhida', () => {
  const svg = renderAvatar({ shape: 0, color: 3, face: 0, acc: 0 });
  assert.match(svg, /^<svg viewBox="-5 -8 130 128">/);
  assert.match(svg, /<\/svg>$/);
  assert.ok(svg.includes(AVATAR_PARTS.colors[3]));
});

test('renderAvatar desenha acessório de trás antes do corpo', () => {
  const svg = renderAvatar({ shape: 0, color: 0, face: 0, acc: 16 });
  assert.equal(AVATAR_PARTS.accessories[16].name, 'Black power');
  assert.ok(svg.indexOf('#2b1a0e') < svg.indexOf(AVATAR_PARTS.colors[0]));
});
