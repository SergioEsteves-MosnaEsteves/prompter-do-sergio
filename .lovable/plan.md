# Diminuir o espaço entre as opções do Teleprompter

## O que muda para você

As quatro opções do Teleprompter (Velocidade, Tamanho da fonte, Opacidade da faixa, Altura da faixa) vão ficar mais juntas e compactas, ocupando menos espaço vertical na tela sem perder a legibilidade dos valores.

## O que vai ser alterado

Apenas o card **"Teleprompter"** em `src/routes/index.tsx` e o componente `Row` local:

- **Remover os divisores horizontais** (`<div className="h-px bg-border" />`) entre os sliders, deixando as opções grudadas visualmente.
- **Reduzir o espaço interno de cada opção** para que label + valor + slider fiquam mais compactos.
- **Diminuir o padding do card** ou o espaço entre as opções, ganhando mais altura útil para o roteiro e a câmera.
- **Manter as mesmas labels e valores** — só o espaçamento visual muda.
- **Ajustar o componente `Row`** para aceitar uma variação compacta (ou reescrever os controles diretamente no card) sem impactar outros cards.

## O que não muda

- Funcionalidade dos sliders (mínimos, máximos, passos, eventos).
- Outros cards da página (Roteiro, Vídeo, Fechamento, etc.).
- Cores, tipografia e botões da marca Portas.

## Detalhes técnicos

- Editar `src/routes/index.tsx`.
- Ajustar o card de Teleprompter (linhas ~471–511) e o componente `Row` (linhas ~836–856) para uma versão compacta.
- Verificar visualmente no preview mobile e desktop para garantir que não ficou apertado demais.
