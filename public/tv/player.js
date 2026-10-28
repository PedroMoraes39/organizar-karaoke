import { renderAvatar } from '../shared/avatar.js';
import { escapeHtml } from '../shared/escape.js';
import { badgeText } from './copy.js';

// Todo erro do IFrame Player impede a música (inválido, removido, incorporação bloqueada, 153...):
// a TV sempre oferece "Sortear outra música" em vez de deixar a rodada presa (spec §8.5).
export function isVideoError(code) {
  return code !== undefined;
}

let apiPromise = null;
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('youtube_api'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

const queueText = n => (n === 1 ? '1 música na fila' : `${n} músicas na fila`);

// Player da rodada (spec §8.3). O vídeo só é criado no clique do ▶.
export function renderPlayer(stage, round, queueCount, { onNext, onReplace, onVideoError }) {
  const { song } = round;
  stage.innerHTML = `
    <div class="player">
      <div class="pl-top">
        <div class="pl-song"><div class="t">🎵 ${escapeHtml(song.title)}</div><div class="a">${escapeHtml(song.artist)}</div></div>
        <div class="badge ${round.type}" data-ref="badge"></div>
      </div>
      <div class="pl-video" data-ref="video">
        <div class="ph"></div>
        <button type="button" class="play" data-ref="play" aria-label="Tocar">▶</button>
        <div class="hint" data-ref="hint">Clique no ▶ quando estiverem prontos</div>
      </div>
      <div class="pl-bottom">
        <div class="who">${renderAvatar(song.suggestedBy.avatar)}<div><small>Sugerida por</small><b>${escapeHtml(song.suggestedBy.name)}</b></div></div>
        <div class="who sing" data-ref="singers">
          ${round.singers.map((p, i) => `<button type="button" class="sing-av" data-slot="${i}" disabled>${renderAvatar(p.avatar)}</button>`).join('')}
          <div><small>No microfone</small><b>${escapeHtml(round.singers.map(p => p.name).join(' & '))}</b></div>
        </div>
        <div class="pl-q">
          <span data-ref="queue"></span>
          <div class="pl-btns">
            <button type="button" class="ghostbtn" data-ref="replace">Sortear outra pessoa</button>
            <button type="button" class="nextbtn" data-ref="next">🎲 Sortear a próxima</button>
          </div>
        </div>
      </div>
      <div class="pl-note" data-ref="note" hidden></div>
    </div>`;
  const $ = ref => stage.querySelector(`[data-ref="${ref}"]`);
  $('badge').textContent = badgeText(round);
  $('queue').textContent = queueText(queueCount);

  let player = null;
  let picking = false;

  function showNote(text) {
    const note = $('note');
    if (!note) return;
    note.textContent = text;
    note.hidden = !text;
  }

  function showVideoError() {
    player?.destroy?.();
    player = null;
    $('video').innerHTML = `
      <div class="pl-error">
        <b>Esse vídeo não pode ser tocado aqui.</b>
        <button type="button" class="nextbtn" data-ref="redraw">🎲 Sortear outra música</button>
      </div>`;
    $('redraw').addEventListener('click', onVideoError);
  }

  $('play').addEventListener('click', async () => {
    $('play').disabled = true;
    try {
      const YT = await loadYouTubeApi();
      $('video').innerHTML = '<div class="yt" data-ref="yt"></div>';
      player = new YT.Player($('yt'), {
        videoId: song.videoId,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: { onError: e => { if (isVideoError(e.data)) showVideoError(); } },
      });
    } catch {
      $('play').disabled = false;
      $('hint').textContent = 'Não consegui carregar o YouTube. Confira a internet do notebook e clique de novo.';
    }
  });

  function setPicking(on) {
    picking = on;
    $('singers').classList.toggle('picking', on);
    stage.querySelectorAll('.sing-av').forEach(b => { b.disabled = !on; });
    showNote(on ? 'Toque em quem vai ser trocado' : '');
  }

  $('replace').addEventListener('click', () => {
    if (round.singers.length === 1) return onReplace(0);
    setPicking(!picking);
  });
  $('singers').addEventListener('click', e => {
    const b = e.target.closest('[data-slot]');
    if (!b || !picking) return;
    setPicking(false);
    onReplace(Number(b.dataset.slot));
  });
  $('next').addEventListener('click', () => {
    $('next').disabled = true;
    onNext();
  });

  return {
    showNote,
    setQueue: n => { const q = $('queue'); if (q) q.textContent = queueText(n); },
    simulateVideoError: showVideoError,
  };
}
