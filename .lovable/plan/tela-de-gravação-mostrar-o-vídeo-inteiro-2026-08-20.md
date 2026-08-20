# Tela de gravação: mostrar o vídeo inteiro

Hoje o cabeçalho e o painel de controles ficam sobrepostos ao vídeo (barras opacas por cima da imagem), então boa parte do enquadramento fica escondida — como na captura enviada, em que o topo e mais de um terço da base da câmera estão cobertos.

## O que muda (somente visual/layout)

- A tela de gravação passa a ser uma coluna: cabeçalho no topo, área da câmera no meio, controles embaixo — sem sobreposição.
- O quadro do vídeo é dimensionado para caber inteiro no espaço restante, mantendo 9:16 ou 16:9, com o teleprompter continuando por cima do vídeo (isso é intencional).
- Em telas baixas, o painel de controles ganha rolagem própria em vez de invadir a câmera.
- O botão de trocar câmera e o selo "Reels · 9:16 · 30s" ficam dentro da área do vídeo, discretos, sem tapar o rosto.
- Tocar no vídeo continua escondendo/mostrando os controles; com os controles ocultos, a câmera ocupa a tela toda.

Nada muda em gravação, teleprompter, geração de roteiro, download ou fechamento.

## Detalhes técnicos

- `src/routes/index.tsx` (bloco final da tela de gravação): trocar o `main` de `flex items-center justify-center` com filhos `absolute` por um `flex flex-col`: `<header slot>` + `<div className="min-h-0 flex-1">` com o quadro do vídeo (`max-h-full max-w-full`, `aspect-ratio`) + o painel de controles como filho de fluxo normal.
- `src/components/teleprompter/RecorderControls.tsx`: remover `absolute inset-x-0 top-0` / `bottom-0` das duas barras, retornando-as como blocos normais (`shrink-0`), com o painel inferior em `max-h-[45vh] overflow-y-auto` para telas baixas.
- Manter todas as props, handlers e estados atuais intactos; apenas classes utilitárias e estrutura JSX de layout.
