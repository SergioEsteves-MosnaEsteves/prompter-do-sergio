# Ajustar contraste dos botões de Duração e Plataforma

## O que muda para você

Os botões de **Duração** (30s / 60s / 90s) e **Plataforma** (Reels / YouTube) vão ficar mais claros e com mais contraste, deixando evidente que cada item é uma opção clicável e que existem outras alternativas além da selecionada.

## O que vai ser alterado

Apenas o componente `Segmented` em `src/routes/index.tsx`:

- **Fundo do grupo**: passa de cinza muito claro para uma cor de superfície com borda visível, criando um "dock" de botões.
- **Opção não selecionada**: fundo branco/superfície com borda sutil, texto em peso semibold e cor do texto mais forte, para não parecer desabilitada.
- **Opção selecionada**: mantém o laranja da marca, mas com destaque extra (sombra sutil ou borda laranja) para reforçar o estado ativo.
- **Hover/foco**: feedback visual mais evidente ao passar o dedo ou mouse sobre as opções não selecionadas.
- **Responsivo**: mantém o mesmo layout de grade e altura dos botões, sem quebrar em telas pequenas.

## O que não muda

- Funcionalidade: os valores, estados e eventos de clique permanecem iguais.
- Outros botões e controles da página (incluindo o botão "Gerar roteiro" e o seletor de formato do vídeo).
- Cores da marca Portas (laranja `#d64113`, verde-escuro `#25302c`).

## Detalhes técnicos

- Editar somente `src/routes/index.tsx`.
- Refatorar as classes Tailwind do componente `Segmented` (~linhas 810–829).
- Garantir que a variação selecionada use tokens semânticos (`bg-primary`, `text-primary-foreground`) e a não selecionada use `bg-background` / `border` / `text-foreground` com `hover:bg-muted`.
- Verificar contraste visual no preview mobile e desktop.

&nbsp;

POnto adicional: mude o subtítulo da área do roteiro para "Ajuste o roteiro ao seu estilo)