const ID = '[A-Za-z0-9_-]{11}';
const HOST = '(?:https?:\\/\\/)?(?:www\\.|m\\.|music\\.)?';
const PATTERNS = [
  new RegExp(`${HOST}youtube\\.com\\/watch\\?(?:[^\\s#]*&)?v=(${ID})(?![A-Za-z0-9_-])`),
  new RegExp(`${HOST}youtube\\.com\\/(?:shorts|embed|live)\\/(${ID})(?![A-Za-z0-9_-])`),
  new RegExp(`(?:https?:\\/\\/)?youtu\\.be\\/(${ID})(?![A-Za-z0-9_-])`),
];

// Acha o primeiro link do YouTube em qualquer parte do texto colado.
export function parseVideoId(input) {
  const text = String(input ?? '');
  for (const re of PATTERNS) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

const NOT_FOUND = new Set([400, 401, 403, 404]);

export async function fetchVideoInfo(videoId, fetchImpl = globalThis.fetch) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  let res;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new Error('lookup_failed');
  }
  if (NOT_FOUND.has(res.status)) return null;
  if (!res.ok) throw new Error('lookup_failed');
  const data = await res.json();
  return { title: data.title, channel: data.author_name, thumbnail: data.thumbnail_url };
}
