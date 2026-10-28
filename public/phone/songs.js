import { renderAvatar } from '../shared/avatar.js';
import { escapeHtml } from '../shared/escape.js';
import { indicationTip } from './tips.js';

const ERRORS = {
  invalid_link: 'Esse link não parece ser do YouTube.',
  not_found: 'Não encontrei esse vídeo. Ele pode ser privado ou ter sido removido.',
  lookup_failed: 'Não consegui falar com o YouTube agora. Tente de novo.',
  too_many_indicated: 'Máximo de 2 pessoas.',
  invalid_indicated: 'Alguém que você indicou saiu da festa. Confira a lista.',
  note_too_long: 'O recadinho pode ter até 60 letras.',
  invalid_title: 'Preencha o nome da música.',
};
const errorText = code => ERRORS[code] ?? 'Não deu certo. Tente de novo.';

const songLabel = s => escapeHtml(s.artist ? `${s.title} – ${s.artist}` : s.title);
const thumb = url => (url
  ? `<img class="thumb" src="${escapeHtml(url)}" alt="" loading="lazy">`
  : '<div class="thumb">▶</div>');

function statusLine(s) {
  if (s.status === 'failed') return '<div class="sung bad">✗ não tocou</div>';
  if (!s.sungBy.length) return '<div class="sung">✓ já sorteada</div>';
  const who = escapeHtml(s.sungBy.join(' & '));
  return `<div class="sung">✓ ${who} ${s.sungBy.length > 1 ? 'cantaram' : 'cantou'}</div>`;
}

function card(s, flash, myName) {
  const queued = s.status === 'queued';
  const indicated = s.indicated.map(n => (n === myName ? 'você' : n));
  const sub = queued
    ? (indicated.length
      ? `<div class="tag">💌 para ${escapeHtml(indicated.join(' & '))}</div>`
      : '<div class="tag no">sem indicação</div>')
    : statusLine(s);
  return `
    <div class="card${queued ? '' : ' done'}${flash ? ' new' : ''}">
      ${thumb(s.thumbnail)}
      <div class="meta"><div class="tt">${songLabel(s)}</div>${sub}</div>
      ${queued ? `<button type="button" class="del" data-del="${s.id}" aria-label="Apagar">🗑️</button>` : ''}
    </div>`;
}

// Tela 1: Minhas músicas (mockups/celular.html).
export function renderSongs(root, state, { emit, onAdd, onLeave, flashSongId = null, toast = false }) {
  root.innerHTML = `
    <div class="screen songs">
      <header class="top" data-ref="top"></header>
      <div class="h1">Minhas músicas <span data-ref="count"></span></div>
      <div class="list" data-ref="list"></div>
      <button type="button" class="leave" data-ref="leave">Sair da festa</button>
      <div class="foot"><button type="button" class="cta" data-ref="add">＋ Adicionar música</button></div>
    </div>
    <div class="toast" data-ref="toast" ${toast ? '' : 'hidden'}>Música enviada! 🎉</div>`;
  const $ = ref => root.querySelector(`[data-ref="${ref}"]`);

  function update() {
    const me = state.me;
    $('top').innerHTML = `${renderAvatar(me.avatar)}<div><b>${escapeHtml(me.name)}</b><small>👥 ${state.guests.length} pessoas na festa</small></div>`;
    const queued = state.mySongs.filter(s => s.status === 'queued');
    const done = state.mySongs.filter(s => s.status !== 'queued');
    $('count').textContent = `${queued.length} na fila`;
    if (!state.mySongs.length) {
      $('list').innerHTML = '<div class="empty"><div>🎤</div>Você ainda não mandou nenhuma música.<br>Toque em <b>＋ Adicionar música</b> para começar!</div>';
      return;
    }
    $('list').innerHTML = queued.map(s => card(s, s.id === flashSongId, me.name)).join('')
      + (done.length ? `<div class="sec">Já sorteadas</div>${done.map(s => card(s, false, me.name)).join('')}` : '');
  }

  $('list').addEventListener('click', async e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    const song = state.mySongs.find(s => s.id === Number(b.dataset.del));
    if (song && !window.confirm(`Apagar “${song.title}”?`)) return;
    b.disabled = true;
    await emit('song:delete', { songId: Number(b.dataset.del) });
  });
  $('add').addEventListener('click', onAdd);
  $('leave').addEventListener('click', () => {
    if (window.confirm('Sair da festa? Seu nome sai do sorteio, mas suas músicas continuam na fila.')) onLeave();
  });
  if (toast) {
    const toastEl = $('toast');
    setTimeout(() => { toastEl.hidden = true; }, 1800);
  }

  update();
  return { update };
}

// Tela 2: Nova música, com link, prévia editável, indicação e recadinho.
export function renderAdd(root, state, { emit, onBack, onSent }) {
  root.innerHTML = `
    <div class="screen add">
      <header class="hdr"><button type="button" class="ghost" data-ref="back">← Voltar</button><b>Nova música</b></header>
      <div class="box">
        <h4>🎵 Link do YouTube</h4>
        <input class="field" data-ref="link" placeholder="Cole aqui o link" inputmode="url" autocomplete="off" autocapitalize="off">
        <p class="msg" data-ref="linkMsg" hidden></p>
        <div class="pv" data-ref="pv" hidden>
          <img class="thumb big" data-ref="pvThumb" alt="">
          <div class="fields">
            <label>Música<input class="field" data-ref="title" maxlength="120"></label>
            <label>Artista<input class="field" data-ref="artist" maxlength="120"></label>
          </div>
        </div>
      </div>
      <div class="box">
        <h4>💌 Indicar para alguém? <span data-ref="cnt"></span></h4>
        <div class="tip" data-ref="tip"></div>
        <input class="field" data-ref="q" placeholder="🔍 Buscar pelo nome" autocomplete="off">
        <p class="warn" data-ref="warn" hidden>Máximo de 2 pessoas. Desmarque alguém para trocar.</p>
        <div class="people" data-ref="people"></div>
        <label class="note" data-ref="noteWrap" hidden>Recadinho (opcional)
          <input class="field" data-ref="note" maxlength="60" placeholder="essa é a sua cara!">
        </label>
      </div>
      <p class="msg" data-ref="sendMsg" hidden></p>
      <div class="foot"><button type="button" class="cta" data-ref="send" disabled>Enviar para a fila 🎤</button></div>
    </div>`;
  const $ = ref => root.querySelector(`[data-ref="${ref}"]`);
  let selected = [];
  let previewOk = false;
  let previewSeq = 0;
  let timer = null;
  let query = '';

  const showMsg = (ref, text) => {
    $(ref).textContent = text ?? '';
    $(ref).hidden = !text;
  };
  const refreshSend = () => { $('send').disabled = !(previewOk && $('title').value.trim()); };

  async function preview() {
    const url = $('link').value.trim();
    const seq = ++previewSeq;
    previewOk = false;
    refreshSend();
    if (!url) {
      $('pv').hidden = true;
      showMsg('linkMsg', '');
      return;
    }
    showMsg('linkMsg', 'Procurando o vídeo…');
    const r = await emit('song:preview', { url });
    if (seq !== previewSeq) return;
    if (!r.ok) {
      $('pv').hidden = true;
      showMsg('linkMsg', errorText(r.error));
      return;
    }
    showMsg('linkMsg', '');
    $('pvThumb').src = r.thumbnail ?? '';
    $('title').value = r.title;
    $('artist').value = r.artist;
    $('pv').hidden = false;
    previewOk = true;
    refreshSend();
  }

  function sortedPeople() {
    const me = state.guests.find(g => g.id === state.me.id) ?? state.me;
    const others = state.guests.filter(g => g.id !== state.me.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return [me, ...others];
  }

  function refreshPeople() {
    const presentIds = new Set(state.guests.map(g => g.id));
    selected = selected.filter(id => presentIds.has(id) || id === state.me.id);
    const q = query.toLowerCase();
    const shown = sortedPeople().filter(p => !q || p.name.toLowerCase().includes(q) || (p.id === state.me.id && 'você'.includes(q)));
    $('people').innerHTML = shown.length
      ? shown.map(p => {
        const on = selected.includes(p.id);
        const off = !on && selected.length >= 2;
        return `<button type="button" class="pp${on ? ' on' : ''}${off ? ' off' : ''}" data-pid="${p.id}">
            ${renderAvatar(p.avatar)}<i>${escapeHtml(p.name)}${p.id === state.me.id ? ' <small>(você)</small>' : ''}</i>
            <span class="ck">${on ? '✓' : ''}</span></button>`;
      }).join('')
      : '<div class="none">Ninguém com esse nome na festa</div>';
    $('cnt').textContent = selected.length ? `${selected.length} de 2` : 'opcional · até 2';
    const names = selected.map(id => sortedPeople().find(p => p.id === id)?.name).filter(Boolean);
    $('tip').innerHTML = indicationTip(names, state.me.name);
    $('noteWrap').hidden = selected.length === 0;
  }

  $('back').addEventListener('click', onBack);
  $('link').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(preview, 400);
  });
  $('title').addEventListener('input', refreshSend);
  $('q').addEventListener('input', e => {
    query = e.target.value.trim();
    refreshPeople();
  });
  $('people').addEventListener('click', e => {
    const b = e.target.closest('[data-pid]');
    if (!b) return;
    const id = Number(b.dataset.pid);
    if (selected.includes(id)) selected = selected.filter(x => x !== id);
    else if (selected.length < 2) selected = [...selected, id];
    else {
      const warn = $('warn');
      warn.hidden = false;
      setTimeout(() => { warn.hidden = true; }, 1800);
      return;
    }
    refreshPeople();
  });
  $('send').addEventListener('click', async () => {
    showMsg('sendMsg', '');
    $('send').disabled = true;
    const r = await emit('song:add', {
      url: $('link').value.trim(),
      title: $('title').value,
      artist: $('artist').value,
      indicated: selected,
      note: selected.length ? $('note').value : '',
    });
    if (r.ok) return onSent(r.song);
    showMsg('sendMsg', errorText(r.error));
    refreshSend();
  });

  refreshPeople();
  $('link').focus();
  return { refreshPeople };
}
