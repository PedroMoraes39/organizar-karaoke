import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDictionary, loadDictionary, parseTitle } from '../server/title-parser.js';

const dict = loadDictionary(new URL('../config/palavras-ignoradas.txt', import.meta.url));

const cases = [
  ['Queen - Bohemian Rhapsody (Karaoke Version) Sing King', 'Sing King', 'Bohemian Rhapsody', 'Queen'],
  ['Strangers in the Night - Frank Sinatra | Karaoke Version | KaraFun', 'KaraFun Karaoke', 'Strangers in the Night', 'Frank Sinatra'],
  ['Only You (Made Popular By The Platters) [Karaoke Version] Party Tyme Karaoke', 'Party Tyme Karaoke', 'Only You', 'The Platters'],
  ['Marília Mendonça - Te Amo Demais (Karaokê - Áudio Oficial)', 'Marília Mendonça', 'Te Amo Demais', 'Marília Mendonça'],
  ['Uma Brasileira Karaoke Playback Paralamas do sucesso e Djavan', 'canta junto Karaokê', 'Uma Brasileira', 'Paralamas do sucesso e Djavan'],
  ['Outkast - Hey Ya - Karaoke Version from Zoom Karaoke', 'Zoom Karaoke Official', 'Hey Ya', 'Outkast'],
  ['Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)', 'Rick Astley', 'Never Gonna Give You Up', 'Rick Astley'],
  ['Fulano - Minha Letra Favorita (Karaokê)', '', 'Minha Letra Favorita', 'Fulano'],
  ['Minha Letra Favorita', '', 'Minha Letra Favorita', ''],
  ['Tempo Perdido Karaokê', '', 'Tempo Perdido', ''],
  ['Chitãozinho & Xororó - Evidências (KARAOKÊ) 🎤', '', 'Evidências', 'Chitãozinho & Xororó'],
  ['Lady Gaga - Shallow (Karaoke) [-2 tons]', '', 'Shallow', 'Lady Gaga'],
  ['Never Gonna Give You Up - Rick Astley', 'Rick Astley', 'Never Gonna Give You Up', 'Rick Astley'],
  ['Guns N&#39; Roses - Sweet Child O&#39; Mine (Karaoke)', '', "Sweet Child O' Mine", "Guns N' Roses"],
  ['Evidências', 'Qualquer Canal', 'Evidências', ''],
];

for (const [raw, channel, title, artist] of cases) {
  test(`parseTitle: ${raw}`, () => assert.deepEqual(parseTitle(raw, channel, dict), { title, artist }));
}

test('parseDictionary lê seções e ignora comentários', () => {
  assert.deepEqual(
    parseDictionary('# x\n[ruido]\nkaraoke\n\n[canais]\nsing king # canal\n[musica-primeiro]\nkarafun'),
    { noise: ['karaoke'], channels: ['sing king'], songFirst: ['karafun'] });
});
