# 🎤 Karaokê da Festa

Um karaokê para festa em casa:

- **No notebook:** ligado na TV, o app sorteia a música, se vai ser solo ou dupla e quem canta, com animações, e toca o vídeo do YouTube.
- **No celular:** os convidados entram pelo navegador (sem instalar nada), montam um personagem e mandam links de karaokê do YouTube. Dá para indicar uma música para alguém.

Design e plano: [`docs/superpowers/specs/`](docs/superpowers/specs/) e [`docs/superpowers/plans/`](docs/superpowers/plans/).

## Requisitos

- **Node.js 22.13 ou mais novo** ([nodejs.org](https://nodejs.org)).
- Notebook e celulares **no mesmo Wi-Fi**.
- Internet no notebook, para tocar os vídeos e ler o título deles.

## Como rodar

```bash
npm install
npm start
```

O terminal mostra os endereços:

```
🎤 Karaokê da Festa rodando!
   TV (abra no notebook):         http://localhost:3000/tv
   Celulares (QR code na TV):     http://192.168.0.23:3000/
   TV a partir de outro aparelho: http://192.168.0.23:3000/tv?key=...
```

1. No notebook ligado na TV, abra `http://localhost:3000/tv` e coloque o navegador em tela cheia (F11).
2. Os convidados leem o QR code da TV com a câmera do celular.
3. A tela da TV e os controles só funcionam no próprio notebook. Se precisar abrir em outro aparelho, use o link com `?key=`.

## Rede: fazendo os celulares acharem o notebook

### Windows

Libere a porta no firewall uma vez. Abra o PowerShell **como administrador** e rode:

```powershell
New-NetFirewallRule -DisplayName "Karaoke" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### WSL2 (Linux dentro do Windows)

Na configuração padrão do WSL2 (modo NAT) os celulares **não alcançam** o programa, e o QR code mostra um IP interno (`172.x.x.x`). O `npm start` avisa quando isso acontece. Escolha uma das opções:

- **Rede espelhada (Windows 11 22H2 ou mais novo, recomendado).**
  1. Crie ou edite o arquivo `%UserProfile%\.wslconfig` com

     ```ini
     [wsl2]
     networkingMode=mirrored
     ```

  2. Rode `wsl --shutdown` no PowerShell e abra o WSL de novo.
  3. No modo espelhado quem bloqueia a entrada é o **firewall do Hyper-V**. Libere a porta no PowerShell **como administrador**:

     ```powershell
     New-NetFirewallHyperVRule -Name Karaoke -DisplayName Karaoke -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 3000
     ```

     e também a regra normal do Windows (comando da seção acima).
- **Encaminhamento de porta (Windows 10 ou modo NAT).** No WSL, descubra o IP interno com `hostname -I`. No PowerShell **como administrador**:

  ```powershell
  netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<IP-do-WSL>
  ```

  Libere a porta no firewall (comando da seção acima) e inicie informando o IP do notebook no Wi-Fi: `KARAOKE_IP=192.168.x.x npm start`. O IP interno do WSL muda quando o Windows reinicia; aí é preciso refazer o `portproxy`.
- **Ou rode o Node direto no Windows:** instale o Node no Windows e rode `npm install` e `npm start` numa pasta do Windows.

Fontes: [Microsoft Learn, rede no WSL](https://learn.microsoft.com/windows/wsl/networking).

### O QR code mostra o IP errado?

Descubra o IP do notebook no Wi-Fi (no Windows: `ipconfig`, procure "Endereço IPv4" do adaptador Wi-Fi) e informe esse IP ao iniciar:

```bash
KARAOKE_IP=192.168.0.23 npm start          # Linux/WSL/macOS
$env:KARAOKE_IP="192.168.0.23"; npm start  # PowerShell
```

## Configurações (variáveis de ambiente)

| Variável | Para quê | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `3000` |
| `KARAOKE_IP` | IP mostrado no QR code | detectado automaticamente |
| `KARAOKE_DB` | Arquivo do banco SQLite | `data/karaoke.sqlite` |
| `KARAOKE_ADMIN_KEY` | Chave do link da TV para outros aparelhos | sorteada a cada início |

Os pesos do sorteio (×3 para quem mandou a música, ×8 para quem foi indicado) ficam em [`server/config.js`](server/config.js).

## Palavras ignoradas nos títulos

O app lê o título do vídeo no YouTube e tenta separar **música** e **artista**, tirando coisas como "(Karaoke Version)" e "| KaraFun". A lista de palavras fica em [`config/palavras-ignoradas.txt`](config/palavras-ignoradas.txt). Edite à vontade e reinicie (`npm start`). Quem manda a música sempre pode corrigir os dois campos no celular.

## Nova festa

Na tela da TV, o botão **Nova festa** (no canto) apaga convidados, músicas e histórico.

## Testes

```bash
npm test
```
