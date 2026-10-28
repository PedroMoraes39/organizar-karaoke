import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { createStore } from './store.js';
import { createParty } from './party.js';
import { loadDictionary } from './title-parser.js';
import { fetchVideoInfo } from './youtube.js';
import { createServer } from './app.js';
import { pickLanIp, wslNatHint } from './net.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const config = loadConfig();

const store = createStore(openDb(path.resolve(ROOT, config.dbPath)));
const dict = loadDictionary(path.resolve(ROOT, config.dictPath));
const party = createParty({ store, dict, fetchVideoInfo, weights: config.weights });
const server = createServer({ config, party });
const port = await server.listen(config.port);
const lanIp = pickLanIp(undefined, config.hostIp);
const joinUrl = `http://${lanIp}:${port}/`;

console.log(`
🎤 Karaokê da Festa rodando!
   TV (abra no notebook):         http://localhost:${port}/tv
   Celulares (QR code na TV):     ${joinUrl}
   TV a partir de outro aparelho: ${joinUrl}tv?key=${config.adminKey}
`);

let procVersion = '';
try { procVersion = readFileSync('/proc/version', 'utf8'); } catch { /* não é Linux/WSL */ }
const hint = wslNatHint({ procVersion, ip: lanIp, override: config.hostIp });
if (hint) console.log(`${hint}\n`);
