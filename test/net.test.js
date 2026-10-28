import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLanIp, wslNatHint } from '../server/net.js';
import { isLoopback } from '../server/admin.js';

const nic = (address, internal = false) => ({ family: 'IPv4', address, internal });

test('pickLanIp prefere a rede da casa', () => {
  assert.equal(pickLanIp({ lo: [nic('127.0.0.1', true)], docker0: [nic('172.17.0.1')], 'Wi-Fi': [nic('192.168.0.23')] }), '192.168.0.23');
  assert.equal(pickLanIp({ 'vEthernet (WSL)': [nic('172.30.80.1')], eth0: [nic('10.0.0.5')] }), '10.0.0.5');
  assert.equal(pickLanIp({ eth0: [nic('10.0.0.5')], wlan0: [nic('192.168.1.40')] }), '192.168.1.40');
  assert.equal(pickLanIp({ eth0: [nic('10.0.0.5')] }, '192.168.1.9'), '192.168.1.9');
  assert.equal(pickLanIp({ lo: [nic('127.0.0.1', true)] }), '127.0.0.1');
  assert.equal(pickLanIp({ eth0: [{ family: 'IPv6', address: 'fe80::1', internal: false }] }), '127.0.0.1');
});

test('isLoopback', () => {
  for (const a of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) assert.equal(isLoopback(a), true, a);
  assert.equal(isLoopback('192.168.0.5'), false);
  assert.equal(isLoopback(undefined), false);
});

test('wslNatHint avisa quando o QR vai mostrar o IP interno do WSL', () => {
  const wsl = 'Linux version 6.6.87.2-microsoft-standard-WSL2';
  assert.match(wslNatHint({ procVersion: wsl, ip: '172.30.82.251', override: null }), /KARAOKE_IP/);
  assert.equal(wslNatHint({ procVersion: wsl, ip: '192.168.0.23', override: null }), null);
  assert.equal(wslNatHint({ procVersion: wsl, ip: '172.30.82.251', override: '192.168.0.23' }), null);
  assert.equal(wslNatHint({ procVersion: 'Linux version 6.8.0-generic', ip: '172.30.82.251', override: null }), null);
  assert.equal(wslNatHint({ procVersion: '', ip: '172.30.82.251', override: null }), null);
});
