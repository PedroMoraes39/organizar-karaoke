import { randomBytes } from 'node:crypto';

export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3000,
    hostIp: env.KARAOKE_IP || null,
    dbPath: env.KARAOKE_DB || 'data/karaoke.sqlite',
    dictPath: 'config/palavras-ignoradas.txt',
    adminKey: env.KARAOKE_ADMIN_KEY || randomBytes(16).toString('hex'),
    // Pesos do sorteio (spec §10.3): quem mandou ganha "um pouco mais", indicado ganha "bem mais".
    weights: { suggester: 3, indicated: 8 },
  };
}
