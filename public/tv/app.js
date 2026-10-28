import { renderLobby, renderForbidden } from './lobby.js';
import { playDraw, playReplace } from './sequence.js';
import { renderPlayer } from './player.js';

const stage = document.getElementById('stage');
const key = new URLSearchParams(location.search).get('key');
const socket = window.io({ auth: { role: 'tv', key } });
const emit = (event, data = {}) => new Promise(resolve => socket.emit(event, data, resolve));

// busy = uma animação está rodando; nesse meio tempo tv:state só atualiza os dados.
const app = { tvState: null, busy: false, screen: null, view: null, roundId: null };

const REPLACE_ERRORS = {
  no_alternative: 'Não tem mais ninguém disponível para sortear.',
};

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
  app.view = renderPlayer(stage, round, app.tvState?.queueCount ?? 0, {
    onNext: async () => {
      await emit('tv:finish');
      if (app.screen === 'round') goLobby();
    },
    onReplace: replaceSinger,
    onVideoError: redraw,
  });
}

async function runDraw() {
  app.screen = 'animating';
  const r = await emit('tv:draw');
  if (r.ok) await playDraw(stage, r);
  app.busy = false;
  if (r.ok) showRound(r.round);
  else goLobby();
}

async function startDraw() {
  if (app.busy) return;
  app.busy = true;
  await runDraw();
}

// Vídeo que não toca: a rodada não conta e um sorteio completo novo começa (spec §8.5).
async function redraw() {
  if (app.busy) return;
  app.busy = true;
  await emit('tv:fail');
  await runDraw();
}

async function replaceSinger(slot) {
  if (app.busy) return;
  const r = await emit('tv:replace', { slot });
  if (!r.ok) {
    app.view?.showNote?.(REPLACE_ERRORS[r.error] ?? 'Não deu para sortear outra pessoa agora.');
    return;
  }
  app.busy = true;
  app.screen = 'animating';
  await playReplace(stage, r, slot);
  app.busy = false;
  showRound(r.round);
}

socket.on('tv:state', state => {
  app.tvState = state;
  if (app.busy) return;
  if (state.phase === 'round') {
    if (app.screen !== 'round' || app.roundId !== state.round.id) showRound(state.round);
    else app.view?.setQueue?.(state.queueCount);
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

// Gancho para testar o caminho de "vídeo que não toca" pelo console do navegador.
window.karaokeTv = { simulateVideoError: () => app.view?.simulateVideoError?.() };
