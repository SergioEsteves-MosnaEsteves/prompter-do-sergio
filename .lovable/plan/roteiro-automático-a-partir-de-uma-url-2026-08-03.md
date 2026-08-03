# Roteiro automático a partir de uma URL

## O que muda para você

Na tela inicial, acima do campo "Roteiro", entra um campo opcional **Link do artigo**.

1. Você cola a URL de uma matéria e toca em **Gerar roteiro**.
2. O app lê o conteúdo da página e escreve um roteiro pronto para falar em vídeo, em português, com linguagem de manchete.
3. O texto cai direto no campo Roteiro — você pode editar tudo antes de gravar.

Ao lado do botão, dois ajustes rápidos:
- **Duração**: 30s, 60s ou 90s (define o tamanho do roteiro).
- **Plataforma**: Instagram Reels / YouTube Shorts (mais direto) ou YouTube (mais desenvolvido).

Enquanto gera, o botão mostra "Gerando roteiro..."; se a página não puder ser lida (paywall, site que bloqueia leitura), aparece um aviso claro pedindo para colar o texto manualmente.

## Estrutura do roteiro gerado

Segue boas práticas de vídeo curto:

- **Gancho (0-3s)**: uma frase de impacto, em tom de manchete, que faz parar o scroll.
- **Contexto (1 frase)**: do que se trata, sem enrolação.
- **Desenvolvimento**: 3 a 4 pontos-chave, frases curtas, voz ativa, uma ideia por linha.
- **Fechamento + CTA**: conclusão e chamada ("segue para mais", "comenta o que você acha").

Regras aplicadas na geração: frases faláveis (nada de jargão), sem marcações de cena ou colchetes, quebras de linha por respiração — o formato que o teleprompter rola melhor. Sem inventar dados: só o que está no artigo.

## Detalhes técnicos

- Ativar Lovable Cloud (necessário para a chave do gateway de IA).
- Nova server function `src/lib/script.functions.ts` → `generateScriptFromUrl({ url, duration, platform })`:
  - valida a URL com Zod (só http/https);
  - busca o HTML e extrai o texto principal (remoção de script/style/nav/footer, corte por tamanho);
  - chama o Lovable AI Gateway (`google/gemini-2.5-flash`) com um prompt de sistema com as regras de roteiro acima e devolve texto puro.
- `src/routes/index.tsx`: campo URL, selects de duração/plataforma, botão com `useServerFn` + `useMutation`, estados de carregando/erro, e preenchimento do `text`.
- Nenhuma mudança na câmera, gravação ou conversão MP4.

## Limitação conhecida

Sites com paywall, login ou renderização só por JavaScript podem não devolver texto legível. Nesses casos o app avisa e você segue colando o roteiro na mão.
