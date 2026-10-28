import { escapeHtml } from '../shared/escape.js';

// Texto que explica o efeito da indicação na tela "Nova música". Devolve HTML já escapado.
export function indicationTip(selectedNames, myName) {
  const label = name => (name === myName ? 'você' : escapeHtml(name));
  if (!selectedNames.length) {
    return 'Sem indicação: entra no sorteio normal, e você tem um pouco mais de chance de cantar o que mandou.';
  }
  if (selectedNames.length === 1) {
    const who = label(selectedNames[0]);
    const has = who === 'você' ? 'você tem' : `${who} tem`;
    return `Indicada para <b>${who}</b>: quando sair, ${has} bem mais chance de cantar.`;
  }
  const pair = selectedNames.map(label).join(' &amp; ');
  return `Indicada para a dupla <b>${pair}</b>: quando sair, essa dupla tem bem mais chance de cantar junta.`;
}
