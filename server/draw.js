// Lógica pura do sorteio (spec §10). Sem banco, sem estado: tudo entra por parâmetro.
// Guest = {id, timesSung}; SongForDraw = {id, suggestedBy, indicated} com indicated só de presentes.

export function weightedPick(items, weightOf, rng) {
  const weights = items.map(weightOf);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export function pickSong(songs, rng) {
  return weightedPick(songs, () => 1, rng);
}

export function chooseCount({ indicatedCount, poolSize, rng }) {
  if (poolSize < 2) return { count: 1, forced: false };
  if (indicatedCount === 2) return { count: 2, forced: true };
  return { count: rng() < 0.5 ? 1 : 2, forced: false };
}

// Quem cantou na rodada anterior fica de fora, a não ser que falte gente.
// excludeIds (trocados nesta rodada, cantores já fixados) nunca é relaxado.
export function eligiblePool({ guests, needed, lastRoundIds, excludeIds }) {
  const excluded = new Set(excludeIds);
  const last = new Set(lastRoundIds);
  const allowed = guests.filter(g => !excluded.has(g.id));
  const fresh = allowed.filter(g => !last.has(g.id));
  return fresh.length >= needed ? fresh : allowed;
}

export function singerWeight(guest, song, weights) {
  let w = 1 / (1 + guest.timesSung);
  if (guest.id === song.suggestedBy) w *= weights.suggester;
  if (song.indicated.includes(guest.id)) w *= weights.indicated;
  return w;
}

// Quem não cantou na rodada anterior é sorteado primeiro; quem cantou só completa as vagas que faltarem.
export function pickSingers({ guests, song, count, lastRoundIds, excludeIds, weights, rng }) {
  const excluded = new Set(excludeIds);
  const last = new Set(lastRoundIds);
  const allowed = guests.filter(g => !excluded.has(g.id));
  const tiers = [allowed.filter(g => !last.has(g.id)), allowed.filter(g => last.has(g.id))];
  const picked = [];
  for (const tier of tiers) {
    const pool = [...tier];
    while (picked.length < count && pool.length) {
      const g = weightedPick(pool, x => singerWeight(x, song, weights), rng);
      picked.push(g.id);
      pool.splice(pool.indexOf(g), 1);
    }
  }
  return picked;
}

export function revealType(song, singerIds) {
  if (singerIds.some(id => song.indicated.includes(id))) return 'dedic';
  if (singerIds.includes(song.suggestedBy)) return 'own';
  return 'random';
}
