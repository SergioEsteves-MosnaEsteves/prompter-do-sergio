# Aumentar o bloco do roteiro em 30%

## O que muda para você

A caixa de texto do roteiro na tela de configuração ficará 30% maior na altura mínima, permitindo visualizar mais linhas do roteiro sem precisar redimensionar manualmente.

## O que vai ser alterado

- Apenas o card **"Roteiro"** em `src/routes/index.tsx`.
- Aumentar a altura mínima do `<Textarea>` de `min-h-40` (160 px) para `min-h-52` (208 px), um acréscimo de 30%.
- Aumentar proporcionalmente a altura máxima (`max-h-96` → `max-h-[31.25rem]` / 500 px) para manter a mesma relação quando o usuário estica a caixa.
- Manter `resize-y`, o placeholder, o label e todas as outras classes do campo.

## O que não muda

- Funcionalidade de edição, placeholder e label do roteiro.
- Outros cards da página (Teleprompter, Vídeo, Fechamento, etc.).
- Layout, cores e tipografia da marca Portas.

## Detalhes técnicos

- Arquivo: `src/routes/index.tsx` (linha ~462–468).
- Alterar a classe `min-h-40` e `max-h-96` do `<Textarea id="roteiro" ... />`.
- Verificar visualmente no preview mobile e desktop para confirmar que o bloco ficou maior sem quebrar o scroll da página.