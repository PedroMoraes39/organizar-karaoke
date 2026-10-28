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

Na configuração padrão do WSL2 os celulares **não alcançam** o programa. Escolha uma das opções:

- **Rede espelhada (Windows 11):** crie ou edite o arquivo `%UserProfile%\.wslconfig` com

  ```ini
  [wsl2]
  networkingMode=mirrored
  ```

  Depois rode `wsl --shutdown` no PowerShell, abra o WSL de novo e libere a porta no firewall (comando acima).
- **Ou rode o Node direto no Windows:** instale o Node no Windows e rode `npm install` e `npm start` numa pasta do Windows.

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
