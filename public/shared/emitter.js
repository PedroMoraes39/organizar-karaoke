// Envio de eventos com resposta, para celular e TV.
// - Toda chamada termina: sem resposta em timeoutMs, vira {ok: false, error: 'timeout'}.
// - hold()/release(): enquanto o celular reconecta, os envios esperam o guest:resume
//   (os que passam {wait: false} — o próprio resume — vão na frente).
// - Se o tempo acabar ainda esperando, o evento não é mais enviado (evita ação "fantasma" depois).
export function createEmitter(socket, { timeoutMs = 8000 } = {}) {
  let gate = Promise.resolve();
  let open = () => {};

  return {
    hold() {
      open();
      gate = new Promise(resolve => { open = resolve; });
    },
    release() {
      open();
    },
    emit(event, data = {}, { wait = true } = {}) {
      return new Promise(resolve => {
        let done = false;
        const finish = result => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(result);
        };
        const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), timeoutMs);
        (wait ? gate : Promise.resolve()).then(() => {
          if (done) return;
          socket.timeout(timeoutMs).emit(event, data, (err, res) =>
            finish(err ? { ok: false, error: 'timeout' } : res));
        });
      });
    },
  };
}
