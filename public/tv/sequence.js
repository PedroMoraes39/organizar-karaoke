import { renderAvatar } from '../shared/avatar.js';
import { escapeHtml } from '../shared/escape.js';
import { revealCopy, envelopeCopy } from './copy.js';

// Ritmo aprovado no esboço (mockups/sorteio-tv.html): ~20 s em solo, ~25 s em dupla, até o player.
export const TIMINGS = {
  songTicks: 24, songStart: 45, songGrowth: 1.12, songHold: 1900,
  coin: 2300,
  slotTicks: 20, slotStart: 55, slotGrowth: 1.13, slotGap: 600, slotHold: 700,
  reveal: 4200, envelope: 3000, drum: 1600, ownReveal: 4400,
  replaceIntro: 500,
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pick = list => list[Math.floor(Math.random() * list.length)];
const nameList = people => escapeHtml(people.map(p => p.name).join(' & '));

function songHtml(title, artist) {
  return `<div class="st">${escapeHtml(title)}</div><div class="sa">${escapeHtml(artist)}</div>`;
}

function slotHtml(person) {
  return `${renderAvatar(person.avatar)}<b>${escapeHtml(person.name)}</b>`;
}

async function songRoulette(stage, round, reel) {
  stage.innerHTML = `
    <div class="scene">
      <div class="kicker">Sorteando a música…</div>
      <div class="reel" data-ref="reel"></div>
    </div>`;
  const box = stage.querySelector('[data-ref="reel"]');
  const pool = reel.songs.length ? reel.songs : [round.song];
  let delay = TIMINGS.songStart;
  for (let i = 0; i < TIMINGS.songTicks; i++) {
    const s = pool[i % pool.length];
    box.innerHTML = songHtml(s.title, s.artist);
    await sleep(delay);
    delay *= TIMINGS.songGrowth;
  }
  const { song } = round;
  const dedic = song.indicated.length ? ` &nbsp;💌 indicada para <b>${nameList(song.indicated)}</b>` : '';
  box.innerHTML = songHtml(song.title, song.artist)
    + `<div class="by">sugerida por ${renderAvatar(song.suggestedBy.avatar)} <b>${escapeHtml(song.suggestedBy.name)}</b>${dedic}</div>`;
  box.classList.add('land');
  await sleep(TIMINGS.songHold);
}

async function coin(stage, round) {
  const end = round.count === 2 ? 1980 : 1800;
  stage.innerHTML = `
    <div class="scene">
      <div class="kicker">Solo ou dupla?</div>
      <div class="coinwrap"><div class="coin" style="--end:${end}deg">
        <div class="f"><span>🎤</span>SOLO</div>
        <div class="f b"><span>🎤🎤</span>DUPLA</div>
      </div></div>
    </div>`;
  await sleep(TIMINGS.coin);
}

// Caça-níquel: os slots em `spin` giram (um depois do outro); os outros já aparecem parados.
async function slots(stage, round, guests, spin, kicker) {
  stage.innerHTML = `
    <div class="scene">
      <div class="kicker">${kicker}</div>
      <div class="slots">${round.singers.map((p, i) => `<div class="slot${spin.includes(i) ? '' : ' land'}" data-slot="${i}">${spin.includes(i) ? '' : slotHtml(p)}</div>`).join('')}</div>
    </div>`;
  const pool = guests.length ? guests : round.singers;
  for (const k of spin) {
    const el = stage.querySelector(`[data-slot="${k}"]`);
    let delay = TIMINGS.slotStart;
    for (let i = 0; i < TIMINGS.slotTicks; i++) {
      el.innerHTML = slotHtml(pool[(i * 3 + k * 5) % pool.length]);
      await sleep(delay);
      delay *= TIMINGS.slotGrowth;
    }
    el.innerHTML = slotHtml(round.singers[k]);
    el.classList.add('land');
    await sleep(TIMINGS.slotGap);
  }
  await sleep(TIMINGS.slotHold);
}

function revealAvatars(round, crownId) {
  return `<div class="rv-avs">${round.singers.map(p => `
    <div class="rv-av">${p.id === crownId ? '<div class="crown">👑</div>' : ''}${renderAvatar(p.avatar)}<b>${escapeHtml(p.name)}</b></div>`).join('')}
  </div>`;
}

function textBlock(round) {
  const { title, sub } = revealCopy(round);
  return { title: `<div class="rv-title">${title}</div>`, sub: `<div class="rv-sub">${sub}</div>` };
}

async function revealRandom(stage, round) {
  const colors = ['#ffd23f', '#ff5d8f', '#4cc9f0', '#3ddc97', '#9b5de5', '#fb8500', '#fff'];
  const confetti = Array.from({ length: 90 }, () =>
    `<i style="left:${Math.random() * 100}%;background:${pick(colors)};animation-duration:${2 + Math.random() * 2}s;animation-delay:${Math.random() * 0.8}s"></i>`).join('');
  const t = textBlock(round);
  stage.innerHTML = `<div class="scene"><div class="fx confetti">${confetti}</div>${t.title}${revealAvatars(round)}${t.sub}</div>`;
  await sleep(TIMINGS.reveal);
}

async function revealDedic(stage, round) {
  const env = envelopeCopy(round);
  const note = env.note ? `<small>“${env.note}”</small>` : '';
  stage.innerHTML = `
    <div class="scene">
      <div class="kicker">Chegou uma dedicatória…</div>
      <div class="env"><div class="bd"></div>
        <div class="letter"><small>De: ${env.from}</small>Para: ${env.to} 💌${note}</div>
        <div class="flap"></div><div class="seal">❤️</div>
      </div>
    </div>`;
  await sleep(TIMINGS.envelope);
  const hearts = Array.from({ length: 30 }, () =>
    `<span style="left:${Math.random() * 100}%;animation-duration:${2.5 + Math.random() * 2}s;animation-delay:${Math.random() * 1.5}s">${pick(['❤️', '💖', '💕', '💗'])}</span>`).join('');
  const t = textBlock(round);
  stage.innerHTML = `<div class="scene"><div class="fx hearts">${hearts}</div>${t.title}${revealAvatars(round)}${t.sub}</div>`;
  await sleep(TIMINGS.reveal);
}

async function revealOwn(stage, round) {
  stage.innerHTML = '<div class="scene dark"><div class="drum">🥁 E quem pediu essa música…</div></div>';
  await sleep(TIMINGS.drum);
  const twinkles = Array.from({ length: 22 }, () =>
    `<span style="left:${Math.random() * 96}%;top:${Math.random() * 90}%;animation-delay:${Math.random() * 1.4}s">✨</span>`).join('');
  const t = textBlock(round);
  stage.innerHTML = `
    <div class="scene spotlight">
      <div class="fx"><div class="spot l"></div><div class="spot r"></div></div>
      <div class="fx twinkle">${twinkles}</div>
      ${t.title}${revealAvatars(round, round.song.suggestedBy.id)}${t.sub}
    </div>`;
  await sleep(TIMINGS.ownReveal);
}

function reveal(stage, round) {
  if (round.type === 'dedic') return revealDedic(stage, round);
  if (round.type === 'own') return revealOwn(stage, round);
  return revealRandom(stage, round);
}

export async function playDraw(stage, { round, reel }) {
  await songRoulette(stage, round, reel);
  await coin(stage, round);
  await slots(stage, round, reel.guests, round.singers.map((_, i) => i), 'Quem vai cantar?');
  await reveal(stage, round);
}

export async function playReplace(stage, { round, reel }, slot) {
  await sleep(TIMINGS.replaceIntro);
  await slots(stage, round, reel.guests, [slot], 'Sorteando outra pessoa…');
  await reveal(stage, round);
}
