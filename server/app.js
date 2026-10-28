import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import { pickLanIp } from './net.js';
import { isLoopback } from './admin.js';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));

export function createServer({ config, party, isLocal = isLoopback }) {
  const app = express();
  app.get('/', (req, res) => res.sendFile(path.join(PUBLIC, 'phone', 'index.html')));
  app.get('/tv', (req, res) => res.sendFile(path.join(PUBLIC, 'tv', 'index.html')));
  app.use(express.static(PUBLIC, { index: false }));

  const httpServer = createHttpServer(app);
  const io = new Server(httpServer);
  let port = config.port;
  let qr = { url: null, svg: null };

  async function tvPayload() {
    const joinUrl = `http://${pickLanIp(undefined, config.hostIp)}:${port}/`;
    if (qr.url !== joinUrl) qr = { url: joinUrl, svg: await QRCode.toString(joinUrl, { type: 'svg', margin: 1 }) };
    return { ...party.tvState(), joinUrl, qrSvg: qr.svg };
  }
  const pushTv = async () => io.to('tv').emit('tv:state', await tvPayload());
  const pushGuests = () => io.to('guests').emit('guests', party.presentGuests());
  const pushMySongs = guestId => io.to(`guest:${guestId}`).emit('mySongs', party.mySongs(guestId));

  io.use((socket, next) => {
    const { role, key } = socket.handshake.auth ?? {};
    socket.data.role = role === 'tv' ? 'tv' : 'guest';
    if (socket.data.role === 'tv' && !isLocal(socket.handshake.address) && key !== config.adminKey) {
      return next(new Error('forbidden'));
    }
    next();
  });

  io.on('connection', socket => {
    const isTv = socket.data.role === 'tv';
    if (isTv) {
      socket.join('tv');
      tvPayload().then(payload => socket.emit('tv:state', payload));
    } else {
      socket.join('guests');
    }

    // Todo evento responde por ack; erro inesperado vira server_error em vez de derrubar o socket.
    const on = (event, handler) => socket.on(event, async (data, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        reply(await handler(data ?? {}));
      } catch (err) {
        console.error(`[${event}]`, err);
        reply({ ok: false, error: 'server_error' });
      }
    });
    const guestOnly = handler => async data => {
      if (!socket.data.guestId) return { ok: false, error: 'not_identified' };
      return handler(socket.data.guestId, data);
    };
    const tvOnly = handler => async data => (isTv ? handler(data) : { ok: false, error: 'forbidden' });

    function identify(guest) {
      socket.data.guestId = guest.id;
      socket.join(`guest:${guest.id}`);
      socket.emit('guests', party.presentGuests());
      socket.emit('mySongs', party.mySongs(guest.id));
      pushGuests();
      pushTv();
    }

    on('guest:resume', ({ token }) => {
      const guest = party.resume(token);
      if (!guest) return { ok: false, error: 'unknown' };
      identify(guest);
      return { ok: true, guest };
    });
    on('guest:join', ({ name, avatar }) => {
      const r = party.join({ name, avatar });
      if (r.ok) identify(r.guest);
      return r;
    });
    on('guest:reclaim', ({ name }) => {
      const r = party.reclaim({ name });
      if (r.ok) identify(r.guest);
      return r;
    });
    on('guest:leave', guestOnly(guestId => {
      party.leave(guestId);
      socket.leave(`guest:${guestId}`);
      socket.data.guestId = null;
      pushGuests();
      pushTv();
      return { ok: true };
    }));
    on('song:preview', guestOnly((guestId, { url }) => party.preview(url)));
    on('song:add', guestOnly(async (guestId, data) => {
      const r = await party.addSong(guestId, data);
      if (r.ok) {
        pushMySongs(guestId);
        pushTv();
      }
      return r;
    }));
    on('song:delete', guestOnly((guestId, { songId }) => {
      const r = party.deleteSong(guestId, Number(songId));
      if (r.ok) {
        pushMySongs(guestId);
        pushTv();
      }
      return r;
    }));

    on('tv:draw', tvOnly(() => {
      const r = party.draw();
      if (r.ok) pushTv();
      return r;
    }));
    on('tv:replace', tvOnly(({ slot }) => {
      const r = party.replaceSinger(slot);
      if (r.ok) pushTv();
      return r;
    }));
    const close = method => tvOnly(() => {
      const r = party[method]();
      if (r.ok) {
        pushMySongs(r.suggestedBy);
        pushTv();
      }
      return r;
    });
    on('tv:finish', close('finishRound'));
    on('tv:fail', close('failRound'));
    on('tv:newParty', tvOnly(() => {
      const r = party.newParty();
      for (const s of io.sockets.sockets.values()) {
        if (s.data.guestId) s.leave(`guest:${s.data.guestId}`);
        s.data.guestId = null;
      }
      io.to('guests').emit('party:reset');
      pushTv();
      return r;
    }));
  });

  return {
    httpServer,
    io,
    listen(p = config.port) {
      return new Promise(resolve => httpServer.listen(p, () => {
        port = httpServer.address().port;
        resolve(port);
      }));
    },
    close() {
      return new Promise(resolve => io.close(() => resolve()));
    },
  };
}
