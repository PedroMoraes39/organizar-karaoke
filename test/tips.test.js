import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indicationTip } from '../public/phone/tips.js';

test('indicationTip', () => {
  assert.equal(indicationTip([], 'Ana'), 'Sem indicação: entra no sorteio normal, e você tem um pouco mais de chance de cantar o que mandou.');
  assert.equal(indicationTip(['Bia'], 'Ana'), 'Indicada para <b>Bia</b>: quando sair, Bia tem bem mais chance de cantar.');
  assert.equal(indicationTip(['Ana'], 'Ana'), 'Indicada para <b>você</b>: quando sair, você tem bem mais chance de cantar.');
  assert.equal(indicationTip(['Bia', 'Ana'], 'Ana'), 'Indicada para a dupla <b>Bia &amp; você</b>: quando sair, essa dupla tem bem mais chance de cantar junta.');
  assert.ok(indicationTip(['<i>x</i>'], 'Ana').includes('&lt;i&gt;'));
});
