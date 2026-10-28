const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// Os controles da TV só aceitam conexões do próprio notebook (ou com a chave de admin).
export function isLoopback(address) {
  return LOOPBACK.has(address);
}
