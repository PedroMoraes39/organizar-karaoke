export const NAME_MAX = 20;

export function normalizeName(raw) {
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}

// Chave usada para garantir nomes únicos: sem acento, minúscula, espaços colapsados.
export function nameKey(raw) {
  return normalizeName(raw)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function validateName(raw) {
  const name = normalizeName(raw);
  if (!name) return { ok: false, error: 'empty' };
  if (name.length > NAME_MAX) return { ok: false, error: 'too_long' };
  return { ok: true, name };
}
