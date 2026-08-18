# Abrir o app já com o link do artigo na URL

## O que muda para você

Você pode chamar o app assim:

```text
https://prompter-do-sergio.lovable.app/?url=https://site.com/materia
```

Ao abrir com esse parâmetro:

1. O campo "Link do artigo" já vem preenchido.
2. A geração do roteiro começa sozinha, mostrando "Gerando roteiro...".
3. Quando termina, o texto cai no campo Roteiro, pronto para editar e gravar.

Se o link falhar (paywall, site bloqueado), aparece o mesmo aviso de erro de hoje, com o campo já preenchido para você tentar de novo.

Parâmetros opcionais extras, para quem quiser controlar o formato pela própria URL:

- `duracao=30|60|90` (padrão 60)
- `plataforma=reels|youtube` (padrão reels)

Exemplo: `/?url=https://site.com/materia&duracao=30&plataforma=youtube`

## Detalhes técnicos

Apenas `src/routes/index.tsx`:

- Adicionar `validateSearch` na rota `/` com Zod: `url` (string opcional, só http/https), `duracao` (enum "30"|"60"|"90"), `plataforma` (enum "reels"|"youtube").
- Ler com `Route.useSearch()` e usar esses valores como estado inicial de `url`, `duration` e `platform`.
- Um `useEffect` com guarda de execução única (ref) dispara `generateScript()` quando existe `url` válida na search e o roteiro ainda está vazio.
- A geração continua em `src/lib/script.functions.ts`, sem alterações; nada muda na câmera, gravação ou conversão MP4.
