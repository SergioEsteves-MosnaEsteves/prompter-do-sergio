# Vídeo de fechamento colado no final

Quando você baixar a gravação, o app vai juntar automaticamente o seu vídeo de assinatura no final, gerando um único MP4.

## Como vai funcionar

1. Você grava normalmente.
2. Na tela de prévia, ao tocar em "Baixar", o app junta gravação + fechamento no próprio aparelho (nada sai para servidor).
3. Aparece uma barra de progresso ("Montando vídeo…") e, ao terminar, o download começa com o arquivo final em MP4.
4. O resultado fica salvo na prévia, então baixar de novo não reprocessa.

## Detalhes

- O fechamento é um arquivo fixo embutido no app (vertical 9:16), que você me envia.
- Se a gravação estiver em 16:9, o fechamento é adaptado ao formato da gravação (com barras laterais na cor de fundo) para o vídeo final ficar contínuo, sem erro de montagem.
- O áudio do fechamento é preservado. Se a gravação não tiver áudio, é gerada uma faixa silenciosa para a junção funcionar.
- Junção pode levar alguns segundos em celulares mais simples; se falhar, o app avisa e oferece baixar só a gravação.

## Parte técnica

- Novo asset em `public/outro/outro-9x16.mp4` (arquivo que você fornecer).
- Novo módulo `src/lib/append-outro.ts` reutilizando a instância ffmpeg.wasm já usada em `src/lib/convert-to-mp4.ts` (refatorar `getFFmpeg` para um `src/lib/ffmpeg-client.ts` compartilhado).
- Pipeline: normalizar gravação e outro para mesma resolução/fps/SAR/codecs (`scale`+`pad`, `libx264` yuv420p, `aac` 48kHz estéreo) e concatenar com o filtro `concat` (não `-c copy`, que quebra com fontes diferentes).
- Em `src/routes/index.tsx`: substituir o `<a download>` direto por um handler assíncrono que roda a junção, expõe progresso e dispara o download via `URL.createObjectURL`; reaproveitar `rec.replaceResult` para guardar o blob final.
- Extensão/nome final: `gravacao-<timestamp>.mp4`.

## O que preciso de você

O arquivo do vídeo de fechamento (MP4 vertical 9:16, de preferência já com áudio). É só anexar na próxima mensagem.
