import { escapeHtml } from '../shared/escape.js';

// Textos da revelação (spec §8.2). Sem artigo nem gênero: "a música que João escolheu".
const names = people => people.map(p => escapeHtml(p.name)).join(' &amp; ');
const isIndicated = (round, p) => round.song.indicated.some(i => i.id === p.id);

// HTML escapado: {title, sub}.
export function revealCopy(round) {
  const sugg = `<b>${escapeHtml(round.song.suggestedBy.name)}</b>`;
  if (round.type === 'dedic') {
    const chosen = round.singers.filter(p => isIndicated(round, p));
    const others = round.singers.filter(p => !isIndicated(round, p));
    const tail = others.length ? `, e <b>${names(others)}</b> vai junto na dupla!` : '!';
    return { title: '💌 INDICADA!', sub: `${sugg} indicou essa música para <b>${names(chosen)}</b>${tail}` };
  }
  if (round.type === 'own') {
    const others = round.singers.filter(p => p.id !== round.song.suggestedBy.id);
    const tail = others.length ? ` <b>${names(others)}</b> sobe junto na dupla.` : '';
    return { title: '⭐ PEDIU, CANTOU!', sub: `${sugg} escolheu essa música. O palco é seu!${tail}` };
  }
  const verb = round.singers.length > 1 ? 'vão' : 'vai';
  return {
    title: '🎲 SURPRESA!',
    sub: `<b>${names(round.singers)}</b> ${verb} cantar a música que ${sugg} escolheu. Ninguém escapa!`,
  };
}

// Texto puro (usar com textContent).
export function badgeText(round) {
  if (round.type === 'dedic') return `💌 Indicada para ${round.song.indicated.map(p => p.name).join(' & ')}`;
  if (round.type === 'own') return '⭐ Escolha própria';
  return '🎲 Surpresa';
}

// HTML escapado: cartão do envelope da revelação "Indicada".
export function envelopeCopy(round) {
  return {
    from: escapeHtml(round.song.suggestedBy.name),
    to: names(round.song.indicated),
    note: escapeHtml(round.song.note),
  };
}
