import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../public/shared/escape.js';

test('escapeHtml', () => {
  assert.equal(escapeHtml(`<b>"Ana" & 'x'</b>`), '&lt;b&gt;&quot;Ana&quot; &amp; &#39;x&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(42), '42');
});
