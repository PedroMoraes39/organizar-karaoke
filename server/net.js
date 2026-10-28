import os from 'node:os';

// Interfaces virtuais (Docker, WSL, VPN) nunca são a rede onde estão os celulares.
const VIRTUAL = /docker|^br-|veth|vethernet|virbr|wsl|tailscale|zerotier|utun/i;

function rank(address) {
  if (address.startsWith('192.168.')) return 0;
  if (address.startsWith('10.')) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2;
  return 3;
}

export function pickLanIp(interfaces = os.networkInterfaces(), override = null) {
  if (override) return override;
  let best = null;
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (VIRTUAL.test(name)) continue;
    for (const a of addrs ?? []) {
      const isV4 = a.family === 'IPv4' || a.family === 4;
      if (!isV4 || a.internal) continue;
      if (!best || rank(a.address) < rank(best)) best = a.address;
    }
  }
  return best ?? '127.0.0.1';
}
