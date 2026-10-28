import { renderLobby, renderForbidden } from './lobby.js';
import { playDraw } from './sequence.js';

const stage = document.getElementById('stage');
const key = new URLSearchParams(location.search).get('key');
const socket = window.io({ auth: { role: 'tv', key } });
const emit = (event, data = {}) => new Promise(resolve => socket.emit(event, data, resolve));

// busy = uma animação está rodando; nesse meio tempo tv:state só atualiza os dados.
const app = { tvState: null, busy: false, screen: null, view: null, roundId: null };

function goLobby() {
  app.screen = 'lobby';
  app.roundId = null;
  app.view = renderLobby(stage, app.tvState, {
    onDraw: startDraw,
    onNewParty: () => emit('tv:newParty'),
  });
}

function showRound(round) {
  app.screen = 'round';
  app.roundId = round.id;
  stage.innerHTML = '<div class="scene"><div class="kicker">Rodada em andamento</div></div>';
}

async function startDraw() {
  if (app.busy) return;
  app.busy = true;
  app.screen = 'animating';
  const r = await emit('tv:draw');
  if (r.ok) await playDraw(stage, r);
  app.busy = false;
  if (r.ok) showRound(r.round);
  else goLobby();
}

socket.on('tv:state', state => {
  app.tvState = state;
  if (app.busy) return;
  if (state.phase === 'round') {
    if (app.screen !== 'round' || app.roundId !== state.round.id) showRound(state.round);
    return;
  }
  if (app.screen === 'lobby') app.view.update(state);
  else goLobby();
});

socket.on('connect_error', err => {
  if (err.message === 'forbidden') {
    socket.disconnect();
    renderForbidden(stage);
  }
});
