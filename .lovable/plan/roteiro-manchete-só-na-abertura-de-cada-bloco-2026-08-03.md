# Roteiro: manchete só na abertura de cada bloco

## O que muda

Hoje o gerador escreve todas as frases como manchetes, o que deixa o texto picotado. A nova regra:

- A **primeira frase de cada bloco** ([GANCHO], [SUSTENTAÇÃO], [DESENVOLVIMENTO], [VIRADA], [CTA]) continua sendo uma manchete forte: curta, com verbo forte, impacto no final.
- O **restante de cada bloco** vira texto corrido e falado: frases encadeadas, com respiração, explicando e desenvolvendo a mini-manchete que abriu o bloco.
- O gancho continua sendo a frase mais forte do vídeo.

## Regras ajustadas no gerador

- Manchete: só na frase de abertura de cada bloco (máx. ~15 palavras).
- Corpo: frases de 12 a 25 palavras, tom de conversa, ligação natural entre ideias (contraste, consequência, curiosidade) — sem virar lista de socos.
- Continuam proibidos: conectivos burocráticos ("além disso", "vale ressaltar"), jargão, voz passiva pesada, emojis/hashtags, dados inventados.
- Mantidos: rótulos de bloco, uma frase por linha para o teleprompter, linha em branco entre blocos, CTA final convidando a ler o artigo completo no site.
- Checklist final atualizada: verifica se cada bloco abre com manchete e se o corpo lê como conversa fluida.

## Detalhe técnico

Alteração restrita ao prompt de sistema em `src/lib/script.functions.ts` (regras 1, 2, 5 e checklist). Nenhuma mudança de UI, câmera, gravação ou conversão.
