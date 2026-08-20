# Reduzir o rodapé de gravação para 40% do tamanho atual

## O que muda para você

Durante a gravação, o rodapé de controles do teleprompter fica muito menor, liberando mais espaço vertical para o vídeo. O botão de gravar (72px) e os botões de velocidade (Menos/Mais) continuam do mesmo tamanho para fácil acesso no celular.

## O que vai ser alterado

### 1. Modo compacto no rodapé durante a gravação

Em `src/components/teleprompter/RecorderControls.tsx`:

- Quando `recording === true`, renderizar um rodapé **compacto de uma única linha** com:
  - Play/Pause (botão pequeno, sem reduzir a área de toque além do mínimo acessível)
  - Reiniciar roteiro (botão pequeno)
  - Botão "Menos" de velocidade (44px, mesmo tamanho)
  - Botão de gravar (72px, mesmo tamanho)
  - Botão "Mais" de velocidade (44px, mesmo tamanho)
  - Label da velocidade atual, mantida legível
- Remover do rodapé durante a gravação os controles de: Fonte, Opacidade, Altura, Zoom e Enquadramento.
- Reduzir paddings, gaps e espaçamentos internos ao mínimo necessário para encaixar numa única linha.

### 2. Manter acesso aos ajustes escondidos

Em `src/routes/index.tsx`, na tela de configuração (`stage === "setup"`), adicionar ao card **Teleprompter** (ou a um novo card **Câmera**):

- Slider de Zoom
- Toggle de Enquadramento (Preencher / Cabe tudo)

Esses dois ajustes só existiam no rodapé de gravação. Com a nova versão compacta, o usuário deve configurá-los antes de começar a gravar.

### 3. Antes de iniciar a gravação

Quando `recording === false` (ainda na tela de câmera, mas não gravando), o rodapé continua mostrando os controles completos atuais, para que o usuário possa fazer ajustes finos de última hora.

## O que não muda

- Tamanho do botão de gravar (72px) e dos botões de velocidade (44px).
- Funcionalidade dos controles: play/pause, reiniciar, ajuste de velocidade, gravação.
- Layout do cabeçalho superior (temporizador, saída, logo).
- Comportamento de tocar no vídeo para esconder/mostrar controles.
- Cores, tipografia e estilo da marca Portas.

## Detalhes técnicos

- Editar `src/components/teleprompter/RecorderControls.tsx`: adicionar renderização condicional por `recording` e nova variante compacta do rodapé.
- Editar `src/routes/index.tsx`: adicionar Zoom e Enquadramento ao card de Teleprompter (ou novo card) na tela de configuração.
- Ajustar altura máxima do rodapé compacto para ficar abaixo de 40% da altura atual do rodapé completo.
- Verificar visualmente no preview mobile e desktop para garantir que o botão de gravar e os controles de velocidade permanecem acessíveis e que o vídeo ganha espaço real.

&nbsp;

# Diminuir o espaço entre as opções do Teleprompter

&nbsp;

## O que muda para você

&nbsp;

As quatro opções do Teleprompter (Velocidade, Tamanho da fonte, Opacidade da faixa, Altura da faixa) vão ficar mais juntas e compactas, ocupando menos espaço vertical na tela sem perder a legibilidade dos valores.

&nbsp;

## O que vai ser alterado

&nbsp;

Apenas o card **"Teleprompter"** em `src/routes/index.tsx` e o componente `Row` local:

&nbsp;

- **Remover os divisores horizontais** `<div className="h-px bg-border" />`) entre os sliders, deixando as opções grudadas visualmente.

- **Reduzir o espaço interno de cada opção** para que label + valor + slider fiquam mais compactos.

- **Diminuir o padding do card** ou o espaço entre as opções, ganhando mais altura útil para o roteiro e a câmera.

- **Manter as mesmas labels e valores** — só o espaçamento visual muda.

- **Ajustar o componente `Row`** para aceitar uma variação compacta (ou reescrever os controles diretamente no card) sem impactar outros cards.

&nbsp;

## O que não muda

&nbsp;

- Funcionalidade dos sliders (mínimos, máximos, passos, eventos).

- Outros cards da página (Roteiro, Vídeo, Fechamento, etc.).

- Cores, tipografia e botões da marca Portas.

&nbsp;

## Detalhes técnicos

&nbsp;

- Editar `src/routes/index.tsx`.

- Ajustar o card de Teleprompter (linhas ~471–511) e o componente `Row` (linhas ~836–856) para uma versão compacta.

- Verificar visualmente no preview mobile e desktop para garantir que não ficou apertado demais.