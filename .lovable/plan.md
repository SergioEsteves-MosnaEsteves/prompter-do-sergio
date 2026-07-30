## Causa mais provável

Você está testando dentro do **preview do Lovable**, que roda o app num iframe. O navegador só libera câmera/microfone para um iframe quando ele declara a permissão (`allow="camera; microphone"`). Sem isso, a chamada de câmera é recusada pelo próprio navegador — por isso o botão parece não fazer nada.

Dois agravantes no código atual (confirmados em `src/routes/index.tsx` e `useRecorder.ts`):

1. A mensagem de erro só aparece **no topo** da tela de configuração. Com o roteiro colado, o botão fica bem abaixo — o erro é exibido fora da área visível, dando a sensação de "nada acontece".
2. Não há estado de carregamento no botão nem tratamento específico para o caso "bloqueado por política de permissão do iframe" (o navegador devolve `NotAllowedError`, com a mesma mensagem de permissão negada, sem explicar que o problema é o preview).

## Teste rápido (sem mudar nada)

Abra o app fora do preview, no endereço direto:
`https://id-preview--8362e340-2233-4f0f-8bdb-c2bef8a6785d.lovable.app`
Se a câmera abrir lá, está confirmado: é restrição do iframe do preview, não do app.

## O que fazer no app

**1. Feedback imediato ao clicar**
- Botão "Iniciar gravação" entra em estado "Abrindo câmera..." enquanto aguarda a permissão, e volta ao normal em caso de falha.
- A mensagem de erro passa a aparecer logo acima/abaixo do botão (além do topo) e a tela rola até ela, para nunca ficar escondida.

**2. Mensagens de erro específicas**
- Detectar quando o app está rodando dentro de um iframe sem permissão e mostrar: "A câmera está bloqueada pela janela de prévia. Abra o app em uma aba separada para gravar." — com um link/botão que abre a aba nova.
- Diferenciar os casos: permissão negada, nenhuma câmera encontrada (`NotFoundError`), câmera em uso por outro programa (`NotReadableError`, comum no Windows com Teams/Zoom abertos) e navegador sem suporte.

**3. Câmera no desktop**
- No computador não existe câmera "traseira": pedir `facingMode: "environment"` pode falhar. Passar a tratar `facingMode` como preferência (`ideal`) e, se falhar, tentar de novo sem restrição de lente.
- Esconder o botão "Frontal/Traseira" quando só houver uma câmera disponível.

## Detalhes técnicos

- `src/components/teleprompter/useRecorder.ts`: mapear `e.name` (`NotAllowedError` + `document !== top` → mensagem de iframe; `NotFoundError`; `NotReadableError`; `OverconstrainedError` → retry sem `facingMode` exato). Trocar `facingMode: facing` por `{ ideal: facing }` e adicionar fallback de segunda tentativa com `video: true`.
- `src/routes/index.tsx`: estado `opening` para o botão, bloco de erro próximo ao botão com `scrollIntoView`, e ação "Abrir em nova aba" quando o erro for de iframe.

## Limitação

Se o preview continuar bloqueando a câmera, a gravação sempre precisará ser feita no endereço aberto em aba própria (ou no site publicado). O app não pode conceder a si mesmo permissão dentro do iframe.
