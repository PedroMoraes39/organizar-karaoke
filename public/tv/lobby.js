import { renderAvatar } from '../shared/avatar.js';
import { escapeHtml } from '../shared/escape.js';

// Personagens encolhem conforme a festa enche, para caberem todos (até ~24) no lobby.
function avatarSize(count) {
  if (count <= 12) return '7cqw';
  if (count <= 18) return '5.4cqw';
  return '4.4cqw';
}

function reasonFor(state) {
  if (!state.guests.length) return 'Ninguém na festa ainda';
  if (!state.queueCount) return 'A fila está vazia: mandem músicas!';
  return '';
}

// Tela de espera da TV: QR para entrar, quem já entrou, tamanho da fila e o botão de sortear.
export function renderLobby(stage, state, { onDraw, onNewParty }) {
  stage.innerHTML = `
    <div class="scene lobby">
      <div class="qr-card">
        <div class="qr" data-ref="qr"></div>
        <b>Entre pelo celular</b>
        <small data-ref="url"></small>
      </div>
      <div class="lobby-main">
        <div class="kicker">🎤 Karaokê da festa</div>
        <div class="lob-row" data-ref="guests"></div>
        <div class="sa" data-ref="counts"></div>
        <button type="button" class="bigbtn" data-ref="draw">🎲 SORTEAR</button>
        <div class="reason" data-ref="reason"></div>
      </div>
      <button type="button" class="newparty" data-ref="newparty">Nova festa</button>
    </div>`;
  const $ = ref => stage.querySelector(`[data-ref="${ref}"]`);

  function update(next) {
    $('qr').innerHTML = next.qrSvg;
    $('url').textContent = next.joinUrl;
    $('guests').style.setProperty('--av', avatarSize(next.guests.length));
    $('guests').innerHTML = next.guests.length
      ? next.guests.map(g => `<div class="g">${renderAvatar(g.avatar)}<span>${escapeHtml(g.name)}</span></div>`).join('')
      : '<div class="lob-empty">Leia o QR code para entrar na festa!</div>';
    const songs = next.queueCount === 1 ? '1 música na fila' : `${next.queueCount} músicas na fila`;
    const people = next.guests.length === 1 ? '1 pessoa na festa' : `${next.guests.length} pessoas na festa`;
    $('counts').textContent = `${songs} · ${people}`;
    const reason = reasonFor(next);
    $('draw').disabled = Boolean(reason);
    $('reason').textContent = reason;
  }

  $('draw').addEventListener('click', () => {
    $('draw').disabled = true;
    onDraw();
  });
  $('newparty').addEventListener('click', () => {
    if (window.confirm('Começar uma nova festa? Isso apaga todo mundo, todas as músicas e o histórico.')) onNewParty();
  });

  update(state);
  return { update };
}

export function renderForbidden(stage) {
  stage.innerHTML = `
    <div class="scene">
      <div class="kicker">🎤 Karaokê da festa</div>
      <div class="msg-full">Abra esta tela no notebook da festa:<br><code>http://localhost:${escapeHtml(location.port || '80')}/tv</code></div>
    </div>`;
}
