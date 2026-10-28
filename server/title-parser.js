import { readFileSync } from 'node:fs';

const SECTIONS = { ruido: 'noise', canais: 'channels', 'musica-primeiro': 'songFirst' };

export function parseDictionary(text) {
  const dict = { noise: [], channels: [], songFirst: [] };
  let section = 'noise';
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const header = line.match(/^\[(.+)\]$/);
    if (header) {
      section = SECTIONS[header[1].trim().toLowerCase()] ?? null;
      continue;
    }
    if (section) dict[section].push(line);
  }
  return dict;
}

export function loadDictionary(filePath) {
  return parseDictionary(readFileSync(filePath, 'utf8'));
}

// ---------- montagem das regex a partir do dicionário ----------

const stripAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = s => stripAccents(String(s ?? '')).toLowerCase().replace(/\s+/g, ' ').trim();

const ACCENT_CLASS = {
  a: '[aàáâãä]', e: '[eèéêë]', i: '[iìíîï]', o: '[oòóôõö]', u: '[uùúûü]', c: '[cç]', n: '[nñ]',
};

function tokenSource(token) {
  if (token === '{n}') return '[+-]?\\d+(?:[.,]\\d+)?';
  if (token === '{x}') return '\\S+';
  return [...norm(token)].map(ch => ACCENT_CLASS[ch] ?? ch.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&')).join('');
}

const termSource = term => norm(term).split(' ').map(tokenSource).join('\\s+');

// Fronteira de palavra que entende acentos ("clip" não casa dentro de "Eclipse").
const B_START = '(?<![\\p{L}\\p{N}])';
const B_END = '(?![\\p{L}\\p{N}])';

function alternation(terms) {
  const sorted = [...new Set(terms)].sort((a, b) => b.length - a.length);
  return sorted.length ? `(?:${sorted.map(termSource).join('|')})` : '(?!)';
}

const isStrong = term => /karaok|videok|playback/.test(norm(term));

const compiled = new WeakMap();

function compile(dict) {
  if (compiled.has(dict)) return compiled.get(dict);
  const allTerms = [...dict.noise, ...dict.channels];
  const strongTerms = [...dict.channels, ...dict.noise.filter(isStrong)];
  const TERM = B_START + alternation(allTerms) + B_END;
  const STRONG = B_START + alternation(strongTerms) + B_END;
  const SEP = '[\\s\\-:,;~|]*';
  const c = {
    term: new RegExp(TERM, 'iu'),
    termGlobal: new RegExp(TERM, 'giu'),
    strong: new RegExp(`^${STRONG}$`, 'iu'),
    strongStart: new RegExp(`^${SEP}${STRONG}${SEP}`, 'iu'),
    strongEnd: new RegExp(`${SEP}${STRONG}${SEP}$`, 'iu'),
    songFirst: new RegExp(B_START + alternation(dict.songFirst) + B_END, 'iu'),
  };
  compiled.set(dict, c);
  return c;
}

// ---------- passos do parser ----------

const ENTITIES = { '&amp;': '&', '&#39;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>' };

function preclean(raw) {
  return String(raw ?? '')
    .replace(/&(?:amp|#39|quot|lt|gt);/g, e => ENTITIES[e])
    .replace(/【/g, '[').replace(/】/g, ']')
    .replace(/[–—‒]/g, '-')
    .replace(/[\p{Extended_Pictographic}️‍★☆♪♫♬•]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const onlyTerms = (text, c) => /^[\s\p{P}\p{S}]*$/u.test(text.replace(c.termGlobal, ' '));

function cleanup(s) {
  let out = s;
  let prev;
  do {
    prev = out;
    out = out.replace(/[([]\s*[)\]]/g, ' ')
      .replace(/^[\s\-,:;~|]+|[\s\-,:;~|]+$/g, '')
      .replace(/\s+/g, ' ');
  } while (out !== prev);
  return out;
}

function trimStrongEnds(text, c) {
  let out = text;
  let prev;
  do {
    prev = out;
    out = out.replace(c.strongStart, '').replace(c.strongEnd, '');
  } while (out !== prev);
  return out;
}

// Uma sequência de termos no meio do texto, com pelo menos um termo forte, vira separador.
function splitOnMiddleRun(text, c) {
  const matches = [...text.matchAll(c.termGlobal)];
  let i = 0;
  while (i < matches.length) {
    let j = i;
    while (j + 1 < matches.length) {
      const gap = text.slice(matches[j].index + matches[j][0].length, matches[j + 1].index);
      if (!/^\s*$/.test(gap)) break;
      j++;
    }
    const start = matches[i].index;
    const end = matches[j].index + matches[j][0].length;
    const before = text.slice(0, start).trim();
    const after = text.slice(end).trim();
    const hasStrong = matches.slice(i, j + 1).some(m => c.strong.test(m[0]));
    if (before && after && hasStrong) return [before, after];
    i = j + 1;
  }
  return null;
}

const HINT = /[([]\s*(?:made popular by|in the style of|as made famous by|by)\s+([^)\]]+?)\s*[)\]]/i;

export function parseTitle(rawTitle, channel, dict) {
  const c = compile(dict);
  let text = preclean(rawTitle);
  const songFirst = c.songFirst.test(text) || c.songFirst.test(String(channel ?? ''));

  let hint = '';
  const hintMatch = text.match(HINT);
  if (hintMatch) {
    hint = hintMatch[1].trim();
    text = text.replace(hintMatch[0], ' ');
  }

  const segments = text.split('|').map(s => s.trim()).filter(s => s && !onlyTerms(s, c));
  text = segments[0] ?? '';

  let prev;
  do {
    prev = text;
    text = text.replace(/[([]([^()[\]]*)[)\]]/g, (m, inner) => (c.term.test(inner) ? ' ' : m));
  } while (text !== prev);

  text = trimStrongEnds(cleanup(text), c);

  let parts = text.split(/\s+-\s+/).map(cleanup).filter(p => p && !onlyTerms(p, c));
  if (!parts.length) parts = [cleanup(text)];

  let title;
  let artist;
  if (hint) {
    title = parts.join(' - ');
    artist = hint;
  } else if (parts.length === 1) {
    const split = splitOnMiddleRun(parts[0], c);
    [title, artist] = split ?? [parts[0], ''];
  } else if (songFirst) {
    title = parts[0];
    artist = parts.slice(1).join(' - ');
  } else {
    artist = parts[0];
    title = parts.slice(1).join(' - ');
  }

  const ch = norm(channel);
  if (ch && artist && norm(title) === ch && norm(artist) !== ch) [title, artist] = [artist, title];

  return { title: cleanup(title), artist: cleanup(artist) };
}
