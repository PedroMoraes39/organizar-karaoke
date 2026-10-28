import { AVATAR_PARTS, renderAvatar, randomAvatar } from '../shared/avatar.js';
import { escapeHtml } from '../shared/escape.js';

const TABS = [
  { key: 'shape', label: 'Formato', list: AVATAR_PARTS.shapes },
  { key: 'color', label: 'Cor', list: AVATAR_PARTS.colors },
  { key: 'face', label: 'Rosto', list: AVATAR_PARTS.faces },
  { key: 'acc', label: 'Acessório', list: AVATAR_PARTS.accessories },
];

const ERRORS = {
  invalid_name: 'Escreva um nome com até 20 letras.',
  invalid_avatar: 'Escolha seu personagem de novo.',
};

// Tela de entrada: nome + montagem do personagem (mockups/personagem.html).
// draft = {name, avatar} é mantido por quem chama, para voltar da tela "É você?" sem perder nada.
export function renderEntry(root, { emit, draft, onJoined, onNameTaken }) {
  draft.avatar ??= randomAvatar();
  let tab = 'shape';

  root.innerHTML = `
    <div class="screen entry">
      <h1 class="ttl">🎤 Monte seu personagem</h1>
      <div class="prev bounce" data-ref="prev"></div>
      <input class="name" data-ref="name" maxlength="20" placeholder="Seu nome" autocomplete="off" enterkeyhint="go">
      <div class="tabs" data-ref="tabs">
        ${TABS.map(t => `<button type="button" data-tab="${t.key}">${t.label}</button>`).join('')}
      </div>
      <div class="panel"><div class="cap" data-ref="cap"></div><div class="opts" data-ref="opts"></div></div>
      <p class="err" data-ref="err" hidden></p>
      <div class="row">
        <button type="button" class="ghost" data-ref="dice">🎲 Aleatório</button>
        <button type="button" class="cta" data-ref="go">Entrar na festa</button>
      </div>
    </div>`;
  const $ = ref => root.querySelector(`[data-ref="${ref}"]`);
  const nameInput = $('name');
  nameInput.value = draft.name ?? '';

  function caption(t) {
    const i = draft.avatar[t.key];
    if (t.key === 'color') return `Cor (${i + 1}/${t.list.length})`;
    if (t.key === 'acc') return `Acessório · ${t.list[i].name} (${i === 0 ? '—' : i}/${t.list.length - 1})`;
    return `${t.label} · ${t.list[i].name} (${i + 1}/${t.list.length})`;
  }

  function draw() {
    $('prev').innerHTML = renderAvatar(draft.avatar);
    const t = TABS.find(x => x.key === tab);
    root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('cap').textContent = caption(t);
    $('opts').innerHTML = t.list.map((item, i) => {
      const on = draft.avatar[tab] === i ? ' on' : '';
      if (tab === 'color') return `<button type="button" class="opt sw${on}" data-i="${i}" style="background:${item}" aria-label="Cor ${i + 1}"></button>`;
      return `<button type="button" class="opt${on}" data-i="${i}" title="${escapeHtml(item.name)}">${renderAvatar({ ...draft.avatar, [tab]: i })}</button>`;
    }).join('');
  }

  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    draw();
  });
  $('opts').addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    draft.avatar = { ...draft.avatar, [tab]: Number(b.dataset.i) };
    draw();
  });
  $('dice').addEventListener('click', () => {
    draft.avatar = randomAvatar();
    draw();
  });
  nameInput.addEventListener('input', () => { draft.name = nameInput.value; });

  async function submit() {
    const err = $('err');
    err.hidden = true;
    const name = nameInput.value.trim();
    if (!name) {
      err.textContent = ERRORS.invalid_name;
      err.hidden = false;
      return;
    }
    $('go').disabled = true;
    const r = await emit('guest:join', { name, avatar: draft.avatar });
    $('go').disabled = false;
    if (r.ok) return onJoined(r.guest, r.token);
    if (r.error === 'name_taken') return onNameTaken(r.guest, name);
    err.textContent = ERRORS[r.error] ?? 'Não deu certo. Tente de novo.';
    err.hidden = false;
  }
  $('go').addEventListener('click', submit);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

  draw();
}

// "É você, Ana?": nome já existe na festa (spec §7.1).
export function renderReclaim(root, { emit, guest, onJoined, onNo }) {
  const name = escapeHtml(guest.name);
  root.innerHTML = `
    <div class="screen reclaim">
      <div class="prev bounce">${renderAvatar(guest.avatar)}</div>
      <p>O nome “${name}” já está em uso nesta festa.</p>
      <h2>É você, ${name}?</h2>
      <button type="button" class="cta" data-ref="yes">Sim, sou eu</button>
      <button type="button" class="ghost" data-ref="no">Não, vou usar outro nome</button>
    </div>`;
  root.querySelector('[data-ref="yes"]').addEventListener('click', async () => {
    const r = await emit('guest:reclaim', { name: guest.name });
    if (r.ok) onJoined(r.guest, r.token);
    else onNo();
  });
  root.querySelector('[data-ref="no"]').addEventListener('click', onNo);
}
