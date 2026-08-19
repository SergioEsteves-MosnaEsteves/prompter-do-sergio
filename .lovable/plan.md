# Deixar a montagem do vídeo muito mais rápida

Hoje, ao salvar com fechamento, o app faz seis passagens de ffmpeg no aparelho: duas de inspeção de áudio, duas de re-codificação completa (gravação e fechamento) e a junção — tudo começando só depois do toque no botão, com o processador de vídeo (~30 MB) ainda sendo baixado na hora. O fechamento (arquivo de 3,9 MB) é re-codificado do zero em toda gravação, mesmo sendo sempre o mesmo vídeo.

A estratégia é eliminar trabalho repetido e tirar o que sobrar do caminho crítico.

## 1. Fechamento já pronto (maior ganho)

Gerar uma versão do vídeo de fechamento já no formato final de trabalho — 1080x1920, 30 fps constante, H.264 + AAC estéreo 48 kHz — e usá-la como asset do app. Com isso, a etapa de converter o fechamento (hoje ~1/3 do tempo) desaparece: o arquivo entra direto na junção.

O arquivo também fica bem menor, então baixa mais rápido no celular.

## 2. Não re-codificar a gravação quando não for preciso

Quando a gravação já sai em MP4/H.264 na mesma resolução do fechamento (caso do iPhone), trocar a re-codificação por uma remontagem sem recompressão. É uma operação de segundos em vez de minutos. A re-codificação completa continua existindo como caminho alternativo (WebM do Chrome/Android, resoluções diferentes).

Para ampliar esses casos, a gravação passa a mirar 1080x1920 / 1920x1080 no canvas, casando com o formato do fechamento.

## 3. Cortar as passagens de inspeção

As duas execuções que só servem para descobrir se existe faixa de áudio são substituídas pela informação que o app já tem (se o microfone estava ativo na gravação) e pelo fechamento, cujo áudio é conhecido de antemão. São duas passagens inteiras a menos sobre arquivos grandes.

## 4. Preparar tudo em segundo plano

- Carregar o processador de vídeo e baixar o fechamento assim que o usuário entra na tela de gravação, não no momento de salvar.
- Iniciar a montagem automaticamente logo que a gravação termina, enquanto o usuário assiste à prévia. Quando ele tocar em salvar, na maioria dos casos o arquivo já estará pronto — o botão vira "Salvar nas Fotos" na hora.
- Manter o resultado em cache: se o usuário tocar de novo, nada é reprocessado.

## 5. Processamento multi-thread (opcional, ganho grande)

O ffmpeg no navegador roda hoje com uma única thread. A versão multi-thread costuma ser 2 a 4 vezes mais rápida, mas exige cabeçalhos especiais de isolamento no servidor, que podem afetar conteúdo externo (por exemplo o vídeo servido pelo CDN). Proposta: implementar com detecção automática — usa multi-thread quando o navegador permitir, e volta ao modo atual quando não permitir. Fica por último, depois que os itens 1 a 4 forem validados.

## Detalhes técnicos

- `src/assets/outro-9x16.mp4`: substituir pelo arquivo pré-normalizado (`-vf scale=1080:1920`, `-r 30 -vsync cfr`, `libx264 -preset slow -crf 23`, `aac 48k stereo`, `-movflags +faststart`), gerado uma vez fora do app.
- `src/lib/append-outro.ts`:
  - remover `hasAudio()`; receber `hasAudio` como parâmetro vindo do gravador.
  - `normalize()` ganha um atalho: se `sizeIguais && mimeType.includes("mp4")`, executar `-c copy -movflags +faststart` em vez de `libx264`.
  - pular por completo a normalização do fechamento (asset já normalizado); só normalizar se a resolução alvo divergir de 1080x1920.
  - `-preset ultrafast -tune zerolatency` e `-threads 0` no caminho de re-codificação.
- `src/lib/ffmpeg-client.ts`: expor `warmFFmpeg()` (carrega core e grava o fechamento no FS virtual uma única vez, com cache entre montagens).
- `src/components/teleprompter/useRecorder.ts`: expor `hadAudio` e alinhar o canvas a 1080x1920 / 1920x1080.
- `src/routes/index.tsx`: chamar `warmFFmpeg()` ao entrar na tela de gravação; disparar a montagem automática no `onstop`; manter o fluxo de dois toques só como fallback quando a montagem ainda estiver em andamento.
