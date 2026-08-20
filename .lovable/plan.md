# Por que o ícone da chave não mudou no header

## Diagnóstico (verificado no código)

O header não usa o componente que foi alterado da forma esperada:

- `SiteHeader` (src/components/portas/SiteChrome.tsx:7) renderiza `PortasLockup`, que renderiza `PortasWordmark`.
- `PortasWordmark` (src/components/portas/PortasBrand.tsx:55) chama o ícone com `color="var(--portas-on-dark-strong)"`, ou seja, **branco** — não o laranja da marca.
- O ícone é um SVG **desenhado à mão** (círculo + trapézio) em `PortasKeyIcon`; a imagem enviada (`chave_e_barra-2.png`) nunca foi adicionada ao projeto (não existe nada em `src/assets` além dos vídeos).
- O único lugar que mostra a chave laranja em bloco escuro é `PortasKey`, usado na tela de gravação (src/routes/index.tsx:564), não no header.

Resultado: as alterações de formato ficaram sutis e em branco, dentro do wordmark, então a percepção é de que "nada mudou".

## Correção proposta (apenas visual)

1. Adicionar a imagem enviada como asset do projeto (`src/assets/portas-chave.png`) ou converter o traçado dela para um SVG fiel (círculo vazado grosso + haste com corte diagonal na ponta direita), mantendo `currentColor`.
2. Substituir o desenho atual em `PortasKeyIcon` por esse traçado fiel.
3. No header, exibir a chave em **laranja `#ff774a`** (deixar de forçar branco no `PortasWordmark`), aumentando levemente o tamanho para ficar legível ao lado do wordmark.
4. Reaplicar o mesmo traçado no `favicon.svg` (chave laranja sobre `#25302c`) para manter consistência.

Nenhuma funcionalidade, fluxo ou texto muda.

## Detalhes técnicos

Arquivos afetados: `src/components/portas/PortasBrand.tsx`, `src/components/portas/SiteChrome.tsx` (se necessário para o tamanho), `public/favicon.svg`, e um novo asset em `src/assets/`. O favicon pode exigir recarregar a aba com cache limpo para atualizar.
