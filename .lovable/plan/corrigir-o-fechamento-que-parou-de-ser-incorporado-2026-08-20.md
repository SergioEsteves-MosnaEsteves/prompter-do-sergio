# Corrigir o fechamento que parou de ser incorporado

## O que está acontecendo

O vídeo de fechamento é baixado uma vez e guardado em cache para acelerar as montagens seguintes. Ao enviá-lo para o processador de vídeo, o navegador **transfere** (em vez de copiar) a memória desse arquivo. Depois da primeira montagem, o dado em cache fica "vazio/desanexado" — e a próxima tentativa falha com:

- Mac/Chrome: "An ArrayBuffer is detached and could not be cloned"
- iPhone/Safari: "The object can not be cloned"

Por isso o app cai no aviso e salva só a gravação.

## O que será feito

1. Enviar sempre uma **cópia nova** do fechamento (e da gravação) para o processador, mantendo o cache intacto entre montagens.
2. Guardar o fechamento em cache em um formato imune à transferência, recriando o buffer a cada uso.
3. Detectar o caso de dado desanexado e, se ocorrer, rebaixar o fechamento automaticamente antes de desistir.
4. Manter o comportamento seguro atual: se ainda assim falhar, salva só a gravação com a mensagem detalhada.

## Detalhes técnicos

- `src/lib/append-outro.ts`:
  - `fetchOutro()` passa a cachear o `ArrayBuffer` e devolver `new Uint8Array(buffer.slice(0))` a cada chamada.
  - antes de `ffmpeg.writeFile(outroNorm, outro)`, criar cópia defensiva (`outro.slice()`); idem para a gravação no caminho de retry (`recording.arrayBuffer()` já é novo, mas a cópia evita reuso do mesmo view).
  - no `catch` de "Falha ao copiar os vídeos", se a mensagem indicar `detached`/`cloned`, limpar o cache do fechamento, refazer o `fetchOutro()` e tentar a escrita uma segunda vez antes de lançar o erro.
- Nenhuma mudança de UI ou de fluxo de gravação.
