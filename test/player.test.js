import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isVideoError } from '../public/tv/player.js';

test('qualquer erro do player do YouTube oferece sortear outra música', () => {
  for (const code of [2, 5, 100, 101, 150, 153, 999]) assert.equal(isVideoError(code), true, String(code));
});
