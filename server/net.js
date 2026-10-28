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

// No WSL2 em modo NAT o IP detectado (172.16–31.*) é interno: os celulares não chegam nele.
export function wslNatHint({ procVersion, ip, override }) {
  if (override || !/microsoft/i.test(procVersion ?? '')) return null;
  if (!/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return null;
  return [
    `⚠️  ${ip} é o endereço interno do WSL: os celulares não vão conseguir entrar por ele.`,
    '   Veja a seção "WSL2" do README (rede espelhada + firewall) e rode com o IP do notebook no Wi-Fi:',
    '   KARAOKE_IP=192.168.x.x npm start',
  ].join('\n');
}
