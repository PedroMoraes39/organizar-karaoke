# Karaokê da Festa: design

**Data:** 2026-10-28
**Status:** aprovado (2026-10-28)

Esboços aprovados durante a conversa estão em [`mockups/`](mockups/):

- [`mockups/personagem.html`](mockups/personagem.html): montagem do personagem (formatos, cores, rostos e acessórios).
- [`mockups/sorteio-tv.html`](mockups/sorteio-tv.html): sequência do sorteio na TV, as três revelações e o player.
- [`mockups/celular.html`](mockups/celular.html): telas do celular "Minhas músicas" e "Nova música".

Os esboços são fragmentos HTML com scripts embutidos. Abrem direto no navegador (algumas cores de borda e de fundo dependem de variáveis que não estarão definidas, e não tem problema). Eles são **a referência visual e de comportamento**. O traço dos personagens pode ser caprichado na versão final.

---

## 1. Intenção

Deixar o karaokê de uma festa em casa mais dinâmico e divertido. Em vez de alguém escolher quem canta e o quê, **o app sorteia a música, se vai ser solo ou dupla, e quem vai cantar**, com animações que viram parte da brincadeira.

O cenário:

- A festa é numa casa. Um **notebook ligado à TV por HDMI** mostra o sorteio e toca o vídeo do YouTube. O notebook é o "admin": só ele sorteia e dá play.
- Cada convidado abre um **site no próprio celular** (sem instalar nada, sem cadastro). Escolhe um nome, monta um personagem e manda links de vídeos de karaokê do YouTube, quantos quiser.
- Ao mandar uma música, a pessoa pode **indicá-la para alguém** (ou para uma dupla), o que aumenta a chance dessa pessoa ou dupla ser sorteada para cantá-la.

O que torna o projeto especial: os personagens montáveis no estilo Gartic Phone, a surpresa do sorteio (ninguém vê a fila dos outros), as indicações/dedicatórias e as animações diferentes para cada tipo de sorteio.

## 2. Objetivos

1. Convidados entram pelo celular em segundos: nome e personagem, sem cadastro.
2. Cada convidado manda quantos links do YouTube quiser, opcionalmente indicando 1 ou 2 pessoas.
3. A TV sorteia música, solo/dupla e cantor(es) com animações, mostra quem sugeriu, quem canta e espera o play.
4. O sorteio é **justo e variado**: ninguém canta duas rodadas seguidas, quem cantou menos tem mais chance, e indicações e "música própria" pesam a favor.
5. Nome e artista da música aparecem corretos na TV, extraídos do título do YouTube e corrigíveis por quem mandou.
6. Tudo roda no notebook, numa rede Wi-Fi doméstica, para no máximo 20 pessoas.

## 3. Não objetivos

- Escalar além de ~20 usuários simultâneos ou de uma festa por vez.
- Cadastro, login ou senha para convidados.
- Hospedagem na internet. Roda só na rede local.
- App nativo de celular.
- Buscar músicas no YouTube de dentro do app. A pessoa cola o link.
- Mostrar para os convidados a fila de músicas dos outros.
- Pontuação/avaliação de canto, letra sincronizada, download de vídeos.
- Gerenciar convidados pela TV (remover, editar). Fora do escopo por enquanto.

## 4. Anti-objetivos (seria fracasso mesmo funcionando)

- A mesma pessoa sendo sorteada rodada após rodada.
- Estragar a surpresa: o celular revelando músicas dos outros ou o que vai ser sorteado.
- Entrar na festa dar trabalho (instalar app, criar conta, formulário longo).
- O vídeo começar sozinho. Ele **só toca quando alguém clica no ▶**.
- A TV mostrar títulos poluídos ("(Karaoke Version) | KaraFun | HD").
- A festa travar porque um vídeo não toca. Sempre tem que haver uma saída na TV.

## 5. Restrições

- **Escala:** até 20 pessoas simultâneas. Simplicidade vale mais que robustez de produção.
- **Rede:** celulares e notebook no mesmo Wi-Fi da casa. O notebook precisa de internet só para o YouTube (e para buscar o título do vídeo).
- **Ambiente de desenvolvimento:** Windows com **WSL2** (Linux). Se o servidor rodar dentro do WSL2 com a rede padrão (NAT), os celulares **não alcançam** a porta sem configuração extra (por exemplo, `networkingMode=mirrored` no `.wslconfig` mais uma regra no firewall do Windows, ou `netsh portproxy`). O projeto deve funcionar também com Node instalado direto no Windows, e o README deve explicar como deixar a porta acessível na rede.
- **QR code:** o notebook pode ter várias interfaces de rede (Wi-Fi, vEthernet do WSL, VPN). A detecção do IP da rede local precisa escolher a certa **e** permitir sobrescrever por configuração.
- **YouTube:** alguns vídeos bloqueiam reprodução incorporada (erros 101/150 do IFrame Player). Isso precisa ser tratado (ver §8.5).
- **Celulares:** navegadores modernos de iOS e Android. Layout pensado para celular e toque.
- **Persistência:** banco simples em arquivo.

## 6. Tecnologia (decidido)

| Parte | Escolha |
|---|---|
| Servidor | **Node.js**, um único programa no notebook que serve o site dos celulares e a tela da TV |
| Tempo real | Atualização ao vivo entre servidor, celulares e TV (WebSocket ou equivalente, a critério de quem constrói) |
| Banco | **SQLite**, um único arquivo na pasta do projeto |
| Acesso | Rede local + **QR code** na TV apontando para o endereço do site |
| Vídeo | **YouTube IFrame Player API** na tela da TV |
| Título do vídeo | **oEmbed do YouTube** (`https://www.youtube.com/oembed?url=<link>&format=json`), sem chave de API. Retorna `title`, `author_name` (canal) e `thumbnail_url`. Chamado **pelo servidor**. |

Iniciar tudo deve ser um comando só.

## 7. Celular

Referência: `mockups/personagem.html` e `mockups/celular.html`.

### 7.1 Entrada

- Campo **nome**. Nomes são **únicos na festa**: comparar sem diferenciar maiúsculas/minúsculas e acentos e sem espaços nas pontas. Nome em uso mostra "já tem uma Ana na festa".
- **Montar o personagem**, com quatro abas e as opções mostradas já aplicadas no personagem atual:
  - **Formato (8):** bolinha, bloquinho, fantasminha, gatinho, ursinho, estrela, alien, gotinha.
  - **Cor (12).**
  - **Rosto (15):** sorriso, cantando, descolado, surpreso, piscadinha, apaixonado, rindo, linguinha, bravo, sonolento, estrelado, emocionado, vampiro, bigodudo, tímido.
  - **Acessório (20 + nenhum):** coroa, chapéu de festa, fone, microfone, laço, cartola, boné, auréola, chifrinhos, flor, orelhas de coelho, chapéu de cowboy, faixa anos 80, gravata borboleta, colar havaiano, black power, pirata, notas musicais, óculos de coração, topete.
  - Botão **🎲 Aleatório**.
  - Personagens **podem** se repetir. Só o nome é único.
- Botão **Entrar na festa**.
- O aparelho **lembra a pessoa**: fechar e reabrir o navegador volta direto para "Minhas músicas".
- **Voltar por outro aparelho (decisão do usuário):** se o celular "esqueceu" a pessoa (aba anônima, dados apagados, outro celular) e ela digita um nome que já existe, o app pergunta **"É você, Ana?"**. Ao confirmar, ela volta como a mesma Ana, com personagem, músicas e histórico. Não há senha. O risco de alguém se passar por outra pessoa foi aceito em troca da simplicidade. Mais de um aparelho pode estar como a mesma pessoa ao mesmo tempo.

### 7.2 Tela 1: Minhas músicas (tela inicial após entrar)

- Topo: personagem, nome e quantas pessoas estão na festa.
- Lista das **minhas** músicas na fila. Cada item mostra miniatura, "Música – Artista", a indicação ("💌 para Bia & Léo" ou "sem indicação") e o botão 🗑️ para apagar (só enquanto está na fila).
- Seção **Já sorteadas**, com ✓ e quem cantou ("✓ Bia cantou").
- Lista vazia: recado convidando a mandar a primeira música.
- Botão fixo no rodapé: **＋ Adicionar música**.
- Opção discreta **Sair da festa**, com confirmação (ver §10.3, "Quem está na festa").
- Atualiza ao vivo (por exemplo, quando uma música minha é sorteada).

### 7.3 Tela 2: Nova música (abre deslizando sobre a tela 1)

- **← Voltar** no topo.
- **Link do YouTube.** Aceitar os formatos comuns (`youtube.com/watch?v=`, `youtu.be/`, `m.youtube.com`, `music.youtube.com`, links com `&list=`, `&t=` etc.) e extrair o ID do vídeo.
- Depois de colar: miniatura e dois campos **já preenchidos e editáveis**, **Música** e **Artista** (ver §9). Link inválido ou vídeo inexistente/privado mostra mensagem clara.
- **Música repetida (decisão do usuário):** se o mesmo vídeo, ou a mesma música e artista, já estiver **na fila** (de qualquer pessoa), o celular mostra "Música já adicionada à lista" e não deixa enviar. A comparação ignora maiúsculas, acentos, pontuação e espaços, e "&" vale "e". Confere ao colar o link e de novo ao enviar (os campos são editáveis). Música já sorteada ou apagada pode ser mandada de novo.
- **Indicar para alguém? (opcional, até 2)**
  - **Lista vertical** (não carrossel) com personagem, nome e um círculo para marcar ✓.
  - A própria pessoa aparece **primeiro**, como "Ana (você)". Os demais vêm em ordem alfabética.
  - Busca por nome no topo da lista.
  - Com 2 marcados, os outros ficam apagados, e tentar marcar um terceiro avisa "máximo de 2".
  - Um texto curto explica o efeito (sem indicação / 1 pessoa / dupla).
  - A lista mostra quem está na festa agora e atualiza quando alguém entra.
- **Recadinho (opcional, decisão do usuário):** campo curto (até ~60 caracteres) que só aparece quando há pelo menos uma pessoa indicada. Exemplo: "essa é a sua cara!". Aparece no envelope da revelação "Indicada" na TV.
- Botão fixo **Enviar para a fila 🎤**, habilitado só com link válido.
- Depois de enviar: volta para a tela 1, mostra "Música enviada! 🎉" e a música nova aparece no topo com um brilho.

### 7.4 Privacidade da fila

O celular **nunca** mostra músicas de outras pessoas nem quem mandou o quê. Isso só aparece na TV, no momento do sorteio.

## 8. TV (notebook)

Referência: `mockups/sorteio-tv.html`. A tela é pensada para 16:9 em tela cheia no navegador.

### 8.1 Tela de espera (lobby)

- Título da festa, **QR code** com o endereço do site (e o endereço escrito, para quem não consegue ler o QR).
- Personagens de todos que entraram, animados, atualizando ao vivo.
- "N músicas na fila · M cantores".
- Botão **🎲 SORTEAR**. Com a fila vazia, fica desabilitado com aviso.

### 8.2 Sequência do sorteio (~20 s em solo, ~25 s em dupla, aprovada como está no esboço)

1. **Música:** títulos girando como roleta, desacelerando até parar na sorteada, que mostra "sugerida por [personagem] Nome" (e "💌 indicada para X", se houver).
2. **Solo ou dupla:** moeda girando que cai em 🎤 SOLO ou 🎤🎤 DUPLA.
3. **Quem canta:** caça-níquel de personagens. Em dupla, os dois espaços param um depois do outro.
4. **Revelação**, diferente por tipo (§10.4):
   - 🎲 **Surpresa:** chuva de confete, "SURPRESA!", "Ana vai cantar a música que o João escolheu. Ninguém escapa!"
   - 💌 **Indicada:** um envelope entra, abre e sobe um cartão "De: João / Para: Ana", com o **recadinho** se houver. Depois, corações subindo e "INDICADA!".
   - ⭐ **Escolha própria:** tela escura com "🥁 E quem pediu essa música…", depois holofotes, brilhos e uma coroa caindo no personagem: "PEDIU, CANTOU! O palco é seu!"
5. **Player** (§8.3).

A revelação final (passo 4) **fica na tela até alguém clicar** em qualquer lugar ou no botão **Pular ⏭**, ou apertar **Espaço** (decisão do usuário). Os passos anteriores seguem sozinhos.

### 8.3 Player

- Topo: **🎵 Música**, artista embaixo, e uma etiqueta com o tipo (🎲 Surpresa / 💌 Indicada para X / ⭐ Escolha própria).
- Centro: vídeo do YouTube com um **▶ grande**. **Nada toca antes do clique.**
- Rodapé: **Sugerida por** (personagem e nome), **No microfone** (personagem(ns) e nome(s), em destaque) e quantas músicas faltam na fila.
- Botões:
  - **🎲 Sortear a próxima:** encerra a rodada e volta ao lobby (ou já inicia o próximo sorteio, a critério de quem constrói).
  - **Sortear outra pessoa:** ver §10.5.

### 8.4 Acesso aos controles

A tela da TV e seus controles **só funcionam no notebook**. Um convidado que digitar o endereço no celular não consegue sortear nem dar play. O mecanismo (aceitar só conexões locais, link secreto mostrado ao iniciar o servidor etc.) fica a critério de quem constrói.

### 8.5 Vídeo que não toca

Se o player acusar erro (incorporação bloqueada, vídeo removido), a TV mostra um aviso e oferece **sortear outra música**, sem travar a festa.
- A música problemática sai da fila e fica marcada como "não tocou". Fica a critério de quem constrói mostrar isso para quem a mandou.
- "Sortear outra música" faz um **sorteio completo novo** (música, solo/dupla e cantores), porque os pesos dependiam da música que falhou.
- A rodada que falhou **não conta para ninguém**: ninguém ganha +1 em "vezes que cantou" e a regra de "cantou na rodada anterior" continua valendo para a rodada de antes.
- Vale igual se o erro acontecer antes ou depois do play.

*(decisão minha)*

### 8.6 Nova festa

Um botão discreto no lobby, **com confirmação**, zera convidados, músicas e histórico para a próxima festa.

## 9. Nome e artista a partir do link

### 9.1 Fluxo

1. O servidor chama o oEmbed com o link e obtém `title` e `author_name` (canal).
2. **Limpa** o título com o dicionário (§9.2) e as regras (§9.3).
3. **Separa** em Música e Artista (§9.4).
4. O celular mostra os dois campos preenchidos. A pessoa corrige se precisar.
5. O que vai para o banco e para a TV é o que a pessoa confirmou. O título original também é guardado.

### 9.2 Dicionário de palavras ignoradas

Fica num **arquivo de texto editável** (sem mexer no código). Formato e localização ficam a critério de quem constrói. A comparação ignora maiúsculas/minúsculas e acentos. Conteúdo inicial:

| Grupo | Termos |
|---|---|
| Karaokê / versão | karaokê, karaoke, videokê, versão karaokê, karaoke version, versión karaoke, official karaoke, karaoke instrumental, playback, play back, instrumental, sem voz, no vocals, without vocals, backing track, fundo musical, base instrumental, minus one, off vocal |
| Letra | com letra, letra, legendado, with lyrics, lyrics on screen, lyrics, lyric video, con letra, sing along, cante junto |
| Vídeo / qualidade | official video, official audio, official music video, vídeo oficial, áudio oficial, clipe oficial, videoclipe, clip, HD, HQ, 4K, 1080p, remastered, remaster, remasterizado |
| Tom | tom masculino, tom feminino, male key, female key, lower key, higher key, `key of X`, `-1 tom`, `+2 tons` (padrões com número) |
| Canais | Sing King, KaraFun, Zoom Karaoke (inclusive "from Zoom Karaoke"), Party Tyme (inclusive "Karaoke Channel"), SongJam, EasyKaraoke, Stingray Karaoke |
| Símbolos | `\|` `•` `★` `♪` `【】`, emojis, parênteses e colchetes vazios, traços e espaços sobrando |

### 9.3 Regras de limpeza

- Só remover termos em **lugares seguros**:
  - dentro de `( )`, `[ ]` e `【 】`;
  - depois de um `|`;
  - num trecho separado por ` - ` que contenha **só** termos do dicionário;
  - no começo ou no fim do título, só para nomes de canais e termos "fortes" (os que contêm karaokê/karaoke, videokê ou playback).
- **Nunca** remover uma palavra do meio do nome da música: "Minha Letra Favorita" continua com esse nome. Exceção conhecida: uma música cujo nome é exatamente um termo do dicionário e fica sozinha num trecho ("Fulano - Letra") perde esse trecho. Quem mandou corrige no celular.
- Uma sequência de termos do dicionário **no meio** do título, sem traço nem parênteses, funciona como **separador** quando tem pelo menos um termo forte ("Uma Brasileira Karaoke Playback Paralamas do Sucesso e Djavan" vira "Uma Brasileira" + "Paralamas do Sucesso e Djavan").
- Ao final, limpar parênteses vazios, símbolos e espaços duplicados.

### 9.4 Separar música e artista

- **Pistas de artista:** `(Made Popular By X)`, `(In the Style of X)` e `(by X)` definem o artista como X.
- **Ordem padrão:** `Artista - Música`. É o formato do Sing King, do Zoom, do canal Party Tyme e da maioria dos canais brasileiros.
- **KaraFun** usa `Música - Artista`. Quando o título tem "KaraFun" ou o canal é o KaraFun, inverter.
- Se o **nome do canal** (`author_name`) for igual a um dos lados, aquele lado é o artista. Isso acontece quando o próprio cantor publica o vídeo.
- Sem separador identificável: tudo vai para Música, e Artista fica vazio para a pessoa preencher.

### 9.5 Casos de teste (títulos reais)

| Título | Música | Artista |
|---|---|---|
| Queen - Bohemian Rhapsody (Karaoke Version) Sing King | Bohemian Rhapsody | Queen |
| Strangers in the Night - Frank Sinatra \| Karaoke Version \| KaraFun | Strangers in the Night | Frank Sinatra |
| Only You (Made Popular By The Platters) [Karaoke Version] Party Tyme Karaoke | Only You | The Platters |
| Marília Mendonça - Te Amo Demais (Karaokê - Áudio Oficial) | Te Amo Demais | Marília Mendonça |
| Uma Brasileira Karaoke Playback Paralamas do sucesso e Djavan | Uma Brasileira | Paralamas do sucesso e Djavan |
| Outkast - Hey Ya - Karaoke Version from Zoom Karaoke | Hey Ya | Outkast |
| Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster) | Never Gonna Give You Up | Rick Astley |

Fontes da pesquisa: [web-scrobbler/metadata-filter](https://github.com/web-scrobbler/metadata-filter) (regras de limpeza de títulos do YouTube) e [boraoke PR #93](https://github.com/paulosalvatore/boraoke/pull/93) (parser de títulos de karaokê, com casos difíceis como "(In the Style of X)" e ordem ambígua).

## 10. Regras do sorteio

Cada rodada tem três sorteios em sequência.

### 10.1 Música

- Sorteio **uniforme** entre todas as músicas na fila (cada música tem a mesma chance, independente de quem mandou).
- A música sorteada **sai da fila** e não volta.

### 10.2 Solo ou dupla

- Música **indicada para 2 pessoas:** vai **direto para dupla**. A moeda aparece, mas cai em DUPLA. *(decisão minha; o usuário não se opôs)*
- Nos outros casos: 50% solo, 50% dupla.
- Se só houver 1 pessoa disponível para cantar: sempre solo.

### 10.3 Quem canta

**Quem está na festa:** todo mundo que entrou e não usou **Sair da festa**. O estado da conexão do celular **não** importa, porque em festa os celulares passam a maior parte do tempo com a tela bloqueada. Quem sai:
- some do lobby e da lista de indicação;
- não pode mais ser sorteado;
- tem as indicações recebidas ignoradas;
- **mantém as músicas na fila**, que continuam podendo ser sorteadas para os outros cantarem.

*(decisão minha)*

**Quem pode ser sorteado:** todos que estão na festa, **exceto quem cantou na rodada imediatamente anterior** (regra rígida). Se essa exclusão deixar gente de menos para a quantidade sorteada, ela é relaxada.

**Pesos** (sorteio ponderado; em dupla, sortear o primeiro e depois o segundo entre os restantes):

| Fator | Efeito | Valor inicial sugerido |
|---|---|---|
| Quantas vezes já cantou na festa | quem cantou menos tem mais chance *(palpite meu; o usuário não se opôs)* | peso base = `1 / (1 + vezes_que_cantou)` |
| Mandou a música | "um pouco mais de chance" | × 3 |
| Foi indicado na música | "bem mais chance" (não é garantia) | × 8 |

Os valores devem ficar fáceis de ajustar (configuração). O que importa é a ordem: indicado ≫ quem mandou > os demais, e ninguém tem chance zero exceto pela regra da rodada anterior.

Se a pessoa indicada não estiver mais na festa, a indicação é ignorada.

### 10.4 Tipo de revelação

Decidido **depois** de sortear quem canta, considerando todos os cantores da rodada, nesta prioridade:

1. Algum cantor foi **indicado** na música → 💌 **Indicada**.
2. Algum cantor **mandou** a música → ⭐ **Escolha própria**.
3. Caso contrário → 🎲 **Surpresa**.

Quem se indicou na própria música cai em "Indicada". *(decisão minha)*

### 10.5 Sortear outra pessoa

- Disponível no player, antes ou depois do play. Serve para quando a pessoa sorteada não está por perto.
- Em **solo**: sorteia outra pessoa para a mesma música. Em **dupla**: o admin toca no personagem de quem vai ser trocado, e só essa vaga é sorteada de novo. *(decisão minha)*
- Quem foi trocado fica fora **só desta rodada** e **não conta** como tendo cantado. *(decisão minha)*
- O novo sorteio usa as mesmas regras e pesos, com uma animação curta (só a etapa "quem canta" e a revelação).
- O tipo de revelação é recalculado.

### 10.6 Fim da rodada

Ao ir para a próxima (botão "Sortear a próxima"), a rodada é registrada: cada cantor ganha +1 em "vezes que cantou", e eles passam a ser "quem cantou na rodada anterior". Os celulares de quem mandou a música passam a mostrá-la em "Já sorteadas", com quem cantou.

## 11. Dados (entidades, não esquema)

- **Convidado:** nome (único na festa), personagem (formato, cor, rosto, acessório), identificação do aparelho, vezes que cantou.
- **Música:** link/ID do vídeo, título original, música e artista confirmados, canal, miniatura, quem mandou, até 2 indicados, recadinho opcional, situação (na fila / sorteada / apagada / não tocou), quando foi enviada.
- **Rodada:** música, solo/dupla, cantores, tipo de revelação, trocas feitas, horário.
- **Festa:** "nova festa" zera tudo (apagar ou arquivar fica a critério de quem constrói).

## 12. Estilo visual

Seguir os esboços: fundo em degradê roxo/magenta, cartões brancos arredondados no celular, botões principais amarelos com sombra "de botão", personagens com contorno branco e balanço contínuo. Na TV, as fontes escalam com a largura da tela.

## 13. Decisões tomadas sem consulta explícita (para revisão)

- Música indicada para 2 pessoas vai direto para dupla.
- Peso extra para quem cantou menos vezes.
- Valores iniciais dos pesos (×3 quem mandou, ×8 indicado).
- Prioridade das revelações (Indicada > Escolha própria > Surpresa).
- "Sortear outra pessoa" em dupla troca só uma vaga, e quem foi trocado não conta como tendo cantado.
- A própria pessoa aparece na lista de indicação ("Ana (você)").
- Vídeo que não toca sai da fila, a TV oferece um sorteio completo novo, e a rodada que falhou não conta.
- "Estar na festa" = entrou e não clicou em "Sair da festa" (o celular conectado ou não, tanto faz). Quem sai deixa as músicas na fila.
- Botão "nova festa" com confirmação.
- Dicionário de palavras num arquivo de texto editável.
- Controles da TV só funcionam no notebook.

## 14. Deixado para quem constrói

- Framework web, biblioteca de tempo real, estrutura de pastas e esquema do banco.
- Formato e local do arquivo do dicionário.
- Durações exatas das animações (manter o ritmo do esboço até a revelação final).
- Implementação do personagem (SVG por peças, como no esboço, é o caminho natural) e acabamento do traço.
- Mecanismo de proteção dos controles da TV.
- Se "Sortear a próxima" volta ao lobby ou já começa o sorteio.
- Efeitos sonoros (opcionais, não pedidos).
- Mensagens de erro e textos menores.
