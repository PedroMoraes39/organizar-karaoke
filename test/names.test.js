import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, nameKey, validateName } from '../server/names.js';

test('normalizeName apara e colapsa espaços', () => {
  assert.equal(normalizeName('  Ana   Paula '), 'Ana Paula');
});

test('nameKey ignora caixa, acento e espaços', () => {
  assert.equal(nameKey(' Ána '), 'ana');
  assert.equal(nameKey('ANA'), nameKey('ana'));
  assert.equal(nameKey('JOÃO'), 'joao');
});

test('validateName', () => {
  assert.deepEqual(validateName(''), { ok: false, error: 'empty' });
  assert.deepEqual(validateName('   '), { ok: false, error: 'empty' });
  assert.deepEqual(validateName('a'.repeat(21)), { ok: false, error: 'too_long' });
  assert.deepEqual(validateName(' Bia '), { ok: true, name: 'Bia' });
});
