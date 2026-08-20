Corrigir ícone do Portas no header para refletir exatamente o arquivo enviado

## Objetivo
Restaurar a marca do Portas no header para usar o SVG enviado (`chave_e_barra-2.svg`) fielmente, sem alterações de cor, proporção ou orientação.

## Problema atual
O componente `src/components/portas/PortasBrand.tsx` foi modificado para incluir uma versão simplificada (`PortasKeyMark`) usada no header. Essa versão:
- Alterou a cor da chave (de `#f67149` do arquivo para `#ff774a` da variável CSS).
- Mudou a proporção do símbolo (de `448x257` do SVG para `90x40` do ícone simplificado).
- A chave e a barra foram redesenhadas manualmente, perdendo a forma original.

## Solução
1. Remover o componente `PortasKeyMark` simplificado e toda a lógica que o utiliza.
2. Fazer o componente `PortasKeyIcon` usar os paths literais do arquivo `chave_e_barra-2.svg` com:
   - `viewBox="0 0 448 257"`.
   - Cor da chave: `#f67149` (pode ser parametrizável, mas default igual ao arquivo).
   - Cor da barra: branco (`#ffffff`).
3. Usar `PortasKeyIcon` no `PortasWordmark` e no `PortasLockup` do header.
4. Ajustar o cálculo de largura/altura para preservar a proporção original `448/257`.
5. Se necessário, otimizar o `stroke-width` para melhor legibilidade em telas de alta densidade sem alterar a forma.
6. Verificar o `favicon.svg` e, se estiver baseado na versão simplificada, regenerá-lo a partir do SVG original.

## Validação
- Capturar screenshot do header para confirmar que a chave aparece na cor laranja original, na proporção correta e com a barra como no arquivo enviado.
- Rodar build para garantir que não há erros de compilação.
