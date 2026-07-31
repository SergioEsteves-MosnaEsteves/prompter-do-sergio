## O que acontece hoje

Em `src/components/teleprompter/useRecorder.ts` (linhas 75-83) a lista de formatos testa **WebM primeiro** e só cai para MP4 se nenhum WebM for suportado:

```
video/webm;codecs=vp9,opus  ← escolhido no Chrome/Android
video/webm;codecs=vp8,opus
video/webm
video/mp4;codecs=h264,aac
video/mp4
```

O Safari do iPhone já grava em MP4 (não suporta WebM), mas Chrome/Android e Chrome no desktop escolhem WebM — e a galeria do celular não aceita esse arquivo.

## O que fazer

**1. Preferir MP4 sempre que o navegador suportar**
- Inverter a ordem: `video/mp4;codecs=h264,aac` → `video/mp4` → depois os WebM como último recurso.
- Isso já resolve em Safari, Chrome desktop recente e boa parte do Android moderno (Chrome ganhou gravação MP4/H.264).

**2. Converter para MP4 quando só houver WebM**
- Na tela de prévia, se o arquivo saiu WebM, mostrar um botão "Converter para MP4 (salvar na galeria)" com barra de progresso.
- A conversão roda 100% no aparelho com `@ffmpeg/ffmpeg` (WebAssembly) — sem servidor, sem upload.
- Sem re-encode quando possível; se o vídeo for VP8/VP9, é preciso recodificar para H.264, o que leva alguns segundos por minuto de vídeo.
- Depois de converter, o botão "Baixar vídeo" passa a entregar o `.mp4`.

**3. Ajustes de download**
- Nome do arquivo com extensão correta (`.mp4` após a conversão).
- No iPhone, manter a dica curta: "Toque em Baixar e depois em Salvar em Vídeos".

## Detalhes técnicos

- `pickMimeType()`: reordenar candidatos; manter `MediaRecorder.isTypeSupported` como filtro.
- `resultExt` continua derivado do `rec.mimeType` real.
- Novo módulo `src/lib/convert-to-mp4.ts` carregando `@ffmpeg/ffmpeg` + `@ffmpeg/util` dinamicamente (só ao clicar em converter, para não pesar o carregamento inicial), com `-c:v libx264 -preset veryfast -c:a aac -movflags +faststart`.
- Estado de conversão (`idle | loading | running | done | error`) e progresso na tela de prévia em `src/routes/index.tsx`.

## Limitação conhecida

O ffmpeg WebAssembly ocupa memória e pode ficar lento em celulares antigos com vídeos longos (acima de ~3-4 minutos). O passo 1 evita a conversão na maioria dos aparelhos atuais; o passo 2 é a rede de segurança.
