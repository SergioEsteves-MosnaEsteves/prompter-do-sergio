## O que está acontecendo

Não é zoom de verdade — é recorte. Três coisas somam:

1. Pedimos à câmera uma imagem 1080x1920 / proporção 9:16. O iPhone não entrega 9:16 nativo: ele pega o sensor (4:3 ou 16:9) e **corta as laterais**, perdendo boa parte do campo de visão.
2. A prévia usa `object-cover` e o canvas de gravação usa recorte tipo "cover", cortando ainda mais para preencher a moldura vertical.
3. No app Câmera nativo, o iPhone pode usar a lente ultra-wide (0.5x); no navegador ele entrega a lente padrão, que já é mais fechada.

Confirmado no código: `useRecorder.ts` define `width/height/aspectRatio` fixos e faz `Math.max(...)` (cover) no canvas; `index.tsx` renderiza o vídeo com `object-cover`.

## O que fazer

**1. Parar de forçar a proporção na captura**
- Remover `aspectRatio` e as dimensões travadas do `getUserMedia`; pedir só a resolução máxima disponível (`width: { ideal: 1920 }`, `height: { ideal: 1080 }`, sem `exact`).
- Deixar o enquadramento vertical para o canvas, não para o sensor. Assim a câmera entrega o campo de visão completo.

**2. Tentar a lente mais aberta no iPhone**
- Ao abrir a câmera, listar os dispositivos de vídeo e, quando houver mais de uma câmera traseira, preferir a de maior campo de visão (ultra-wide) via `deviceId`, com fallback para `facingMode`.
- Aplicar `zoom` mínimo das capacidades quando existir (alguns navegadores abrem já acima de 1x).

**3. Indicador de zoom correto**
- Mostrar o zoom real na barra (1x = campo de visão nativo) e garantir que o slider comece no mínimo real da câmera, não num valor já ampliado.

**4. Opção de enquadramento**
- Novo controle na barra de gravação: **Preencher** (recorte atual, cover) ou **Cabe tudo** (contain, com faixas pretas nas laterais/topo).
- O modo "Cabe tudo" mantém todo o campo de visão dentro do vídeo 9:16 — ninguém fica cortado. Padrão continua "Preencher".

**5. Consistência prévia ↔ arquivo**
- A prévia passa a usar o mesmo modo de enquadramento do canvas, para o que se vê ser o que se grava.

## Detalhes técnicos

- Arquivos: `src/components/teleprompter/useRecorder.ts` (constraints, escolha de lente, `fit` no `buildOrientedStream`), `src/routes/index.tsx` (estilo do vídeo conforme o `fit`), `src/components/teleprompter/RecorderControls.tsx` (botão de enquadramento).
- `buildOrientedStream` passa a receber `fit: "cover" | "contain"` e usa `Math.max` ou `Math.min` na escala, limpando o canvas a cada frame no modo contain.
- Enumeração de dispositivos só funciona depois da primeira permissão concedida; a lógica roda após o primeiro `getUserMedia` e reabre o stream se encontrar uma lente mais aberta.

## Limitação

O Safari no iPhone não expõe a ultra-wide de forma garantida em todos os modelos/versões. Se ela não aparecer, o modo "Cabe tudo" ainda resolve o corte, mas o ângulo continuará o da lente padrão — mais fechado que o app Câmera nativo.
