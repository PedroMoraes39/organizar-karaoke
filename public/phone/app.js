import { renderEntry, renderReclaim } from './entry.js';
import { renderSongs, renderAdd } from './songs.js';

const TOKEN_KEY = 'karaoke.token';
const tokenStore = {
  get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(TOKEN_KEY, v); } catch { /* sem armazenamento: só não lembra */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* idem */ } },
};

const root = document.getElementById('app');
const offline = document.getElementById('offline');
const state = { me: null, guests: [], mySongs: [], screen: 'loading', draft: { name: '', avatar: null } };
let view = null;

const socket = window.io({ auth: { role: 'guest' } });
const emit = (event, data = {}) => new Promise(resolve => socket.emit(event, data, resolve));

function joined(guest, token) {
  tokenStore.set(token);
  state.me = guest;
  state.draft = { name: '', avatar: null };
  showScreen('songs');
}

async function leave() {
  await emit('guest:leave');
  tokenStore.clear();
  state.me = null;
  state.mySongs = [];
  showScreen('entry');
}

function showScreen(name, opts = {}) {
  state.screen = name;
  view = null;
  window.scrollTo(0, 0);
  if (name === 'entry') {
    renderEntry(root, {
      emit,
      draft: state.draft,
      onJoined: joined,
      onNameTaken: (guest) => {
        state.reclaimGuest = guest;
        showScreen('reclaim');
      },
    });
  } else if (name === 'reclaim') {
    renderReclaim(root, { emit, guest: state.reclaimGuest, onJoined: joined, onNo: () => showScreen('entry') });
  } else if (name === 'songs') {
    view = renderSongs(root, state, {
      emit,
      onAdd: () => showScreen('add'),
      onLeave: leave,
      flashSongId: opts.flashSongId ?? null,
      toast: Boolean(opts.toast),
    });
  } else if (name === 'add') {
    view = renderAdd(root, state, {
      emit,
      onBack: () => showScreen('songs'),
      onSent: song => showScreen('songs', { flashSongId: song.id, toast: true }),
    });
  }
}

socket.on('connect', async () => {
  offline.hidden = true;
  const token = tokenStore.get();
  if (token) {
    const r = await emit('guest:resume', { token });
    if (r.ok) {
      state.me = r.guest;
      if (state.screen === 'loading' || state.screen === 'entry' || state.screen === 'reclaim') showScreen('songs');
      return;
    }
    tokenStore.clear();
    state.me = null;
  }
  if (state.screen === 'loading' || state.me === null && state.screen !== 'entry' && state.screen !== 'reclaim') {
    showScreen('entry');
  }
});
socket.on('disconnect', () => { offline.hidden = false; });
socket.on('guests', list => {
  state.guests = list;
  if (state.screen === 'songs') view?.update();
  if (state.screen === 'add') view?.refreshPeople();
});
socket.on('mySongs', list => {
  state.mySongs = list;
  if (state.screen === 'songs') view?.update();
});
socket.on('party:reset', () => {
  tokenStore.clear();
  state.me = null;
  state.mySongs = [];
  showScreen('entry');
});
