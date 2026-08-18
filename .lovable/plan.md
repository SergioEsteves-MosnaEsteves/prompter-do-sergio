# Corrigir a junção do vídeo de fechamento

## O que está acontecendo

O download cai no aviso "Não foi possível juntar o vídeo de fechamento" porque a montagem no aparelho falha e o app engole o erro sem mostrar a causa. Dois problemas concretos no código de montagem:

1. O filtro de áudio usa rótulos opcionais (`[0:a?]`, `[1:a?]`) dentro do `filter_complex`. Esse "?" só é válido no mapeamento, não no filtro. Quando a gravação (ou o fechamento) não tem faixa de áudio válida, o processo aborta.
2. O vídeo de fechamento está em 2160x3840 (4K vertical, ~4 MB). Reprocessar 4K junto com a gravação estoura memória com facilidade no navegador, principalmente no iPhone.

## O que será feito

1. **Detectar áudio antes de montar**: verificar se cada vídeo tem faixa de áudio e montar o comando conforme o caso (silêncio gerado apenas para quem não tem), eliminando a sintaxe inválida.
2. **Reduzir o fechamento antes de juntar**: converter o fechamento para a resolução da gravação em uma etapa separada e leve, evitando processar 4K junto com o resto.
3. **Mostrar o motivo real da falha**: capturar o log do processamento e exibir uma mensagem específica (memória, arquivo não baixado, formato não suportado), além de registrar no console para diagnóstico.
4. **Manter o comportamento seguro**: se ainda assim falhar, baixa só a gravação, como hoje.

## Detalhes técnicos

- `src/lib/append-outro.ts`: substituir o `filter_complex` único por um pipeline em duas etapas (normalizar o outro → concatenar), com detecção de faixas de áudio via `ffmpeg.on("log")` / `ffprobe`-like parsing ou via elemento `<video>`/`AudioContext` no cliente; usar `anullsrc` só quando necessário; limitar resolução de trabalho a no máximo 1080x1920.
- `src/lib/ffmpeg-client.ts`: expor coleta de log para relatar a linha de erro.
- `src/routes/index.tsx`: no `catch` do `downloadVideo`, usar a mensagem detalhada retornada pela montagem.
