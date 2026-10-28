// Peças do personagem, portadas de docs/superpowers/specs/mockups/personagem.html.
// Módulo puro: usado pelo celular, pela TV e pelo servidor (validação).

const S = (d, w = 4) => `<path d="${d}" stroke="#222" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (x, y, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#222"/><circle cx="${x + r / 3}" cy="${y - r / 3}" r="${r / 3}" fill="#fff"/>`;
const star = (cx, cy, R, r, fill, st = 'stroke="#222" stroke-width="1.5"') => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R;
    p.push((cx + q * Math.cos(a)).toFixed(1) + ',' + (cy + q * Math.sin(a)).toFixed(1));
  }
  return `<polygon points="${p.join(' ')}" fill="${fill}" ${st} stroke-linejoin="round"/>`;
};
const heart = (cx, cy, s, fill) => `<path d="M${cx} ${cy + s} C${cx - s * 1.6} ${cy} ${cx - s} ${cy - s * 1.2} ${cx} ${cy - s * .4} C${cx + s} ${cy - s * 1.2} ${cx + s * 1.6} ${cy} ${cx} ${cy + s} Z" fill="${fill}"/>`;
const SMILE = S('M48 76 Q60 88 72 76');
const BS = 'stroke="#fff" stroke-width="3" stroke-linejoin="round"';
const BLOB = 'M60 24 C92 24 100 50 100 72 C100 98 84 108 60 108 C36 108 20 98 20 72 C20 50 28 24 60 24 Z';

const COLORS = ['#ff5d8f', '#ffb703', '#3ddc97', '#4cc9f0', '#9b5de5', '#f15bb5', '#00bbf9', '#fb8500', '#80ed99', '#e63946', '#a0c4ff', '#8d6e63'];

const SHAPES = [
  { name: 'Bolinha', render: F => ({ body: `<path d="${BLOB}" fill="${F}" ${BS}/>` }) },
  { name: 'Bloquinho', render: F => ({ body: `<rect x="22" y="28" width="76" height="80" rx="18" fill="${F}" ${BS}/>` }) },
  { name: 'Fantasminha', render: F => ({ body: `<path d="M24 64 C24 38 40 24 60 24 C80 24 96 38 96 64 L96 106 L86 97 L76 106 L66 97 L56 106 L46 97 L36 106 L24 97 Z" fill="${F}" ${BS}/>` }) },
  { name: 'Gatinho', render: F => ({ back: `<path d="M26 50 L28 12 L54 32 Z" fill="${F}" ${BS}/><path d="M94 50 L92 12 L66 32 Z" fill="${F}" ${BS}/><path d="M32 40 L33 22 L46 32 Z" fill="#ffafcc"/><path d="M88 40 L87 22 L74 32 Z" fill="#ffafcc"/>`, body: `<path d="${BLOB}" fill="${F}" ${BS}/>` }) },
  { name: 'Ursinho', render: F => ({ back: `<circle cx="32" cy="32" r="13" fill="${F}" ${BS}/><circle cx="88" cy="32" r="13" fill="${F}" ${BS}/><circle cx="32" cy="32" r="6" fill="#ffafcc"/><circle cx="88" cy="32" r="6" fill="#ffafcc"/>`, body: `<path d="${BLOB}" fill="${F}" ${BS}/>` }) },
  { name: 'Estrela', render: F => ({ body: star(60, 68, 54, 30, F, BS) }) },
  { name: 'Alien', render: F => ({ back: `<path d="M48 30 L38 6" stroke="#222" stroke-width="3"/><path d="M72 30 L82 6" stroke="#222" stroke-width="3"/><circle cx="38" cy="6" r="6" fill="${F}" ${BS}/><circle cx="82" cy="6" r="6" fill="${F}" ${BS}/>`, body: `<path d="M60 22 C98 22 104 46 100 70 C96 96 82 108 60 108 C38 108 24 96 20 70 C16 46 22 22 60 22 Z" fill="${F}" ${BS}/>` }) },
  { name: 'Gotinha', render: F => ({ body: `<path d="M60 10 C60 10 100 54 100 78 C100 98 84 108 60 108 C36 108 20 98 20 78 C20 54 60 10 60 10 Z" fill="${F}" ${BS}/>` }) },
];

const FACES = [
  { name: 'Sorriso', svg: dot(47, 58) + dot(73, 58) + SMILE },
  { name: 'Cantando', svg: S('M40 60 Q47 50 54 60') + S('M66 60 Q73 50 80 60') + '<ellipse cx="60" cy="80" rx="9" ry="11" fill="#5a0b1f"/><ellipse cx="60" cy="85" rx="5" ry="4" fill="#ff7a9a"/>' },
  { name: 'Descolado', svg: '<rect x="35" y="51" width="23" height="13" rx="5" fill="#111"/><rect x="62" y="51" width="23" height="13" rx="5" fill="#111"/><rect x="56" y="54" width="8" height="3" fill="#111"/>' + S('M50 78 Q60 84 72 74') },
  { name: 'Surpreso', svg: '<circle cx="47" cy="58" r="8" fill="#fff"/><circle cx="73" cy="58" r="8" fill="#fff"/><circle cx="49" cy="60" r="4" fill="#222"/><circle cx="71" cy="56" r="4" fill="#222"/><circle cx="60" cy="81" r="6" fill="#222"/>' },
  { name: 'Piscadinha', svg: dot(47, 58) + S('M66 58 Q73 52 80 58') + SMILE },
  { name: 'Apaixonado', svg: heart(47, 58, 8, '#e63946') + heart(73, 58, 8, '#e63946') + SMILE },
  { name: 'Rindo', svg: S('M41 52 L51 58 L41 64') + S('M79 52 L69 58 L79 64') + '<path d="M46 74 L74 74 Q74 92 60 92 Q46 92 46 74 Z" fill="#5a0b1f"/>' },
  { name: 'Linguinha', svg: dot(47, 58) + dot(73, 58) + '<path d="M55 79 Q55 92 61 92 Q67 92 67 79 Z" fill="#ff7a9a" stroke="#222" stroke-width="2"/>' + S('M48 76 Q60 84 72 76') },
  { name: 'Bravo', svg: S('M38 47 L54 53') + S('M82 47 L66 53') + dot(47, 60, 5) + dot(73, 60, 5) + S('M50 84 Q60 76 70 84') },
  { name: 'Sonolento', svg: S('M40 59 Q47 64 54 59') + S('M66 59 Q73 64 80 59') + '<circle cx="60" cy="80" r="4" fill="#222"/><text x="84" y="44" font-size="14" font-weight="900" fill="#fff" stroke="#222" stroke-width=".8">z</text><text x="93" y="33" font-size="10" font-weight="900" fill="#fff" stroke="#222" stroke-width=".6">z</text>' },
  { name: 'Estrelado', svg: star(47, 58, 10, 4.5, '#ffd23f') + star(73, 58, 10, 4.5, '#ffd23f') + '<path d="M46 74 Q60 94 74 74 Z" fill="#5a0b1f"/>' },
  { name: 'Emocionado', svg: dot(47, 58) + dot(73, 58) + '<path d="M44 66 Q40 73 44 75 Q48 73 44 66 Z" fill="#4cc9f0"/><path d="M76 66 Q72 73 76 75 Q80 73 76 66 Z" fill="#4cc9f0"/>' + S('M48 82 Q54 77 60 82 Q66 87 72 82') },
  { name: 'Vampiro', svg: dot(47, 58) + dot(73, 58) + S('M48 76 Q60 84 72 76') + '<path d="M52 79 L55 87 L58 80.5 Z" fill="#fff" stroke="#222" stroke-width="1"/><path d="M62 80.5 L65 87 L68 79 Z" fill="#fff" stroke="#222" stroke-width="1"/>' },
  { name: 'Bigodudo', svg: dot(47, 56) + dot(73, 56) + '<path d="M60 72 Q50 64 40 72 Q46 80 60 75 Q74 80 80 72 Q70 64 60 72 Z" fill="#3a2a1a"/>' + S('M54 84 Q60 87 66 84', 3) },
  { name: 'Tímido', svg: dot(47, 58, 5) + dot(73, 58, 5) + '<ellipse cx="38" cy="70" rx="7" ry="4" fill="#ff8fab" opacity=".85"/><ellipse cx="82" cy="70" rx="7" ry="4" fill="#ff8fab" opacity=".85"/>' + S('M54 78 Q60 82 66 78', 3) },
];

const flower = (() => {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = i * 2 * Math.PI / 5 - Math.PI / 2;
    s += `<circle cx="${(86 + 8 * Math.cos(a)).toFixed(1)}" cy="${(28 + 8 * Math.sin(a)).toFixed(1)}" r="6.5" fill="#ff70a6" stroke="#fff" stroke-width="1"/>`;
  }
  return s + '<circle cx="86" cy="28" r="5" fill="#ffd23f"/>';
})();

const lei = (() => {
  const cs = ['#ff006e', '#ffbe0b', '#8338ec', '#3a86ff', '#fb5607'];
  let s = '';
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = 28 * (1 - t) ** 2 + 120 * t * (1 - t) + 92 * t * t;
    const y = 90 * (1 - t) ** 2 + 224 * t * (1 - t) + 90 * t * t;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${cs[i % 5]}" stroke="#fff" stroke-width="1"/>`;
  }
  return s;
})();

const ACCESSORIES = [
  { name: 'Nenhum', front: '' },
  { name: 'Coroa', front: '<path d="M38 30 L44 12 L52 24 L60 8 L68 24 L76 12 L82 30 Z" fill="#ffd23f" stroke="#c99a00" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="22" r="3" fill="#e63946"/>' },
  { name: 'Chapéu de festa', front: '<path d="M46 30 L60 0 L74 30 Z" fill="#4cc9f0" stroke="#fff" stroke-width="2"/><path d="M52 18 L68 18" stroke="#ffd23f" stroke-width="3"/><circle cx="60" cy="0" r="4.5" fill="#ffd23f"/>' },
  { name: 'Fone de ouvido', front: '<path d="M22 62 Q22 20 60 20 Q98 20 98 62" stroke="#222" stroke-width="6" fill="none"/><rect x="13" y="52" width="15" height="24" rx="6" fill="#222"/><rect x="92" y="52" width="15" height="24" rx="6" fill="#222"/>' },
  { name: 'Microfone', front: '<rect x="94" y="70" width="8" height="32" rx="3" fill="#444" transform="rotate(20 98 86)"/><circle cx="92" cy="66" r="10" fill="#bbb" stroke="#444" stroke-width="3"/>' },
  { name: 'Laço', front: '<g transform="translate(80 28)"><path d="M0 0 L-15 -10 L-15 10 Z" fill="#ff006e" stroke="#fff" stroke-width="1.5"/><path d="M0 0 L15 -10 L15 10 Z" fill="#ff006e" stroke="#fff" stroke-width="1.5"/><circle r="4.5" fill="#c9184a"/></g>' },
  { name: 'Cartola', front: '<rect x="40" y="0" width="40" height="28" rx="3" fill="#222"/><rect x="40" y="19" width="40" height="5" fill="#e63946"/><rect x="28" y="26" width="64" height="7" rx="3.5" fill="#222"/>' },
  { name: 'Boné', front: '<path d="M28 38 Q28 12 60 12 Q92 12 92 38 Z" fill="#e63946"/><path d="M84 34 L112 36 Q114 42 104 42 L84 40 Z" fill="#b5172f"/><circle cx="60" cy="12" r="3.5" fill="#b5172f"/>' },
  { name: 'Auréola', front: '<ellipse cx="60" cy="10" rx="22" ry="6" fill="none" stroke="#ffd23f" stroke-width="5"/>' },
  { name: 'Chifrinhos', front: '<path d="M36 36 Q26 14 40 6 Q40 22 50 28 Z" fill="#d00000" stroke="#fff" stroke-width="1.5"/><path d="M84 36 Q94 14 80 6 Q80 22 70 28 Z" fill="#d00000" stroke="#fff" stroke-width="1.5"/>' },
  { name: 'Flor', front: flower },
  { name: 'Orelhas de coelho', front: '<ellipse cx="46" cy="12" rx="7.5" ry="17" fill="#fff" stroke="#ddd" stroke-width="2"/><ellipse cx="46" cy="14" rx="3.5" ry="11" fill="#ffafcc"/><ellipse cx="74" cy="12" rx="7.5" ry="17" fill="#fff" stroke="#ddd" stroke-width="2"/><ellipse cx="74" cy="14" rx="3.5" ry="11" fill="#ffafcc"/><path d="M30 34 Q60 20 90 34" stroke="#ffafcc" stroke-width="5" fill="none" stroke-linecap="round"/>' },
  { name: 'Chapéu de cowboy', front: '<path d="M12 34 Q60 46 108 34 Q102 44 60 45 Q18 44 12 34 Z" fill="#8b5a2b"/><path d="M36 35 Q36 8 50 9 Q60 16 70 9 Q84 8 84 35 Z" fill="#a0692f"/><rect x="36" y="28" width="48" height="5" fill="#5a3410"/>' },
  { name: 'Faixa anos 80', front: '<path d="M21 46 Q60 33 99 46 L99 55 Q60 42 21 55 Z" fill="#ff006e"/><path d="M21 50.5 Q60 37.5 99 50.5" stroke="#ffd23f" stroke-width="2" fill="none"/><path d="M98 48 L110 60 L104 46 Z" fill="#ff006e"/>' },
  { name: 'Gravata borboleta', front: '<path d="M60 102 L45 93 L45 111 Z" fill="#222"/><path d="M60 102 L75 93 L75 111 Z" fill="#222"/><circle cx="60" cy="102" r="4.5" fill="#555"/>' },
  { name: 'Colar havaiano', front: lei },
  { name: 'Black power', back: '<g fill="#2b1a0e"><circle cx="28" cy="48" r="17"/><circle cx="38" cy="26" r="19"/><circle cx="60" cy="16" r="21"/><circle cx="82" cy="26" r="19"/><circle cx="92" cy="48" r="17"/></g>', front: '' },
  { name: 'Pirata', front: '<path d="M24 44 Q30 16 60 16 Q90 16 96 44 Q60 30 24 44 Z" fill="#d00000"/><circle cx="46" cy="29" r="2.5" fill="#fff"/><circle cx="62" cy="24" r="2.5" fill="#fff"/><circle cx="78" cy="30" r="2.5" fill="#fff"/><path d="M96 42 L110 50 L104 38 Z" fill="#d00000"/><path d="M28 44 L92 66" stroke="#111" stroke-width="2"/><ellipse cx="73" cy="59" rx="10" ry="9" fill="#111"/>' },
  { name: 'Notas musicais', front: '<g fill="#fff" stroke="#222" stroke-width="1"><ellipse cx="94" cy="30" rx="6" ry="4.5" transform="rotate(-20 94 30)"/><rect x="98" y="6" width="3" height="23"/><path d="M101 6 Q110 10 108 20 Q106 12 101 13 Z"/><ellipse cx="18" cy="22" rx="5" ry="3.8" transform="rotate(-20 18 22)"/><rect x="21.5" y="3" width="2.6" height="18"/></g>' },
  { name: 'Óculos de coração', front: heart(47, 58, 11, 'rgba(255,0,110,.9)') + heart(73, 58, 11, 'rgba(255,0,110,.9)') + S('M56 55 L64 55', 3) },
  { name: 'Topete', front: '<path d="M28 42 Q22 6 62 6 Q98 8 100 32 Q86 20 72 27 Q60 12 46 29 Q36 31 28 42 Z" fill="#1b1b1b"/>' },
];

export const AVATAR_PARTS = { shapes: SHAPES, colors: COLORS, faces: FACES, accessories: ACCESSORIES };

export const AVATAR_LIMITS = {
  shape: SHAPES.length,
  color: COLORS.length,
  face: FACES.length,
  acc: ACCESSORIES.length,
};

export function isValidAvatar(a) {
  if (!a || typeof a !== 'object') return false;
  return Object.entries(AVATAR_LIMITS).every(([key, limit]) =>
    Number.isInteger(a[key]) && a[key] >= 0 && a[key] < limit);
}

export function randomAvatar(rng = Math.random) {
  const pick = n => Math.min(n - 1, Math.floor(rng() * n));
  return {
    shape: pick(AVATAR_LIMITS.shape),
    color: pick(AVATAR_LIMITS.color),
    face: pick(AVATAR_LIMITS.face),
    acc: pick(AVATAR_LIMITS.acc),
  };
}

export function renderAvatar(a) {
  const shape = SHAPES[a.shape].render(COLORS[a.color]);
  const acc = ACCESSORIES[a.acc];
  return '<svg viewBox="-5 -8 130 128">'
    + '<ellipse cx="60" cy="114" rx="32" ry="5" fill="rgba(0,0,0,.22)"/>'
    + (acc.back || '')
    + (shape.back || '')
    + shape.body
    + '<ellipse cx="42" cy="44" rx="9" ry="5" fill="rgba(255,255,255,.35)" transform="rotate(-25 42 44)"/>'
    + FACES[a.face].svg
    + (acc.front || '')
    + '</svg>';
}
